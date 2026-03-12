const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Course, User, Enrollment, Role } = require('../../models');

// ─── GET /admin/dashboard ───
router.get('/', async (req, res) => {
    try {
        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const adminRoleId = adminRole ? adminRole.id : -1;

        const [totalCourses, totalUsers, totalEnrollments] = await Promise.all([
            Course.count(),
            User.count({
                where: { role_id: { [Op.ne]: adminRoleId } },
            }),
            Enrollment.count(),
        ]);

        return res.json({ totalCourses, totalUsers, totalEnrollments });
    } catch (err) {
        console.error('admin dashboard error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

module.exports = router;
