const express = require('express');
const router = express.Router();
const { MarketplaceCategory } = require('../models');
const { requireRoles } = require('../middleware/roleAuth');

router.get('/', async (req, res) => {
    try {
        const categories = await MarketplaceCategory.findAll({ order: [['name', 'ASC']] });
        return res.json(categories);
    } catch (err) {
        console.error('marketplace_categories#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.post('/', requireRoles(['admin']), async (req, res) => {
    try {
        const { name, description, is_active } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(422).json({ errors: 'name is required' });
        }

        const category = await MarketplaceCategory.create({
            name: String(name).trim(),
            description: description || null,
            is_active: is_active !== undefined ? Boolean(is_active) : true,
        });

        return res.status(201).json(category);
    } catch (err) {
        console.error('marketplace_categories#create error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

module.exports = router;
