const bcrypt = require('bcrypt');
const request = require('supertest');
const {
    app,
    createAdminUser,
    createNonAdminUser,
    loginAdmin,
    cleanupUsers,
} = require('../helpers/adminTestUtils');
const { Profile, Role, User, UserPreference } = require('../../src/models');

describe('Admin Users API', () => {
    const createdUserIds = [];
    const createdProfileIds = [];
    let token;
    let adminEmail;
    let nonAdminEmail;
    let farmerUser;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        adminEmail = admin.user.email;
        token = await loginAdmin(admin.user.email, admin.password);

        const nonAdmin = await createNonAdminUser();
        createdUserIds.push(nonAdmin.user.id);
        nonAdminEmail = nonAdmin.user.email;

        const profile = await Profile.create({
            user_id: nonAdmin.user.id,
            address: 'QA Address',
            farm_size: '5 acres',
            profession_type: 'Farmer',
            years_of_experience: '8',
        });
        createdProfileIds.push(profile.id);

        const [farmerRole] = await Role.findOrCreate({
            where: { name: 'farmer' },
            defaults: { name: 'farmer' },
        });

        farmerUser = await User.create({
            name: 'QA Farmer Seller',
            email: `qa-farmer-${Date.now()}@example.com`,
            phone: `558-${Date.now()}`,
            role_id: farmerRole.id,
            encrypted_password: await bcrypt.hash('Farmer@1234', 10),
            info: {},
        });
        createdUserIds.push(farmerUser.id);

        const farmerProfile = await Profile.create({
            user_id: farmerUser.id,
            address: 'Farm Road',
            farm_size: '9 acres',
            profession_type: 'Farmer',
            years_of_experience: '6',
        });
        createdProfileIds.push(farmerProfile.id);

        await UserPreference.create({
            user_id: farmerUser.id,
            saved_items: [],
            recent_items: [],
            notifications: [],
            farmer_onboarding: { completed: true, storeName: 'QA Seller Farm' },
            seller_status: 'pending',
        });
    });

    afterAll(async () => {
        if (createdProfileIds.length) {
            await Profile.destroy({ where: { id: createdProfileIds } });
        }
        await UserPreference.destroy({ where: { user_id: createdUserIds } });
        await cleanupUsers(createdUserIds);
    });

    test('GET /admin/users returns 401 without token', async () => {
        const res = await request(app).get('/admin/users');
        expect(res.status).toBe(401);
    });

    test('GET /admin/users returns paginated non-admin users', async () => {
        const res = await request(app)
            .get('/admin/users?page=1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
        expect(typeof res.body.total).toBe('number');
        expect(res.body.page).toBe(1);

        const emails = res.body.users.map(u => u.email);
        expect(emails).toContain(nonAdminEmail);
        expect(emails).not.toContain(adminEmail);

        const listed = res.body.users.find(u => u.email === nonAdminEmail);
        expect(listed.profession_type).toBe('Farmer');
        expect(listed.farm_size).toBe('5 acres');
        expect(listed.seller_status).toBeTruthy();
    });

    test('PATCH /admin/users/:id/seller-status updates farmer seller status', async () => {
        const res = await request(app)
            .patch(`/admin/users/${farmerUser.id}/seller-status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ sellerStatus: 'approved', sellerStatusReason: 'All checks complete.' });

        expect(res.status).toBe(200);
        expect(res.body.sellerStatus).toBe('approved');

        const updated = await UserPreference.findOne({ where: { user_id: farmerUser.id } });
        expect(updated.seller_status).toBe('approved');
        expect(updated.seller_status_reason).toBeNull();
    });

    test('PATCH /admin/users/:id/seller-status rejects non-farmer users', async () => {
        const nonFarmer = await User.findOne({ where: { email: nonAdminEmail } });
        const res = await request(app)
            .patch(`/admin/users/${nonFarmer.id}/seller-status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ sellerStatus: 'approved' });

        expect(res.status).toBe(422);
        expect(String(res.body.errors?.[0] || '')).toMatch(/only be managed for farmer/i);
    });

    test('GET /admin/users filters by farmer and pending seller status', async () => {
        await UserPreference.update({ seller_status: 'pending', seller_status_reason: 'Verification in progress' }, { where: { user_id: farmerUser.id } });

        const res = await request(app)
            .get('/admin/users?page=1&user_type=farmer&seller_status=pending')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
        expect(res.body.users.length).toBeGreaterThan(0);
        expect(res.body.users.every((u) => String(u.user_type).toLowerCase() === 'farmer')).toBe(true);
        expect(res.body.users.every((u) => String(u.seller_status).toLowerCase() === 'pending')).toBe(true);
        expect(res.body.users.some((u) => String(u.seller_status_reason || '').includes('Verification'))).toBe(true);
    });

    test('PATCH /admin/users/:id/seller-status requires reason when rejected', async () => {
        const res = await request(app)
            .patch(`/admin/users/${farmerUser.id}/seller-status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ sellerStatus: 'rejected' });

        expect(res.status).toBe(422);
        expect(String(res.body.errors?.[0] || '')).toMatch(/reason is required/i);
    });

    test('PATCH /admin/users/:id/seller-status stores reason for rejected', async () => {
        const res = await request(app)
            .patch(`/admin/users/${farmerUser.id}/seller-status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ sellerStatus: 'rejected', sellerStatusReason: 'Missing business registration proof.' });

        expect(res.status).toBe(200);
        expect(res.body.sellerStatus).toBe('rejected');
        expect(String(res.body.sellerStatusReason || '')).toMatch(/Missing business registration proof/i);

        const updated = await UserPreference.findOne({ where: { user_id: farmerUser.id } });
        expect(updated.seller_status).toBe('rejected');
        expect(String(updated.seller_status_reason || '')).toMatch(/Missing business registration proof/i);
    });
});
