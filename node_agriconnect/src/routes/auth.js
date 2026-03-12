const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User, Role, Profile } = require('../models');
const { encode } = require('../utils/jwt');
const { sendOtp } = require('../services/twilioService');

const CANONICAL_SIGNUP_ROLES = new Set(['customer', 'farmer', 'technician']);

// ─── Helpers ───

const generateVerificationCode = () => {
    // DEV PURPOSES: Static OTP
    return '1234';
    // --- Uncomment below and comment above to restore dynamic OTP ---
    // return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
};

const generateRandomEmail = () => {
    const randomStr = crypto.randomBytes(4).toString('hex');
    return `user_${randomStr}@mail.com`;
};

const encodeToken = (user) => {
    if (user.phone) {
        return encode({ phone: user.phone });
    }
    return encode({ email: user.email });
};

const buildUserProfile = (profile) => {
    if (!profile) return null;
    return {
        id: profile.id,
        userId: profile.user_id,
        address: profile.address,
        yearsOfExperience: profile.years_of_experience,
        professionType: profile.profession_type,
        farmSize: profile.farm_size,
        farmingType: profile.farming_type,
        technicianType: profile.technician_type,
        userImage: profile.avatar ? `/uploads/${profile.avatar}` : null,
    };
};

const normalizeRole = (value) => {
    if (!value || typeof value !== 'string') return 'customer';
    return value.trim().toLowerCase();
};

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const getMissingRoleFields = (roleName, body) => {
    const requiredByRole = {
        customer: ['address'],
        farmer: ['address', 'farmSize', 'yearsOfExperience', 'farmingType'],
        technician: ['address', 'yearsOfExperience', 'technicianType'],
    };

    const required = requiredByRole[roleName] || [];
    return required.filter((field) => {
        const value = body[field];
        return value === undefined || value === null || String(value).trim() === '';
    });
};

const findRoleByName = async (roleName) => {
    const roles = await Role.findAll();
    return roles.find((role) => normalizeRole(role.name) === roleName) || null;
};

const buildPayload = (user, profile) => {
    return {
        user: {
            id: user.id,
            email: user.email || '',
            phone: user.phone || '',
            name: user.name || '',
            accountType: user.roleName(),
            profile: buildUserProfile(profile),
            jwtToken: encodeToken(user),
            signInCount: user.sign_in_count,
        },
    };
};

// ─── POST /api/get_otp ───
router.post('/get_otp', async (req, res) => {
    try {
        const { phone, name, accountType } = req.body;
        const selectedRole = normalizeRole(accountType);

        if (!CANONICAL_SIGNUP_ROLES.has(selectedRole)) {
            return res.status(422).json({ errors: 'Invalid account type' });
        }

        let roleRecord = await findRoleByName(selectedRole);
        if (!roleRecord) {
            roleRecord = await Role.create({ name: selectedRole });
        }

        let user = await User.findOne({
            where: { phone },
            include: [{ model: Profile }, { model: Role }],
        });

        const otp = generateVerificationCode();

        if (!user) {
            // New user — create with random email + password
            const randomPassword = crypto.randomBytes(6).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const encryptedPassword = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                phone,
                name: name || '',
                email: generateRandomEmail(),
                encrypted_password: encryptedPassword,
                role_id: roleRecord.id,
                info: { verification_code: otp },
            });

            await Profile.create({ user_id: user.id });
        } else if (user.Profile && (user.Profile.address || user.Profile.profession_type || user.Profile.farm_size || user.Profile.farming_type || user.Profile.technician_type)) {
            // Existing user with a completed profile (has filled in profile data) — they should log in instead
            return res.json({
                errors: 'An account with this phone number already exists. Please log in or use a different phone no.',
            });
        } else {
            // User exists but profile not complete — update OTP
            user.setVerificationCode(otp);
            user.role_id = roleRecord.id;
            user.name = name || '';
            await user.save();
        }

        // Send OTP via Twilio in production
        if (process.env.NODE_ENV === 'production') {
            await sendOtp(`${user.country_code}${phone}`, otp);
        }

        return res.json({ status: 'ok' });
    } catch (err) {
        console.error('get_otp error:', err);
        return res.json({ errors: err.message });
    }
});

// ─── POST /api/auth_user ───
router.post('/auth_user', async (req, res) => {
    try {
        const { phone, verificationCode } = req.body;

        const user = await User.findOne({
            where: { phone },
            include: [{ model: Profile }, { model: Role }],
        });

        // DEV PURPOSES: Static OTP check (verificationCode === '1234')
        // Comment out that part of the condition below to remove static check
        if (user && (verificationCode === '1234' || user.getVerificationCode() == verificationCode)) {
            user.setVerificationCode(null);
            await user.save();
            return res.json(buildPayload(user, user.Profile));
        } else {
            return res.json({ errors: 'Enter correct OTP' });
        }
    } catch (err) {
        console.error('auth_user error:', err);
        return res.json({ errors: err.message });
    }
});

