const express = require('express');
const router = require('express').Router();
const { Course, Lesson, User } = require('../../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Multer setup (course + lesson assets) ───
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
    },
});
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = /image|video/.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only image/video files allowed'), ext && mime);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });

// Register thumbnail_image, course_preview plus per-lesson named fields (up to 30 lessons)
const lessonFileFields = [];
for (let i = 0; i < 30; i++) {
    lessonFileFields.push({ name: `lesson_asset_${i}`, maxCount: 1 });
    lessonFileFields.push({ name: `lesson_thumbnail_asset_${i}`, maxCount: 1 });
}
const courseUpload = upload.fields([
    { name: 'thumbnail_image', maxCount: 1 },
    { name: 'course_preview', maxCount: 1 },
    ...lessonFileFields,
]);

const PER_PAGE = 10;

// ─── GET /admin/courses?page=1 ───
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * PER_PAGE;

        const { count, rows } = await Course.findAndCountAll({
            include: [
                { model: User, as: 'instructor', attributes: ['id', 'name'] },
                { model: Lesson, attributes: ['id'] },
            ],
            order: [['created_at', 'DESC']],
            limit: PER_PAGE,
            offset,
            distinct: true,
        });

        const courses = rows.map(c => ({
            id: c.id,
            title: c.title,
            subtitle: c.subtitle,
            price: c.price,
            duration: c.duration,
            thumbnail_image: c.thumbnail_image ? `/uploads/${c.thumbnail_image}` : null,
            course_preview: c.course_preview ? `/uploads/${c.course_preview}` : null,
            instructor: c.instructor ? c.instructor.name : null,
            instructor_id: c.instructor_id,
            lessons_count: c.Lessons ? c.Lessons.length : 0,
            created_at: c.created_at,
        }));

        return res.json({
            courses,
            total: count,
            page,
            per_page: PER_PAGE,
            total_pages: Math.ceil(count / PER_PAGE),
        });
    } catch (err) {
        console.error('admin courses index error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── GET /admin/courses/:id ───
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [
                { model: User, as: 'instructor', attributes: ['id', 'name'] },
                { model: Lesson },
            ],
            order: [[Lesson, 'created_at', 'ASC']],
        });

        if (!course) return res.status(404).json({ errors: ['Course not found'] });

        return res.json({
            id: course.id,
            title: course.title,
            subtitle: course.subtitle,
            description: course.description,
            price: course.price,
            duration: course.duration,
            thumbnail_image: course.thumbnail_image ? `/uploads/${course.thumbnail_image}` : null,
            course_preview: course.course_preview ? `/uploads/${course.course_preview}` : null,
            instructor: course.instructor ? course.instructor.name : null,
            instructor_id: course.instructor_id,
            lessons: (course.Lessons || []).map(l => ({
                id: l.id,
                title: l.title,
                content: l.content,
                lesson_asset: l.lesson_asset ? `/uploads/${l.lesson_asset}` : null,
                thumbnail_asset: l.thumbnail_asset ? `/uploads/${l.thumbnail_asset}` : null,
                resource_url: l.resource_url || null,
            })),
        });
    } catch (err) {
        console.error('admin course show error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── POST /admin/courses ───
router.post('/', courseUpload, async (req, res) => {
    try {
        const { title, subtitle, description, price, duration } = req.body;
        const files = req.files || {};

        const courseData = {
            title,
            subtitle,
            description,
            price,
            duration,
            instructor_id: req.adminUser.id,
        };
        if (files.thumbnail_image) courseData.thumbnail_image = files.thumbnail_image[0].filename;
        if (files.course_preview) courseData.course_preview = files.course_preview[0].filename;

        const course = await Course.create(courseData);

        // Handle nested lessons
        const lessons = parseLessons(req.body, files);
        for (const lessonData of lessons) {
            lessonData.course_id = course.id;
            await Lesson.create(lessonData);
        }

        const created = await Course.findByPk(course.id, {
            include: [{ model: Lesson }],
        });

        return res.status(201).json({ message: 'Course created successfully', course: created });
    } catch (err) {
        console.error('admin course create error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── PUT /admin/courses/:id ───
router.put('/:id', courseUpload, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [{ model: Lesson }],
        });
        if (!course) return res.status(404).json({ errors: ['Course not found'] });

        const { title, subtitle, description, price, duration } = req.body;
        const files = req.files || {};

        // Remove old files if flagged
        if (req.body.remove_preview === '1' && course.course_preview) {
            deleteFile(course.course_preview);
            course.course_preview = null;
        }
        if (req.body.remove_thumbnail_image === '1' && course.thumbnail_image) {
            deleteFile(course.thumbnail_image);
            course.thumbnail_image = null;
        }

        if (title !== undefined) course.title = title;
        if (subtitle !== undefined) course.subtitle = subtitle;
        if (description !== undefined) course.description = description;
        if (price !== undefined) course.price = price;
        if (duration !== undefined) course.duration = duration;
        if (files.thumbnail_image) course.thumbnail_image = files.thumbnail_image[0].filename;
        if (files.course_preview) course.course_preview = files.course_preview[0].filename;

        await course.save();

        // Handle lessons: update existing, destroy flagged, create new
        const incomingLessons = parseLessons(req.body, files);
        for (const lessonData of incomingLessons) {
            if (lessonData.id) {
                const existing = await Lesson.findByPk(lessonData.id);
                if (!existing) continue;
                if (lessonData._destroy === '1') {
                    await existing.destroy();
                    continue;
                }
                // Remove files if flagged
                if (lessonData.remove_lesson_asset === '1' && existing.lesson_asset) {
                    deleteFile(existing.lesson_asset);
                    existing.lesson_asset = null;
                }
                if (lessonData.remove_thumbnail_asset === '1' && existing.thumbnail_asset) {
                    deleteFile(existing.thumbnail_asset);
                    existing.thumbnail_asset = null;
                }
                if (lessonData.title !== undefined) existing.title = lessonData.title;
                if (lessonData.content !== undefined) existing.content = lessonData.content;
                if (lessonData.lesson_asset) existing.lesson_asset = lessonData.lesson_asset;
                if (lessonData.thumbnail_asset) existing.thumbnail_asset = lessonData.thumbnail_asset;
                await existing.save();
            } else {
                // New lesson
                await Lesson.create({ ...lessonData, course_id: course.id });
            }
        }

        const updated = await Course.findByPk(course.id, { include: [{ model: Lesson }] });
        return res.json({ message: 'Course updated successfully', course: updated });
    } catch (err) {
        console.error('admin course update error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── DELETE /admin/courses/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, { include: [{ model: Lesson }] });
        if (!course) return res.status(404).json({ errors: ['Course not found'] });

        // Delete associated files
        if (course.thumbnail_image) deleteFile(course.thumbnail_image);
        if (course.course_preview) deleteFile(course.course_preview);
        for (const lesson of course.Lessons || []) {
            if (lesson.lesson_asset) deleteFile(lesson.lesson_asset);
            if (lesson.thumbnail_asset) deleteFile(lesson.thumbnail_asset);
        }

        // Rails-origin schema may enforce FK without DB-level cascade, so explicitly
        // delete child lessons before deleting the parent course.
        await Lesson.destroy({ where: { course_id: course.id } });
        await course.destroy();
        return res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        console.error('admin course delete error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

// ─── Helpers ───

function deleteFile(filename) {
    try {
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.warn('Could not delete file:', filename, e.message);
    }
}

/**
 * Parse flat lessons[0][title], lessons[0][content], etc. sent from multipart form.
 * Files are keyed as lesson_asset_0, lesson_thumbnail_asset_0, etc. so index always matches.
 */
function parseLessons(body, files) {
    const lessonsMap = {};

    const normalizeValue = (val) => (Array.isArray(val) ? val[0] : val);

    // Handle nested parser output: body.lessons[0].content
    if (body.lessons) {
        if (Array.isArray(body.lessons)) {
            body.lessons.forEach((lesson, idx) => {
                if (!lesson) return;
                if (!lessonsMap[idx]) lessonsMap[idx] = {};
                for (const [field, value] of Object.entries(lesson)) {
                    lessonsMap[idx][field] = normalizeValue(value);
                }
            });
        } else if (typeof body.lessons === 'object') {
            for (const [idx, lesson] of Object.entries(body.lessons)) {
                if (!lesson || typeof lesson !== 'object') continue;
                if (!lessonsMap[idx]) lessonsMap[idx] = {};
                for (const [field, value] of Object.entries(lesson)) {
                    lessonsMap[idx][field] = normalizeValue(value);
                }
            }
        }
    }

    for (const key of Object.keys(body)) {
        const match = key.match(/^lessons\[(\d+)\]\[(.+)\]$/);
        if (match) {
            const idx = match[1];
            const field = match[2];
            if (!lessonsMap[idx]) lessonsMap[idx] = {};
            lessonsMap[idx][field] = normalizeValue(body[key]);
        }
    }

    // Attach uploaded files by lesson index from field name (lesson_asset_0, lesson_asset_1, etc.)
    for (let i = 0; i < 30; i++) {
        const assetKey = `lesson_asset_${i}`;
        const thumbKey = `lesson_thumbnail_asset_${i}`;
        if (files[assetKey]) {
            if (!lessonsMap[i]) lessonsMap[i] = {};
            lessonsMap[i].lesson_asset = files[assetKey][0].filename;
        }
        if (files[thumbKey]) {
            if (!lessonsMap[i]) lessonsMap[i] = {};
            lessonsMap[i].thumbnail_asset = files[thumbKey][0].filename;
        }
    }

    return Object.values(lessonsMap);
}

module.exports = router;
