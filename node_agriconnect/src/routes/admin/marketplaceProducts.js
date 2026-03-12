const express = require('express');
const router = express.Router();
const { MarketplaceProduct, MarketplaceCategory, User } = require('../../models');

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const perPage = 10;
        const offset = (page - 1) * perPage;

        const { rows, count } = await MarketplaceProduct.findAndCountAll({
            include: [
                { model: MarketplaceCategory, as: 'category', attributes: ['id', 'name'] },
                { model: User, as: 'farmer', attributes: ['id', 'name', 'phone', 'email'] },
            ],
            order: [['created_at', 'DESC']],
            limit: perPage,
            offset,
        });

        return res.json({
            products: rows,
            total: count,
            page,
            total_pages: Math.max(1, Math.ceil(count / perPage)),
        });
    } catch (err) {
        console.error('admin marketplace_products#index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id);
        if (!product) return res.status(404).json({ errors: ['Product not found'] });

        const nextStatus = String(req.body.status || '').trim().toLowerCase();
        const allowed = new Set(['draft', 'published', 'archived']);
        if (!allowed.has(nextStatus)) {
            return res.status(422).json({ errors: ['Invalid status'] });
        }

        product.status = nextStatus;
        await product.save();
        return res.json({ status: 'ok', product });
    } catch (err) {
        console.error('admin marketplace_products#status error:', err);
        return res.status(422).json({ errors: [err.message] });
    }
});

module.exports = router;