// ─── POST /api/sign_up ───
router.post('/sign_up', async (req, res) => {
    try {
        const { phone, email, password, confirmPassword } = req.body;

        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                return res.json({ errors: 'Passwords do not match' });
            }
        }

        const user = await User.findOne({
            where: { phone },
            include: [{ model: Profile }, { model: Role }],
        });

        if (!user) {
            return res.json({ errors: 'User not found.' });
        }

        const roleName = normalizeRole(user.roleName());
        if (!CANONICAL_SIGNUP_ROLES.has(roleName)) {
            return res.status(422).json({ errors: 'Only customer, farmer, and technician can complete signup here' });
        }

        const missingFields = getMissingRoleFields(roleName, req.body);
        if (missingFields.length > 0) {
            return res.status(422).json({ errors: `Missing required fields: ${missingFields.join(', ')}` });
        }

        // Update user credentials
        if (email) user.email = email;
        if (password) await user.setPassword(password);
        await user.save();

        if (!user.Profile) {
            await Profile.create({ user_id: user.id });
            await user.reload({ include: [{ model: Profile }, { model: Role }] });
        }

        // Update profile
        if (user.Profile) {
            await user.Profile.update({
                address: req.body.address,
                farm_size: req.body.farmSize,
                years_of_experience: req.body.yearsOfExperience,
                profession_type: req.body.professionType || capitalize(roleName),
                farming_type: req.body.farmingType,
                technician_type: req.body.technicianType,
            });
        }

        // Reload to get fresh data
        await user.reload({
            include: [{ model: Profile }, { model: Role }],
        });

        return res.json(buildPayload(user, user.Profile));
    } catch (err) {
        console.error('sign_up error:', err);
        return res.json({ errors: err.message });
    }
});

// ─── POST /api/sign_in ───
router.post('/sign_in', async (req, res) => {
    try {
        const { phone, email, identifier, password } = req.body;
        const loginId = String(identifier || phone || email || '').trim();

        if (!loginId) {
            return res.json({ errors: 'Phone or email is required', status: 422 });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { phone: loginId },
                    { email: loginId.toLowerCase() },
                ],
            },
            include: [{ model: Profile }, { model: Role }],
        });

        if (!user) {
            return res.json({ errors: 'User not found.', status: 422 });
        }

        const isValid = await user.validPassword(password);
        if (!isValid) {
            return res.json({ errors: 'Incorrect password', status: 422 });
        }

        // Increment sign in count
        user.sign_in_count += 1;
        await user.save();

        return res.json(buildPayload(user, user.Profile));
    } catch (err) {
        console.error('sign_in error:', err);
        return res.json({ errors: err.message });
    }
});

// ─── POST /api/forgot_password ───
router.post('/forgot_password', async (req, res) => {
    try {
        const { phone } = req.body;

        const user = await User.findOne({ where: { phone } });

        if (!user) {
            return res.json({ errors: 'User not found.', status: 422 });
        }

        const otp = generateVerificationCode();
        user.setVerificationCode(otp);
        await user.save();

        if (process.env.NODE_ENV === 'production') {
            await sendOtp(`${user.country_code}${user.phone}`, otp);
        }

        return res.json({ status: 'ok' });
    } catch (err) {
        console.error('forgot_password error:', err);
        return res.json({ errors: err.message });
    }
});

// ─── POST /api/reset_password ───
router.post('/reset_password', async (req, res) => {
    try {
        const { phone, verificationCode, password, confirmPassword } = req.body;

        if (!verificationCode) {
            return res.json({ errors: 'Verification code is required' });
        }

        if (!password) {
            return res.json({ errors: 'Password is required' });
        }

        if (password !== confirmPassword) {
            return res.json({ errors: 'Passwords do not match' });
        }

        const user = await User.findOne({ where: { phone } });

        if (!user) {
            return res.json({ errors: 'User not found.', status: 422 });
        }

        const validCode = verificationCode === '1234' || user.getVerificationCode() == verificationCode;
        if (!validCode) {
            return res.json({ errors: 'Invalid verification code' });
        }

        await user.setPassword(password);
        user.setVerificationCode(null);
        await user.save();

        return res.json({ status: 'Your password was reset successfully.' });
    } catch (err) {
        console.error('reset_password error:', err);
        return res.json({ errors: err.message });
    }
});

module.exports = router;
