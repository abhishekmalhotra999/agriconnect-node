const { decode } = require('../utils/jwt');
const { User, Role } = require('../models');

const authenticate = async (req, res, next) => {
    try {
        // Extract Bearer token
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ errors: ['Not Authenticated'] });
        }

        const token = authHeader.split(' ').pop();
        if (!token) {
            return res.status(401).json({ errors: ['Not Authenticated'] });
        }

        // Decode token
        const decoded = decode(token);
        if (!decoded || (!decoded.email && !decoded.phone)) {
            return res.status(401).json({ errors: ['Not Authenticated'] });
        }

        // Find user by phone or email
        let user;
        if (decoded.phone) {
            user = await User.findOne({
                where: { phone: decoded.phone },
                include: [{ model: Role }],
            });
        } else {
            user = await User.findOne({
                where: { email: decoded.email },
                include: [{ model: Role }],
            });
        }

        if (!user) {
            return res.status(401).json({ errors: ['User not found'] });
        }

        req.appUser = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        return res.status(401).json({ errors: ['Invalid token'] });
    }
};

module.exports = authenticate;
