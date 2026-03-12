const express = require('express');
const router = express.Router();
const { Lesson } = require('../models');

function toPlainText(html) {
    if (!html) return null;
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── GET /api/lessons ───
router.get('/', async (req, res) => {
    try {
        const where = {};
        if (req.query.course_id) {
            where.course_id = req.query.course_id;
        }

        const lessons = await Lesson.findAll({ where });

        const result = lessons.map((lesson) => {
            let asset = null;
            if (lesson.lesson_asset) {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(lesson.lesson_asset);
                asset = {
                    url: `/uploads/${lesson.lesson_asset}`,
                    contentType: isImage ? 'image' : 'video',
                    duration: null, // Video duration would need ffmpeg processing
                };
            }

            return {
                id: lesson.id,
                title: lesson.title,
                content: lesson.content || null,
                contentPlain: toPlainText(lesson.content),
                asset,
                thumbnailUrl: lesson.thumbnail_asset ? `/uploads/${lesson.thumbnail_asset}` : '',
                createdAt: lesson.created_at,
            };
        });

        return res.json(result);
    } catch (err) {
        console.error('lessons#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

module.exports = router;
