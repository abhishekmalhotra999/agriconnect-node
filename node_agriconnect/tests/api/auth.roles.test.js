const request = require('supertest');
const { app } = require('../../src/app');
const { User, Profile, Role } = require('../../src/models');

function uniquePhone(prefix = '91') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

describe('Auth role enforcement and role-specific signup', () => {
    const createdUserIds = [];

    afterEach(async () => {
        if (createdUserIds.length === 0) return;
        await Profile.destroy({ where: { user_id: createdUserIds } });
        await User.destroy({ where: { id: createdUserIds } });
        createdUserIds.length = 0;
    });

    test('rejects invalid accountType in get_otp', async () => {
        const res = await request(app)
            .post('/api/get_otp')
            .send({ phone: uniquePhone(), name: 'Invalid Role', accountType: 'hacker' });

        expect(res.status).toBe(422);
        expect(String(res.body.errors || '')).toMatch(/invalid account type/i);
    });

    test('accepts farmer role and stores canonical role', async () => {
        const phone = uniquePhone('92');

        const res = await request(app)
            .post('/api/get_otp')
            .send({ phone, name: 'Farmer User', accountType: 'Farmer' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');

        const user = await User.findOne({
            where: { phone },
            include: [{ model: Role }],
        });

        createdUserIds.push(user.id);
        expect(user).toBeTruthy();
        expect((user.Role?.name || '').toLowerCase()).toBe('farmer');
    });

    test('requires farmer-specific fields on sign_up', async () => {
        const phone = uniquePhone('93');

        const otpRes = await request(app)
            .post('/api/get_otp')
            .send({ phone, name: 'Farmer Missing Fields', accountType: 'farmer' });

        expect(otpRes.status).toBe(200);

        const user = await User.findOne({ where: { phone } });
        createdUserIds.push(user.id);

        const res = await request(app)
            .post('/api/sign_up')
            .send({
                phone,
                email: `farmer-${Date.now()}@example.com`,
                password: 'Farmer@123',
                confirmPassword: 'Farmer@123',
                address: 'Village Road',
            });

        expect(res.status).toBe(422);
        expect(String(res.body.errors || '')).toMatch(/missing required fields/i);
        expect(String(res.body.errors || '')).toMatch(/farmingType|farmSize|yearsOfExperience/i);
    });

    test('stores farmer profile fields on successful sign_up', async () => {
        const phone = uniquePhone('94');

        const otpRes = await request(app)
            .post('/api/get_otp')
            .send({ phone, name: 'Farmer Complete', accountType: 'farmer' });

        expect(otpRes.status).toBe(200);

        const user = await User.findOne({ where: { phone } });
        createdUserIds.push(user.id);

        const res = await request(app)
            .post('/api/sign_up')
            .send({
                phone,
                email: `farmer-complete-${Date.now()}@example.com`,
                password: 'Farmer@123',
                confirmPassword: 'Farmer@123',
                address: 'Village Road',
                yearsOfExperience: '8',
                farmSize: '12 acres',
                farmingType: 'Crop Farming',
            });

        expect(res.status).toBe(200);
        expect(res.body.user).toBeTruthy();
        expect(res.body.user.profile.farmingType).toBe('Crop Farming');
        expect(res.body.user.profile.farmSize).toBe('12 acres');
        expect(res.body.user.profile.yearsOfExperience).toBe('8');
        expect((res.body.user.accountType || '').toLowerCase()).toBe('farmer');
    });
});
