const express = require('express');
const router = express.Router();
const { ServiceListing, ServiceCategory, User, ServiceReview } = require('../models');
const { requireRoles, normalizeRole } = require('../middleware/roleAuth');
const upload = require('../middleware/upload');

const listingUpload = upload.fields([
    { name: 'main_picture_file', maxCount: 1 },
    { name: 'gallery_files', maxCount: 8 },
]);

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

router.get('/', async (req, res) => {
    try {
        const where = {};
        const role = normalizeRole(req.appUser?.Role?.name);
        if (req.query.category_id) where.service_category_id = req.query.category_id;
        if (role !== 'admin') where.is_active = true;

        const rows = await ServiceListing.findAll({
            where,
            include: [
                { model: ServiceCategory, as: 'category' },
                { model: User, as: 'technician', attributes: ['id', 'name', 'email', 'phone'] },
            ],
            order: [['created_at', 'DESC']],
        });

        return res.json(rows);
    } catch (err) {
        console.error('service_listings#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/mine', requireRoles(['technician']), async (req, res) => {
    try {
        const rows = await ServiceListing.findAll({
            where: { technician_user_id: req.appUser.id },
            include: [{ model: ServiceCategory, as: 'category' }],
            order: [['created_at', 'DESC']],
        });
        return res.json(rows);
    } catch (err) {
        console.error('service_listings#mine error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const listing = await ServiceListing.findByPk(req.params.id, {
            include: [
                { model: ServiceCategory, as: 'category' },
                { model: User, as: 'technician', attributes: ['id', 'name', 'email', 'phone'] },
            ],
        });

        if (!listing) {
            return res.status(404).json({ errors: 'Service listing not found' });
        }

        const role = normalizeRole(req.appUser?.Role?.name);
        const isOwner = String(listing.technician_user_id) === String(req.appUser?.id);
        if (!listing.is_active && role !== 'admin' && !isOwner) {
            return res.status(404).json({ errors: 'Service listing not found' });
        }

        const reviews = await ServiceReview.findAll({
            where: { service_listing_id: listing.id },
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']],
        });

        const reviewCount = reviews.length;
        const avgRating = reviewCount > 0
            ? Number((reviews.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviewCount).toFixed(1))
            : 0;

        return res.json({ ...listing.toJSON(), avgRating, reviewCount });
    } catch (err) {
        console.error('service_listings#show error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.get('/:id/reviews', async (req, res) => {
    try {
        const listing = await ServiceListing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ errors: 'Service listing not found' });

        const reviews = await ServiceReview.findAll({
            where: { service_listing_id: listing.id },
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']],
        });

        return res.json(reviews);
    } catch (err) {
        console.error('service_listings#reviews_index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

router.post('/:id/reviews', async (req, res) => {
    try {
        const listing = await ServiceListing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ errors: 'Service listing not found' });

        const rating = Number(req.body.rating || 0);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return res.status(422).json({ errors: 'rating must be between 1 and 5' });
        }

        const review = await ServiceReview.create({
            service_listing_id: listing.id,
            user_id: req.appUser.id,
            rating,
            comment: req.body.comment || null,
        });

        return res.status(201).json(review);
    } catch (err) {
        console.error('service_listings#reviews_create error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.post('/', requireRoles(['technician']), listingUpload, async (req, res) => {
    try {
        const { title, description, thumbnail_url, main_picture_url, gallery_urls, service_category_id, service_area, contact_email, is_active } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(422).json({ errors: 'title is required' });
        }

        const uploadedMain = req.files?.main_picture_file?.[0]?.filename
            ? `/uploads/${req.files.main_picture_file[0].filename}`
            : null;
        const uploadedGallery = Array.isArray(req.files?.gallery_files)
            ? req.files.gallery_files.map((file) => `/uploads/${file.filename}`)
            : [];
        const parsedGallery = parseGalleryUrls(gallery_urls);
        const finalMain = uploadedMain || (main_picture_url || thumbnail_url || null);

        const listing = await ServiceListing.create({
            technician_user_id: req.appUser.id,
            service_category_id: service_category_id || null,
            title: String(title).trim(),
            description: description || null,
            thumbnail_url: finalMain,
            main_picture_url: finalMain,
            gallery_urls: [...parsedGallery, ...uploadedGallery],
            service_area: service_area || null,
            contact_email: contact_email || req.appUser.email || null,
            is_active: is_active !== undefined ? Boolean(is_active) : true,
        });

        return res.status(201).json(listing);
    } catch (err) {
        console.error('service_listings#create error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

router.put('/:id', requireRoles(['technician']), listingUpload, async (req, res) => {
    try {
        const listing = await ServiceListing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ errors: 'Service listing not found' });
        if (String(listing.technician_user_id) !== String(req.appUser.id)) {
            return res.status(403).json({ errors: 'Forbidden: Not your listing' });
        }

        const uploadedMain = req.files?.main_picture_file?.[0]?.filename
            ? `/uploads/${req.files.main_picture_file[0].filename}`
            : null;
        const uploadedGallery = Array.isArray(req.files?.gallery_files)
            ? req.files.gallery_files.map((file) => `/uploads/${file.filename}`)
            : [];

        const parsedGallery = req.body.gallery_urls !== undefined
            ? parseGalleryUrls(req.body.gallery_urls)
            : listing.gallery_urls;

        const nextMain = uploadedMain
            || req.body.main_picture_url
            || req.body.thumbnail_url
            || listing.main_picture_url
            || listing.thumbnail_url;

        const nextGallery = Array.isArray(parsedGallery)
            ? [...parsedGallery, ...uploadedGallery]
            : listing.gallery_urls;

        await listing.update({
            title: req.body.title ?? listing.title,
            description: req.body.description ?? listing.description,
            thumbnail_url: nextMain,
            main_picture_url: nextMain,
            gallery_urls: nextGallery,
            service_category_id: req.body.service_category_id ?? listing.service_category_id,
            service_area: req.body.service_area ?? listing.service_area,
            contact_email: req.body.contact_email ?? listing.contact_email,
            is_active: req.body.is_active ?? listing.is_active,
        });

        return res.json(listing);
    } catch (err) {
        console.error('service_listings#update error:', err);
        return res.status(422).json({ errors: err.message });
    }
});

module.exports = router;
