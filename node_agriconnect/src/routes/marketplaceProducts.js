const express = require('express');
const router = express.Router();
const { Op, fn, col, where: seqWhere } = require('sequelize');
const { MarketplaceProduct, MarketplaceCategory, User, MarketplaceReview, UserPreference } = require('../models');
const { requireRoles, normalizeRole } = require('../middleware/roleAuth');
const { requireFarmerOnboardingComplete } = require('../middleware/sellerStateAuth');
const upload = require('../middleware/upload');

const listingUpload = upload.fields([
    { name: 'main_picture_file', maxCount: 1 },
    { name: 'gallery_files', maxCount: 8 },
]);

async function attachMarketplaceReviewStats(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const productIds = rows
        .map((row) => Number(row.id || 0))
        .filter((id) => Number.isFinite(id) && id > 0);

    if (productIds.length === 0) {
        return rows.map((row) => ({
            ...row.toJSON(),
            avgRating: 0,
            reviewCount: 0,
        }));
    }

    const statsRows = await MarketplaceReview.findAll({
        where: { marketplace_product_id: { [Op.in]: productIds } },
        attributes: [
            'marketplace_product_id',
            [fn('COUNT', col('id')), 'reviewCount'],
            [fn('AVG', col('rating')), 'avgRating'],
        ],
        group: ['marketplace_product_id'],
        raw: true,
    });

    const statMap = statsRows.reduce((acc, row) => {
        acc[String(row.marketplace_product_id)] = {
            reviewCount: Number(row.reviewCount || 0),
            avgRating: Number(Number(row.avgRating || 0).toFixed(1)),
        };
        return acc;
    }, {});

    return rows.map((row) => {
        const key = String(row.id);
        const stats = statMap[key] || { avgRating: 0, reviewCount: 0 };
        return {
            ...row.toJSON(),
            avgRating: stats.avgRating,
            reviewCount: stats.reviewCount,
        };
    });
}

function parseGalleryUrls(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input.map((item) => String(item || '').trim()).filter(Boolean);
    }

    if (typeof input === 'string') {
        const value = input.trim();
        if (!value) return [];

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item || '').trim()).filter(Boolean);
            }
        } catch (err) {
            // Fall back to line/comma separated values.
        }

        return value
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
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

async function ensurePublishAllowed(userId, status) {
    if (String(status || '').toLowerCase() !== 'published') return null;

    const [preferences] = await UserPreference.findOrCreate({
        where: { user_id: userId },
        defaults: {
            user_id: userId,
            saved_items: [],
            recent_items: [],
            notifications: [],
            farmer_onboarding: { completed: false },
            seller_status: 'approved',
        },
    });

    const sellerStatus = String(preferences.seller_status || 'approved').toLowerCase();
    if (sellerStatus !== 'approved') {
        const reason = String(preferences.seller_status_reason || '').trim();
        return reason
            ? `Seller status is ${sellerStatus}. ${reason}`
            : `Seller status is ${sellerStatus}. Only approved sellers can publish products.`;
    }

    return null;
}

