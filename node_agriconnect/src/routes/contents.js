const express = require('express');
const router = express.Router();
const { PrivacyPolicy } = require('../models');

// ─── GET /api/contents ───  (public, no auth)
router.get('/', async (req, res) => {
    try {
        const policy = await PrivacyPolicy.findOne({
            order: [['created_at', 'DESC']],
        });

        if (policy && policy.content) {
            return res.json(policy.content);
        }

        return res.json(null);
    } catch (err) {
        console.error('contents#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

module.exports = router;
