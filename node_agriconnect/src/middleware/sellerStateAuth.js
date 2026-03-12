const { UserPreference } = require('../models');

function onboardingCompletedFlag(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Boolean(value.completed);
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Boolean(parsed && parsed.completed);
        } catch (err) {
            return false;
        }
    }

    return false;
}

async function requireFarmerOnboardingComplete(req, res, next) {
    try {
        const [preferences] = await UserPreference.findOrCreate({
            where: { user_id: req.appUser.id },
            defaults: {
                user_id: req.appUser.id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: false },
            },
        });

        const completed = onboardingCompletedFlag(preferences?.farmer_onboarding);
        if (!completed) {
            return res.status(403).json({
                errors: 'Complete farmer onboarding before managing marketplace products',
            });
        }

        return next();
    } catch (err) {
        console.error('seller_state_auth#requireFarmerOnboardingComplete error:', err);
        return res.status(500).json({ errors: 'Failed to validate seller onboarding state' });
    }
}

module.exports = { requireFarmerOnboardingComplete };
