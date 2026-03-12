const express = require('express');
const router = express.Router();
const { ServiceRequest, ServiceListing, User } = require('../../models');

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const perPage = 10;
        const offset = (page - 1) * perPage;

        const { rows, count } = await ServiceRequest.findAndCountAll({
            include: [
                {
                    model: ServiceListing,
                    as: 'listing',
                    include: [{ model: User, as: 'technician', attributes: ['id', 'name', 'email', 'phone'] }],
                },
                { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
            ],
            order: [['created_at', 'DESC']],
            limit: perPage,
            offset,
        });

        return res.json({
            requests: rows,
            total: count,
            page,
            total_pages: Math.max(1, Math.ceil(count / perPage)),
        });
    } catch (err) {
        console.error('admin service_requests#index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const request = await ServiceRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ errors: ['Service request not found'] });

        const nextStatus = String(req.body.status || '').trim().toLowerCase();
        const allowed = new Set(['new', 'in_progress', 'resolved', 'closed']);
        if (!allowed.has(nextStatus)) {
            return res.status(422).json({ errors: ['Invalid status'] });
        }

        request.status = nextStatus;
        await request.save();

        return res.json({ status: 'ok', request });
    } catch (err) {
        console.error('admin service_requests#status error:', err);
        return res.status(422).json({ errors: [err.message] });
    }
});

module.exports = router;
