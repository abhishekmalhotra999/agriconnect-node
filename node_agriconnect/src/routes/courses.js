const express = require('express');
const router = express.Router();
const { Course, User, Lesson } = require('../models');

// ─── GET /api/courses ───
router.get('/', async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [
                { model: User, as: 'instructor', attributes: ['name'] },
            ],
            order: [['created_at', 'DESC']],
        });

        const result = courses.map((course) => ({
            id: course.id,
            title: course.title,
            subtitle: course.subtitle,
            description: course.description || null,
            price: course.price,
            duration: course.duration,
            previewVideo: course.course_preview
                ? {
                    url: `/uploads/${course.course_preview}`,
                    contentType: /\.(jpg|jpeg|png|gif|webp)$/i.test(course.course_preview) ? 'image' : 'video',
                }
                : '',
            thumbnailUrl: course.thumbnail_image ? `/uploads/${course.thumbnail_image}` : '',
            instructor: course.instructor ? course.instructor.name : null,
            createdAt: course.created_at,
            updatedAt: course.updated_at,
        }));

        return res.json(result);
    } catch (err) {
        console.error('courses#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

module.exports = router;
