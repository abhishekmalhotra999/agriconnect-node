const express = require('express');
const router = express.Router();
const { MarketplaceCategory } = require('../../models');

const PER_PAGE = 15;

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const offset = (page - 1) * PER_PAGE;

        const { rows, count } = await MarketplaceCategory.findAndCountAll({
            order: [['name', 'ASC']],
            limit: PER_PAGE,
            offset,
        });

        return res.json({
            categories: rows,
            total: count,
            page,
            per_page: PER_PAGE,
            total_pages: Math.max(1, Math.ceil(count / PER_PAGE)),
        });
    } catch (err) {
        console.error('admin marketplace_categories#index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, description, is_active } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(422).json({ errors: ['name is required'] });
        }

        const category = await MarketplaceCategory.create({
            name: String(name).trim(),
            description: description || null,
            is_active: is_active !== undefined ? Boolean(is_active) : true,
        });

        return res.status(201).json(category);
    } catch (err) {
        console.error('admin marketplace_categories#create error:', err);
        return res.status(422).json({ errors: [err.message] });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const category = await MarketplaceCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ errors: ['Category not found'] });

        await category.update({
            name: req.body.name ?? category.name,
            description: req.body.description ?? category.description,
            is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : category.is_active,
        });

        return res.json(category);
    } catch (err) {
        console.error('admin marketplace_categories#update error:', err);
        return res.status(422).json({ errors: [err.message] });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const category = await MarketplaceCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ errors: ['Category not found'] });

        await category.destroy();
        return res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('admin marketplace_categories#destroy error:', err);
        return res.status(422).json({ errors: [err.message] });
    }
});

module.exports = router;
