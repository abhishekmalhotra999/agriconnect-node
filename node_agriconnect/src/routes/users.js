const express = require('express');
const router = express.Router();
const { User, Profile, Role, UserPreference } = require('../models');
const { encode } = require('../utils/jwt');
const upload = require('../middleware/upload');

function normalizeFarmerOnboarding(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch (err) {
            // Ignore malformed JSON and fall through to default.
        }
    }

    return { completed: false };
}

function parseNotifications(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    return [];
}

// ─── Helpers ───
const encodeToken = (user) => {
    if (user.phone) {
        return encode({ phone: user.phone });
    }
    return encode({ email: user.email });
};

const buildUserProfile = (profile) => {
    if (!profile) return null;
    return {
        id: profile.id,
        userId: profile.user_id,
        address: profile.address,
        yearsOfExperience: profile.years_of_experience,
        professionType: profile.profession_type,
        farmSize: profile.farm_size,
        farmingType: profile.farming_type,
        technicianType: profile.technician_type,
        userImage: profile.avatar ? `/uploads/${profile.avatar}` : null,
    };
};

// ─── GET /api/users/preferences ───
router.get('/preferences', async (req, res) => {
    try {
        const [preferences] = await UserPreference.findOrCreate({
            where: { user_id: req.appUser.id },
            defaults: {
                user_id: req.appUser.id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: false },
                seller_status: 'approved',
            },
        });

        const farmerOnboarding = normalizeFarmerOnboarding(preferences.farmer_onboarding);

        return res.json({
            savedItems: preferences.saved_items || [],
            recentItems: preferences.recent_items || [],
            notifications: preferences.notifications || [],
            farmerOnboarding,
            sellerStatus: preferences.seller_status || 'approved',
            sellerStatusReason: preferences.seller_status_reason || null,
        });
    } catch (err) {
        console.error('users#preferences_show error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

// ─── PUT /api/users/preferences ───
router.put('/preferences', async (req, res) => {
    try {
        const [preferences] = await UserPreference.findOrCreate({
            where: { user_id: req.appUser.id },
            defaults: {
                user_id: req.appUser.id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: false },
                seller_status: 'approved',
            },
        });

        const nextFarmerOnboarding = req.body.farmerOnboarding && typeof req.body.farmerOnboarding === 'object'
            ? req.body.farmerOnboarding
            : normalizeFarmerOnboarding(preferences.farmer_onboarding);

        await preferences.update({
            saved_items: Array.isArray(req.body.savedItems) ? req.body.savedItems : preferences.saved_items,
            recent_items: Array.isArray(req.body.recentItems) ? req.body.recentItems : preferences.recent_items,
            notifications: Array.isArray(req.body.notifications) ? req.body.notifications : preferences.notifications,
            farmer_onboarding: nextFarmerOnboarding,
        });

        const farmerOnboarding = normalizeFarmerOnboarding(preferences.farmer_onboarding);

        return res.json({
            status: 'ok',
            savedItems: preferences.saved_items || [],
            recentItems: preferences.recent_items || [],
            notifications: preferences.notifications || [],
            farmerOnboarding,
            sellerStatus: preferences.seller_status || 'approved',
            sellerStatusReason: preferences.seller_status_reason || null,
        });
    } catch (err) {
        console.error('users#preferences_update error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

// ─── PATCH /api/users/preferences/notifications/:notificationId ───
router.patch('/preferences/notifications/:notificationId', async (req, res) => {
    try {
        const notificationId = String(req.params.notificationId || '').trim();
        if (!notificationId) {
            return res.status(422).json({ errors: ['notificationId is required'] });
        }

        if (typeof req.body.read !== 'boolean') {
            return res.status(422).json({ errors: ['read must be true or false'] });
        }

        const [preferences] = await UserPreference.findOrCreate({
            where: { user_id: req.appUser.id },
            defaults: {
                user_id: req.appUser.id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: false },
                seller_status: 'approved',
            },
        });

        const currentNotifications = parseNotifications(preferences.notifications);
        let found = false;

        const nextNotifications = currentNotifications.map((item) => {
            const id = String(item?.id || '');
            if (id !== notificationId) {
                return item;
            }

            found = true;
            return {
                ...item,
                read: req.body.read,
                isRead: req.body.read,
            };
        });

        if (!found) {
            return res.status(404).json({ errors: ['Notification not found'] });
        }

        await preferences.update({ notifications: nextNotifications });
        const updated = nextNotifications.find((item) => String(item?.id || '') === notificationId);

        return res.json({
            status: 'ok',
            notification: updated,
            notifications: nextNotifications,
        });
    } catch (err) {
        console.error('users#preferences_notification_update error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

// ─── PUT /api/users/:id ───
router.put('/:id', upload.single('file'), async (req, res) => {
    try {
        if (String(req.appUser.id) !== String(req.params.id)) {
            return res.status(403).json({ errors: ['Forbidden: You can only update your own account'] });
        }

        const user = await User.findByPk(req.params.id, {
            include: [{ model: Profile }, { model: Role }],
        });

        if (!user) {
            return res.status(404).json({ errors: 'User not found' });
        }

        if (!user.Profile) {
            await Profile.create({ user_id: user.id });
            await user.reload({ include: [{ model: Profile }, { model: Role }] });
        }

        // Handle avatar upload
        if (req.file && user.Profile) {
            user.Profile.avatar = req.file.filename;
            await user.Profile.save();
        }

        // Update user fields
        await user.update({
            email: req.body.email || user.email,
            name: req.body.name || user.name,
        });

        // Update profile fields
        if (user.Profile) {
            await user.Profile.update({
                address: req.body.address,
                years_of_experience: req.body.yearsOfExperience,
                profession_type: req.body.professionType,
                farm_size: req.body.farmSize,
                farming_type: req.body.farmingType,
                technician_type: req.body.technicianType,
            });
        }

        // Reload
        await user.reload({
            include: [{ model: Profile }, { model: Role }],
        });

        return res.json({
            user: {
                id: user.id,
                email: user.email || '',
                phone: user.phone || '',
                name: user.name || '',
                accountType: user.roleName(),
                profile: buildUserProfile(user.Profile),
                jwtToken: encodeToken(user),
                signInCount: user.sign_in_count,
            },
        });
    } catch (err) {
        console.error('users#update error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

module.exports = router;
