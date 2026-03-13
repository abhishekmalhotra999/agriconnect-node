const express = require('express');
const router = express.Router();
const { ServiceRequest, ServiceListing, User } = require('../models');
const { requireRoles } = require('../middleware/roleAuth');
const { sendServiceRequestEmail } = require('../services/serviceRequestMailer');

router.post('/', requireRoles(['customer', 'farmer']), async (req, res) => {
    try {
        const { service_listing_id, requester_name, requester_phone, requester_email, message } = req.body;

        if (!service_listing_id || !requester_name || !requester_phone || !message) {
            return res.status(422).json({ errors: 'service_listing_id, requester_name, requester_phone, and message are required' });
        }

        const listing = await ServiceListing.findByPk(service_listing_id, {
            include: [{ model: User, as: 'technician', attributes: ['email', 'name'] }],
        });

        if (!listing || !listing.is_active) {
            return res.status(404).json({ errors: 'Active service listing not found' });
        }

        const requestRecord = await ServiceRequest.create({
            service_listing_id,
            customer_user_id: req.appUser.id,
            requester_name,
            requester_phone,
            requester_email: requester_email || req.appUser.email || null,
            message,
            status: 'new',
            email_delivery_status: 'pending',
        });

        try {
            await sendServiceRequestEmail({
                to: listing.contact_email || listing.technician?.email,
                listingTitle: listing.title,
                requesterName: requester_name,
                requesterPhone: requester_phone,
                requesterEmail: requester_email || req.appUser.email,
                message,
            });

            await requestRecord.update({
                email_delivery_status: 'sent',
                email_delivery_error: null,
                last_emailed_at: new Date(),
            });
        } catch (mailErr) {
            await requestRecord.update({
                email_delivery_status: 'failed',
                email_delivery_error: mailErr.message,
            });
        }

        return res.status(201).json(requestRecord);
    } catch (err) {
        console.error('service_requests#create error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.get('/mine', requireRoles(['customer', 'farmer']), async (req, res) => {
    try {
        const rows = await ServiceRequest.findAll({
            where: { customer_user_id: req.appUser.id },
            include: [{ model: ServiceListing, as: 'listing' }],
            order: [['created_at', 'DESC']],
        });
        return res.json(rows);
    } catch (err) {
        console.error('service_requests#mine error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/for-technician', requireRoles(['technician']), async (req, res) => {
    try {
        const myListings = await ServiceListing.findAll({ where: { technician_user_id: req.appUser.id }, attributes: ['id'] });
        const listingIds = myListings.map((listing) => listing.id);
        if (listingIds.length === 0) return res.json([]);

        const rows = await ServiceRequest.findAll({
            where: { service_listing_id: listingIds },
            include: [{ model: ServiceListing, as: 'listing' }],
            order: [['created_at', 'DESC']],
        });

        return res.json(rows);
    } catch (err) {
        console.error('service_requests#for-technician error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

const STATUS_TRANSITIONS = {
    new: ['accepted', 'rejected', 'in_progress', 'closed'],
    accepted: ['in_progress', 'completed', 'resolved', 'closed', 'rejected'],
    in_progress: ['completed', 'resolved', 'closed'],
    completed: ['resolved', 'closed'],
    resolved: ['closed'],
    closed: [],
    rejected: [],
    cancelled: [],
};

router.patch('/:id/status', requireRoles(['technician']), async (req, res) => {
    try {
        const requestRecord = await ServiceRequest.findByPk(req.params.id, {
            include: [{ model: ServiceListing, as: 'listing', attributes: ['id', 'technician_user_id'] }],
        });

        if (!requestRecord) {
            return res.status(404).json({ errors: 'Service request not found' });
        }

        const ownerId = String(requestRecord.listing?.technician_user_id || '');
        if (!ownerId || ownerId !== String(req.appUser.id)) {
            return res.status(403).json({ errors: 'Forbidden: Not your service request' });
        }

        const nextStatus = String(req.body.status || '').trim().toLowerCase();
        const currentStatus = String(requestRecord.status || 'new').trim().toLowerCase();

        if (!Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, nextStatus)) {
            return res.status(422).json({ errors: 'Invalid status' });
        }

        const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
        if (!allowedNext.includes(nextStatus) && nextStatus !== currentStatus) {
            return res.status(422).json({
                errors: `Invalid transition from ${currentStatus} to ${nextStatus}`,
            });
        }

        requestRecord.status = nextStatus;
        await requestRecord.save();

        return res.json({ status: 'ok', request: requestRecord });
    } catch (err) {
        console.error('service_requests#technician_status_update error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.patch('/:id/cancel', requireRoles(['customer', 'farmer']), async (req, res) => {
    try {
        const requestRecord = await ServiceRequest.findByPk(req.params.id);
        if (!requestRecord) {
            return res.status(404).json({ errors: 'Service request not found' });
        }

        if (String(requestRecord.customer_user_id || '') !== String(req.appUser.id)) {
            return res.status(403).json({ errors: 'Forbidden: Not your service request' });
        }

        const currentStatus = String(requestRecord.status || 'new').trim().toLowerCase();
        const cancellableStatuses = ['new', 'pending', 'accepted'];
        if (!cancellableStatuses.includes(currentStatus)) {
            return res.status(422).json({ errors: `Request cannot be cancelled from status ${currentStatus}` });
        }

        requestRecord.status = 'cancelled';
        await requestRecord.save();

        return res.json({ status: 'ok', request: requestRecord });
    } catch (err) {
        console.error('service_requests#customer_cancel error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

module.exports = router;
