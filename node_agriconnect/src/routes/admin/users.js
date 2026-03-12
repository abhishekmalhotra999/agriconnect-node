const express = require('express');
const router = express.Router();
const { Op, fn, col, where: seqWhere } = require('sequelize');
const { User, Profile, Role, UserPreference } = require('../../models');

const PER_PAGE = 15;

// ─── GET /admin/users?page=1 ───
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * PER_PAGE;
        const requestedRole = String(req.query.user_type || '').trim().toLowerCase();
        const sellerStatus = String(req.query.seller_status || '').trim().toLowerCase();
        const search = String(req.query.search || '').trim();

        // Find admin role id to exclude those users
        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const excludeRoleId = adminRole ? adminRole.id : -1;

        const where = {
            role_id: { [Op.ne]: excludeRoleId },
        };

        if (search) {
            const keyword = search.toLowerCase();
            where[Op.or] = [
                seqWhere(fn('LOWER', col('User.name')), { [Op.like]: `%${keyword}%` }),
                seqWhere(fn('LOWER', col('User.email')), { [Op.like]: `%${keyword}%` }),
                seqWhere(fn('LOWER', col('User.phone')), { [Op.like]: `%${keyword}%` }),
            ];
        }

        const roleInclude = { model: Role };
        if (requestedRole) {
            roleInclude.where = { name: requestedRole };
        }

        const prefInclude = { model: UserPreference, as: 'preferences', required: false };
        if (sellerStatus) {
            prefInclude.where = { seller_status: sellerStatus };
            prefInclude.required = true;
        }

        const { count, rows } = await User.findAndCountAll({
            include: [
                { model: Profile },
                roleInclude,
                prefInclude,
            ],
            where,
            order: [['created_at', 'DESC']],
            limit: PER_PAGE,
            offset,
            distinct: true,
        });

        const users = rows.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            user_type: u.Role ? u.Role.name : '',
            profession_type: u.Profile ? u.Profile.profession_type : '',
            farm_size: u.Profile ? u.Profile.farm_size : '',
            address: u.Profile ? u.Profile.address : '',
            years_of_experience: u.Profile ? u.Profile.years_of_experience : '',
            created_at: u.created_at,
            seller_status: u.preferences?.seller_status || 'approved',
            seller_status_reason: u.preferences?.seller_status_reason || null,
        }));

        return res.json({
            users,
            total: count,
            page,
            per_page: PER_PAGE,
            total_pages: Math.ceil(count / PER_PAGE),
        });
    } catch (err) {
        console.error('admin users index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

router.patch('/:id/seller-status', async (req, res) => {
    try {
        const allowed = new Set(['pending', 'approved', 'rejected']);
        const sellerStatus = String(req.body.sellerStatus || '').trim().toLowerCase();
        const sellerStatusReason = req.body.sellerStatusReason === undefined
            ? null
            : String(req.body.sellerStatusReason || '').trim();
        if (!allowed.has(sellerStatus)) {
            return res.status(422).json({ errors: ['sellerStatus must be pending, approved, or rejected'] });
        }
        if (sellerStatus === 'rejected' && !sellerStatusReason) {
            return res.status(422).json({ errors: ['sellerStatusReason is required when status is rejected'] });
        }

        const user = await User.findByPk(req.params.id, { include: [{ model: Role }] });
        if (!user) return res.status(404).json({ errors: ['User not found'] });
        if ((user.Role?.name || '').toLowerCase() !== 'farmer') {
            return res.status(422).json({ errors: ['Seller status can only be managed for farmer users'] });
        }

        const [preferences] = await UserPreference.findOrCreate({
            where: { user_id: user.id },
            defaults: {
                user_id: user.id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: false },
                seller_status: 'approved',
                seller_status_reason: null,
            },
        });

        await preferences.update({
            seller_status: sellerStatus,
            seller_status_reason: sellerStatus === 'approved' ? null : (sellerStatusReason || preferences.seller_status_reason || null),
        });
        return res.json({
            status: 'ok',
            userId: user.id,
            sellerStatus: preferences.seller_status,
            sellerStatusReason: preferences.seller_status_reason,
        });
    } catch (err) {
        console.error('admin users seller-status error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

module.exports = router;
