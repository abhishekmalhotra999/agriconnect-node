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

module.exports = router;
