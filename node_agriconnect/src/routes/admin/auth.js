const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Role } = require('../../models');
const { encode } = require('../../utils/jwt');

// ─── POST /admin/login ───
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(422).json({ errors: ['Email and password are required'] });
        }

        const user = await User.findOne({
            where: { email },
            include: [{ model: Role }],
        });

        if (!user) {
            return res.status(401).json({ errors: ['Invalid email or password'] });
        }

        if (!user.Role || user.Role.name !== 'admin') {
            return res.status(403).json({ errors: ['Access denied: admin only'] });
        }

        const passwordValid = await bcrypt.compare(password, user.encrypted_password);
        if (!passwordValid) {
            return res.status(401).json({ errors: ['Invalid email or password'] });
        }

        const token = encode({ email: user.email }, '7d');

        return res.json({
            token,
            admin: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error('admin login error:', err);
        return res.status(500).json({ errors: [err.message] });
    }
});

module.exports = router;
