const express = require('express');
const router = express.Router();
const { Enrollment, Course, User, Lesson } = require('../models');

// ─── GET /api/enrollments ───
router.get('/', async (req, res) => {
    try {
        const enrollments = await Enrollment.findAll({
            where: { user_id: req.appUser.id },
            include: [
                {
                    model: Course,
                    include: [
                        { model: User, as: 'instructor', attributes: ['name'] },
                        { model: Lesson, attributes: ['id'] },
                    ],
                },
            ],
        });

        const result = enrollments.map((enrollment) => {
            const course = enrollment.Course;
            return {
                id: enrollment.id,
                lessonIds: course.Lessons ? course.Lessons.map((l) => l.id) : [],
                course: {
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
                },
            };
        });

        return res.json(result);
    } catch (err) {
        console.error('enrollments#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

// ─── POST /api/enrollments ───
router.post('/', async (req, res) => {
    try {
        const courseId = Number(req.body.course_id);

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return res.status(422).json({ errors: 'course_id is required' });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ errors: 'Course not found' });
        }

        // Check if already enrolled
        const existing = await Enrollment.findOne({
            where: { user_id: req.appUser.id, course_id: courseId },
        });

        if (existing) {
            return res.json({ status: 'Already enrolled to this course.', enrolled: true });
        }

        await Enrollment.create({
            user_id: req.appUser.id,
            course_id: courseId,
        });

        return res.json({ status: 'ok', enrolled: true });
    } catch (err) {
        console.error('enrollments#create error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

module.exports = router;