router.get('/', async (req, res) => {
    try {
        const where = {};
        const role = normalizeRole(req.appUser?.Role?.name);

        if (req.query.category_id) where.category_id = req.query.category_id;
        if (req.query.search) {
            const keyword = String(req.query.search).toLowerCase();
            where[Op.or] = [
                seqWhere(fn('LOWER', col('MarketplaceProduct.title')), { [Op.like]: `%${keyword}%` }),
                seqWhere(fn('LOWER', col('MarketplaceProduct.description')), { [Op.like]: `%${keyword}%` }),
            ];
        }

        if (role !== 'admin') {
            where.status = 'published';
        }

        const rows = await MarketplaceProduct.findAll({
            where,
            include: [
                { model: MarketplaceCategory, as: 'category' },
                { model: User, as: 'farmer', attributes: ['id', 'name', 'phone'] },
            ],
            order: [['created_at', 'DESC']],
        });

        const payload = await attachMarketplaceReviewStats(rows);
        return res.json(payload);
    } catch (err) {
        console.error('marketplace_products#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/mine', requireRoles(['farmer']), async (req, res) => {
    try {
        const rows = await MarketplaceProduct.findAll({
            where: { farmer_user_id: req.appUser.id },
            include: [{ model: MarketplaceCategory, as: 'category' }],
            order: [['created_at', 'DESC']],
        });

        const payload = await attachMarketplaceReviewStats(rows);
        return res.json(payload);
    } catch (err) {
        console.error('marketplace_products#mine error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/incoming-orders', requireRoles(['farmer']), async (req, res) => {
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

        const notifications = parseNotifications(preferences.notifications);
        const incomingOrders = notifications
            .filter((item) => String(item?.type || '') === 'marketplace_order_request')
            .map((item) => {
                const request = item?.orderRequest || {};
                const rawStatus = String(request.rawStatus || request.status || 'new').toLowerCase();
                const statusLabelMap = {
                    new: 'New',
                    accepted: 'Accepted',
                    rejected: 'Rejected',
                    closed: 'Closed',
                };

                return {
                    id: String(request.id || item.id || ''),
                    name: request.productTitle || item.title || 'Marketplace Order Request',
                    amount: `R${Number(request.totalPrice || 0) || 0}`,
                    quantity: Number(request.quantity || 1),
                    image_url: request.productImageUrl || null,
                    status: statusLabelMap[rawStatus] || 'New',
                    raw_status: rawStatus,
                    created_at: request.createdAt || item.createdAt || new Date().toISOString(),
                    requester_name: request.requesterName || 'Customer',
                    requester_phone: request.requesterPhone || '',
                    requester_email: request.requesterEmail || '',
                    message: request.message || '',
                    product_id: request.productId || null,
                    unit_price: Number(request.unitPrice || 0) || 0,
                    total_price: Number(request.totalPrice || 0) || 0,
                };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return res.json(incomingOrders);
    } catch (err) {
        console.error('marketplace_products#incoming_orders error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.post('/:id/order-requests', requireRoles(['customer', 'farmer', 'technician']), async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id, {
            include: [{ model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] }],
        });

        if (!product || String(product.status || '').toLowerCase() !== 'published') {
            return res.status(404).json({ errors: 'Published product not found' });
        }

        if (String(product.farmer_user_id) === String(req.appUser.id)) {
            return res.status(422).json({ errors: 'You cannot create an order request for your own listing' });
        }

        const quantity = Number(req.body.quantity || 1);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(422).json({ errors: 'quantity must be greater than 0' });
        }

        const now = new Date().toISOString();
        const requestId = `morder-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const requesterName = String(req.body.requester_name || req.appUser.name || 'Customer').trim();
        const requesterPhone = String(req.body.requester_phone || req.appUser.phone || '').trim();
        const requesterEmail = String(req.body.requester_email || req.appUser.email || '').trim();
        const message = String(req.body.message || '').trim();
        const unitPrice = Number(product.unit_price || 0) || 0;
        const totalPrice = Number((unitPrice * quantity).toFixed(2));

        const orderRequestPayload = {
            id: requestId,
            productId: product.id,
            productTitle: product.title,
            productImageUrl: product.main_picture_url || product.thumbnail_url || null,
            quantity,
            unitPrice,
            totalPrice,
            requesterName,
            requesterPhone,
            requesterEmail,
            message,
            status: 'new',
            rawStatus: 'new',
            createdAt: now,
        };

        const [sellerPreferences] = await UserPreference.findOrCreate({
            where: { user_id: product.farmer_user_id },
            defaults: {
                user_id: product.farmer_user_id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: false },
                seller_status: 'approved',
            },
        });

        const currentNotifications = parseNotifications(sellerPreferences.notifications);
        const nextNotifications = [
            {
                id: requestId,
                type: 'marketplace_order_request',
                title: `New order request for ${product.title}`,
                message: `${requesterName} requested ${quantity} item(s).`,
                read: false,
                isRead: false,
                createdAt: now,
                orderRequest: orderRequestPayload,
            },
            ...currentNotifications,
        ].slice(0, 500);

        await sellerPreferences.update({ notifications: nextNotifications });

        return res.status(201).json({
            status: 'ok',
            request: orderRequestPayload,
        });
    } catch (err) {
        console.error('marketplace_products#create_order_request error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id, {
            include: [
                { model: MarketplaceCategory, as: 'category' },
                { model: User, as: 'farmer', attributes: ['id', 'name', 'phone'] },
            ],
        });

        if (!product) {
            return res.status(404).json({ errors: 'Product not found' });
        }

        const role = normalizeRole(req.appUser?.Role?.name);
        const isOwner = String(product.farmer_user_id) === String(req.appUser?.id);
        if (product.status !== 'published' && role !== 'admin' && !isOwner) {
            return res.status(404).json({ errors: 'Product not found' });
        }

        const reviews = await MarketplaceReview.findAll({
            where: { marketplace_product_id: product.id },
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']],
        });

        const reviewCount = reviews.length;
        const avgRating = reviewCount > 0
            ? Number((reviews.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviewCount).toFixed(1))
            : 0;

        return res.json({ ...product.toJSON(), avgRating, reviewCount });
    } catch (err) {
        console.error('marketplace_products#show error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/:id/reviews', async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id);
        if (!product) return res.status(404).json({ errors: 'Product not found' });

        const reviews = await MarketplaceReview.findAll({
            where: { marketplace_product_id: product.id },
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']],
        });

        return res.json(reviews);
    } catch (err) {
        console.error('marketplace_products#reviews_index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.post('/:id/reviews', async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id);
        if (!product) return res.status(404).json({ errors: 'Product not found' });

        const rating = Number(req.body.rating || 0);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return res.status(422).json({ errors: 'rating must be between 1 and 5' });
        }

        const nextComment = typeof req.body.comment === 'string'
            ? req.body.comment.trim().slice(0, 2000)
            : null;

        const [review, created] = await MarketplaceReview.findOrCreate({
            where: {
                marketplace_product_id: product.id,
                user_id: req.appUser.id,
            },
            defaults: {
                marketplace_product_id: product.id,
                user_id: req.appUser.id,
                rating,
                comment: nextComment || null,
            },
        });

        if (!created) {
            await review.update({
                rating,
                comment: nextComment || null,
            });
        }

        return res.status(created ? 201 : 200).json({
            ...review.toJSON(),
            created,
            message: created
                ? 'Review created successfully'
                : 'Your existing review was updated',
        });
    } catch (err) {
        console.error('marketplace_products#reviews_create error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.post('/', requireRoles(['farmer']), requireFarmerOnboardingComplete, listingUpload, async (req, res) => {
    try {
        const { title, description, thumbnail_url, main_picture_url, gallery_urls, category_id, unit_price, stock_quantity, status } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(422).json({ errors: 'title is required' });
        }

        const publishError = await ensurePublishAllowed(req.appUser.id, status || 'draft');
        if (publishError) {
            return res.status(403).json({ errors: publishError });
        }

        const uploadedMain = req.files?.main_picture_file?.[0]?.filename
            ? `/uploads/${req.files.main_picture_file[0].filename}`
            : null;
        const uploadedGallery = Array.isArray(req.files?.gallery_files)
            ? req.files.gallery_files.map((file) => `/uploads/${file.filename}`)
            : [];
        const parsedGallery = parseGalleryUrls(gallery_urls);
        const finalMain = uploadedMain || (main_picture_url || thumbnail_url || null);

        const product = await MarketplaceProduct.create({
            farmer_user_id: req.appUser.id,
            title: String(title).trim(),
            description: description || null,
            thumbnail_url: finalMain,
            main_picture_url: finalMain,
            gallery_urls: [...parsedGallery, ...uploadedGallery],
            category_id: category_id || null,
            unit_price: unit_price || 0,
            stock_quantity: stock_quantity || 0,
            status: status || 'draft',
        });

        return res.status(201).json(product);
    } catch (err) {
        console.error('marketplace_products#create error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.put('/:id', requireRoles(['farmer']), requireFarmerOnboardingComplete, listingUpload, async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id);
        if (!product) return res.status(404).json({ errors: 'Product not found' });
        if (String(product.farmer_user_id) !== String(req.appUser.id)) {
            return res.status(403).json({ errors: 'Forbidden: Not your product' });
        }

        const uploadedMain = req.files?.main_picture_file?.[0]?.filename
            ? `/uploads/${req.files.main_picture_file[0].filename}`
            : null;
        const uploadedGallery = Array.isArray(req.files?.gallery_files)
            ? req.files.gallery_files.map((file) => `/uploads/${file.filename}`)
            : [];

        const parsedGallery = req.body.gallery_urls !== undefined
            ? parseGalleryUrls(req.body.gallery_urls)
            : product.gallery_urls;

        const nextMain = uploadedMain
            || req.body.main_picture_url
            || req.body.thumbnail_url
            || product.main_picture_url
            || product.thumbnail_url;

        const nextGallery = Array.isArray(parsedGallery)
            ? [...parsedGallery, ...uploadedGallery]
            : product.gallery_urls;

        const nextStatus = req.body.status ?? product.status;
        const publishError = await ensurePublishAllowed(req.appUser.id, nextStatus);
        if (publishError) {
            return res.status(403).json({ errors: publishError });
        }

        await product.update({
            title: req.body.title ?? product.title,
            description: req.body.description ?? product.description,
            thumbnail_url: nextMain,
            main_picture_url: nextMain,
            gallery_urls: nextGallery,
            category_id: req.body.category_id ?? product.category_id,
            unit_price: req.body.unit_price ?? product.unit_price,
            stock_quantity: req.body.stock_quantity ?? product.stock_quantity,
            status: nextStatus,
        });

        return res.json(product);
    } catch (err) {
        console.error('marketplace_products#update error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.delete('/:id', requireRoles(['farmer']), async (req, res) => {
    try {
        const product = await MarketplaceProduct.findByPk(req.params.id);
        if (!product) return res.status(404).json({ errors: 'Product not found' });
        if (String(product.farmer_user_id) !== String(req.appUser.id)) {
            return res.status(403).json({ errors: 'Forbidden: Not your product' });
        }

        await product.destroy();
        return res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('marketplace_products#delete error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

module.exports = router;
