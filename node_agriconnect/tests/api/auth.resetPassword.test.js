const bcrypt = require('bcrypt');
const request = require('supertest');
const { app } = require('../../src/app');
const { User, Role, Profile } = require('../../src/models');

function uniquePhone(prefix = '95') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

describe('Auth reset password security', () => {
    const cleanupUserIds = [];

    afterEach(async () => {
        if (cleanupUserIds.length) {
            await Profile.destroy({ where: { user_id: cleanupUserIds } });
            await User.destroy({ where: { id: cleanupUserIds } });
            cleanupUserIds.length = 0;
        }
    });

    test('reset password requires and validates verification code', async () => {
        const [customerRole] = await Role.findOrCreate({ where: { name: 'customer' }, defaults: { name: 'customer' } });
        const phone = uniquePhone();
        const originalPassword = 'Orig@1234';
        const newPassword = 'New@1234';

        const user = await User.create({
            name: 'reset flow user',
            email: `reset-${Date.now()}@example.com`,
            phone,
            role_id: customerRole.id,
            encrypted_password: await bcrypt.hash(originalPassword, 10),
            info: {},
        });
        cleanupUserIds.push(user.id);
        await Profile.create({ user_id: user.id, address: 'Monrovia', profession_type: 'customer' });

        const forgot = await request(app)
            .post('/api/forgot_password')
            .send({ phone });
        expect(forgot.status).toBe(200);
        expect(forgot.body.status).toBe('ok');

        const missingCode = await request(app)
            .post('/api/reset_password')
            .send({
                phone,
                password: newPassword,
                confirmPassword: newPassword,
            });
        expect(missingCode.status).toBe(200);
        expect(missingCode.body.errors).toMatch(/Verification code is required/i);

        const invalidCode = await request(app)
            .post('/api/reset_password')
            .send({
                phone,
                verificationCode: '9999',
                password: newPassword,
                confirmPassword: newPassword,
            });
        expect(invalidCode.status).toBe(200);
        expect(invalidCode.body.errors).toMatch(/Invalid verification code/i);

        const validCode = await request(app)
            .post('/api/reset_password')
            .send({
                phone,
                verificationCode: '1234',
                password: newPassword,
                confirmPassword: newPassword,
            });
        expect(validCode.status).toBe(200);
        expect(validCode.body.status).toMatch(/reset successfully/i);

        const oldLogin = await request(app)
            .post('/api/sign_in')
            .send({ phone, password: originalPassword });
        expect(oldLogin.body.errors).toBeTruthy();

        const newLogin = await request(app)
            .post('/api/sign_in')
            .send({ phone, password: newPassword });
        expect(newLogin.body.user?.jwtToken).toBeTruthy();
    });
});
