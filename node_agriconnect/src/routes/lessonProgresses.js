const express = require('express');
const router = express.Router();
const { LessonProgress } = require('../models');

// ─── GET /api/lesson_progresses ───
router.get('/', async (req, res) => {
    try {
        const progresses = await LessonProgress.findAll({
            where: { user_id: req.appUser.id },
        });
        return res.json(progresses);
    } catch (err) {
        console.error('lesson_progresses#index error:', err);
        return res.status(500).json({ errors: err.message });
    }
});

// ─── PUT /api/lesson_progresses/:id ───
router.put('/:id', async (req, res) => {
    try {
        const lessonId = req.params.id;
        const { completed } = req.body;

        let progress = await LessonProgress.findOne({
            where: { user_id: req.appUser.id, lesson_id: lessonId },
        });

        if (!progress) {
            progress = await LessonProgress.create({
                user_id: req.appUser.id,
                lesson_id: lessonId,
                completed: completed || false,
            });
        } else {
            progress.completed = completed;
            await progress.save();
        }

        return res.json({
            success: true,
            lesson_id: progress.lesson_id,
            completed: progress.completed,
        });
    } catch (err) {
        console.error('lesson_progresses#update error:', err);
        return res.status(422).json({ error: 'Failed to update progress' });
    }
});

module.exports = router;
