const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { User, Role, UserPreference } = require('../../models');

const PER_PAGE = 20;
const MAX_NOTIFICATIONS_PER_USER = 200;

const VALID_AUDIENCES = new Set(['all', 'customers', 'farmers', 'technicians']);

function normalizeAudience(value) {
    const normalized = String(value || 'all').trim().toLowerCase();
    return VALID_AUDIENCES.has(normalized) ? normalized : null;
}

function parseNotifications(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue;
    }

    if (typeof rawValue === 'string') {
        try {
            const parsed = JSON.parse(rawValue);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    return [];
}

function getRoleWhereClause(audience) {
    if (audience === 'customers') {
        return { [Op.in]: ['user', 'customer'] };
    }

    if (audience === 'farmers') {
        return 'farmer';
    }

    if (audience === 'technicians') {
        return 'technician';
    }

    return { [Op.ne]: 'admin' };
}

// ─── GET /admin/notifications?page=1 ───
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * PER_PAGE;

        const preferences = await UserPreference.findAll({
            attributes: ['user_id', 'notifications'],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id'],
                    include: [{ model: Role, attributes: ['name'] }],
                },
            ],
        });

        const grouped = new Map();

        for (const preference of preferences) {
            const notifications = parseNotifications(preference.notifications);
            for (const item of notifications) {
                const isAdminAnnouncement =
                    String(item?.source || '').toLowerCase() === 'admin' ||
                    String(item?.type || '').toLowerCase() === 'announcement';

                if (!isAdminAnnouncement) {
                    continue;
                }

                const groupKey = String(item.broadcastId || item.id || `${preference.user_id}`);
                if (!grouped.has(groupKey)) {
                    grouped.set(groupKey, {
                        id: groupKey,
                        broadcastId: item.broadcastId || groupKey,
                        title: item.title || 'Announcement',
                        message: item.message || item.body || item.text || '',
                        link: item.link || null,
                        audience: item.audience || 'all',
                        createdAt: item.createdAt || item.timestamp || new Date(0).toISOString(),
                        senderId: item.senderId || null,
                        recipientCount: 0,
                        readCount: 0,
                    });
                }

                const current = grouped.get(groupKey);
                current.recipientCount += 1;
                if (item.read || item.isRead) {
                    current.readCount += 1;
                }
            }
        }

        const announcements = Array.from(grouped.values()).sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return res.json({
            announcements: announcements.slice(offset, offset + PER_PAGE),
            total: announcements.length,
            page,
            per_page: PER_PAGE,
            total_pages: Math.ceil(announcements.length / PER_PAGE),
        });
    } catch (err) {
        console.error('admin notifications#index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── POST /admin/notifications ───
router.post('/', async (req, res) => {
    try {
        const title = String(req.body.title || '').trim();
        const message = String(req.body.message || '').trim();
        const link = req.body.link ? String(req.body.link).trim() : null;
        const audience = normalizeAudience(req.body.audience);

        if (!title) {
            return res.status(422).json({ errors: ['title is required'] });
        }

        if (!message) {
            return res.status(422).json({ errors: ['message is required'] });
        }

        if (!audience) {
            return res.status(422).json({ errors: ['audience must be one of: all, customers, farmers, technicians'] });
        }

        const users = await User.findAll({
            attributes: ['id'],
            include: [
                {
                    model: Role,
                    attributes: ['name'],
                    where: { name: getRoleWhereClause(audience) },
                    required: true,
                },
            ],
        });

        if (!users.length) {
            return res.status(200).json({
                status: 'ok',
                recipientCount: 0,
                broadcastId: null,
                announcement: null,
            });
        }

        const nowIso = new Date().toISOString();
        const broadcastId = `broadcast_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

        await Promise.all(users.map(async (user) => {
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

            const current = parseNotifications(preferences.notifications);
            const next = [
                {
                    id: `${broadcastId}_${user.id}`,
                    broadcastId,
                    title,
                    message,
                    link,
                    source: 'admin',
                    type: 'announcement',
                    audience,
                    read: false,
                    isRead: false,
                    senderId: req.adminUser.id,
                    createdAt: nowIso,
                },
                ...current,
            ].slice(0, MAX_NOTIFICATIONS_PER_USER);

            await preferences.update({ notifications: next });
        }));

        return res.status(201).json({
            status: 'ok',
            broadcastId,
            recipientCount: users.length,
            announcement: {
                title,
                message,
                link,
                audience,
                createdAt: nowIso,
            },
        });
    } catch (err) {
        console.error('admin notifications#create error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

module.exports = router;
