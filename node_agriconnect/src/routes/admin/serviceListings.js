const express = require('express');
const router = express.Router();
const { ServiceListing, ServiceCategory, User } = require('../../models');

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const perPage = 10;
        const offset = (page - 1) * perPage;

        const { rows, count } = await ServiceListing.findAndCountAll({
            include: [
                { model: ServiceCategory, as: 'category', attributes: ['id', 'name'] },
                { model: User, as: 'technician', attributes: ['id', 'name', 'phone', 'email'] },
            ],
            order: [['created_at', 'DESC']],
            limit: perPage,
            offset,
        });

        return res.json({
            listings: rows,
            total: count,
            page,
            total_pages: Math.max(1, Math.ceil(count / perPage)),
        });
    } catch (err) {
        console.error('admin service_listings#index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

router.patch('/:id/active', async (req, res) => {
    try {
        const listing = await ServiceListing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ errors: ['Service listing not found'] });

        listing.is_active = Boolean(req.body.is_active);
        await listing.save();

        return res.json({ status: 'ok', listing });
    } catch (err) {
        console.error('admin service_listings#active error:', err);
        return res.status(422).json({ errors: [err.message] });
    }
});

module.exports = router;
