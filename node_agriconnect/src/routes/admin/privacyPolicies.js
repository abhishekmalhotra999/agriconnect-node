const express = require('express');
const router = express.Router();
const { PrivacyPolicy } = require('../../models');

const PER_PAGE = 10;

// ─── GET /admin/privacy_policies ───
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * PER_PAGE;

        const { count, rows } = await PrivacyPolicy.findAndCountAll({
            order: [['created_at', 'DESC']],
            limit: PER_PAGE,
            offset,
        });

        return res.json({
            privacy_policies: rows,
            total: count,
            page,
            per_page: PER_PAGE,
            total_pages: Math.ceil(count / PER_PAGE),
        });
    } catch (err) {
        console.error('admin privacy_policies index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── GET /admin/privacy_policies/:id ───
router.get('/:id', async (req, res) => {
    try {
        const policy = await PrivacyPolicy.findByPk(req.params.id);
        if (!policy) return res.status(404).json({ errors: ['Not found'] });
        return res.json(policy);
    } catch (err) {
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── POST /admin/privacy_policies ───
router.post('/', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(422).json({ errors: ['Content is required'] });

        const policy = await PrivacyPolicy.create({ content });
        return res.status(201).json(policy);
    } catch (err) {
        console.error('admin privacy_policy create error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── PUT /admin/privacy_policies/:id ───
router.put('/:id', async (req, res) => {
    try {
        const policy = await PrivacyPolicy.findByPk(req.params.id);
        if (!policy) return res.status(404).json({ errors: ['Not found'] });

        const { content } = req.body;
        if (content !== undefined) policy.content = content;
        await policy.save();

        return res.json(policy);
    } catch (err) {
        console.error('admin privacy_policy update error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── DELETE /admin/privacy_policies/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const policy = await PrivacyPolicy.findByPk(req.params.id);
        if (!policy) return res.status(404).json({ errors: ['Not found'] });
        await policy.destroy();
        return res.json({ message: 'Deleted successfully' });
    } catch (err) {
        return res.status(500).json({ errors: [err.message] });
    }
});

module.exports = router;
