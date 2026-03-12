const { decode } = require('../utils/jwt');
const { User, Role } = require('../models');

const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ errors: ['Not Authenticated'] });
        }

        const token = authHeader.split(' ').pop();
        if (!token) {
            return res.status(401).json({ errors: ['Not Authenticated'] });
        }

        const decoded = decode(token);
        if (!decoded || !decoded.email) {
            return res.status(401).json({ errors: ['Not Authenticated'] });
        }

        const user = await User.findOne({
            where: { email: decoded.email },
            include: [{ model: Role }],
        });

        if (!user) {
            return res.status(401).json({ errors: ['User not found'] });
        }

        if (!user.Role || user.Role.name !== 'admin') {
            return res.status(403).json({ errors: ['Forbidden: Admin access required'] });
        }

        req.adminUser = user;
        next();
    } catch (err) {
        console.error('adminAuth error:', err);
        return res.status(500).json({ errors: ['Internal server error'] });
    }
};

module.exports = adminAuth;
