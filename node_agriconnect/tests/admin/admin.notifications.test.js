const bcrypt = require('bcrypt');
const request = require('supertest');
const {
    app,
    createAdminUser,
    cleanupUsers,
    loginAdmin,
} = require('../helpers/adminTestUtils');
const { Role, User, UserPreference } = require('../../src/models');

describe('Admin Notifications API', () => {
    const createdUserIds = [];
    let token;
    let customerUser;
    let farmerUser;
    let technicianUser;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        token = await loginAdmin(admin.user.email, admin.password);

        const [customerRole] = await Role.findOrCreate({ where: { name: 'user' }, defaults: { name: 'user' } });
        const [farmerRole] = await Role.findOrCreate({ where: { name: 'farmer' }, defaults: { name: 'farmer' } });
        const [technicianRole] = await Role.findOrCreate({ where: { name: 'technician' }, defaults: { name: 'technician' } });

        const passwordHash = await bcrypt.hash('User@1234', 10);

        customerUser = await User.create({
            name: 'QA Customer',
            email: `qa-customer-${Date.now()}@example.com`,
            phone: `560-${Date.now()}`,
            role_id: customerRole.id,
            encrypted_password: passwordHash,
            info: {},
        });

        farmerUser = await User.create({
            name: 'QA Farmer',
            email: `qa-farmer-notif-${Date.now()}@example.com`,
            phone: `561-${Date.now()}`,
            role_id: farmerRole.id,
            encrypted_password: passwordHash,
            info: {},
        });

        technicianUser = await User.create({
            name: 'QA Technician',
            email: `qa-tech-${Date.now()}@example.com`,
            phone: `562-${Date.now()}`,
            role_id: technicianRole.id,
            encrypted_password: passwordHash,
            info: {},
        });

        createdUserIds.push(customerUser.id, farmerUser.id, technicianUser.id);
    });

    afterAll(async () => {
        await UserPreference.destroy({ where: { user_id: createdUserIds } });
        await cleanupUsers(createdUserIds);
    });

    test('POST /admin/notifications broadcasts to all non-admin users', async () => {
        const res = await request(app)
            .post('/admin/notifications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'System Maintenance',
                message: 'Scheduled maintenance starts at 10 PM.',
                audience: 'all',
            });

        expect(res.status).toBe(201);
        expect(res.body.recipientCount).toBeGreaterThanOrEqual(3);
        expect(res.body.broadcastId).toBeTruthy();

        const broadcastId = res.body.broadcastId;

        const customerPref = await UserPreference.findOne({ where: { user_id: customerUser.id } });
        const farmerPref = await UserPreference.findOne({ where: { user_id: farmerUser.id } });
        const technicianPref = await UserPreference.findOne({ where: { user_id: technicianUser.id } });

        expect(Array.isArray(customerPref.notifications)).toBe(true);
        expect(Array.isArray(farmerPref.notifications)).toBe(true);
        expect(Array.isArray(technicianPref.notifications)).toBe(true);

        expect(customerPref.notifications.some((item) => item.broadcastId === broadcastId)).toBe(true);
        expect(farmerPref.notifications.some((item) => item.broadcastId === broadcastId)).toBe(true);
        expect(technicianPref.notifications.some((item) => item.broadcastId === broadcastId)).toBe(true);
    });

    test('POST /admin/notifications can target farmers only', async () => {
        const res = await request(app)
            .post('/admin/notifications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Farmer Seller Update',
                message: 'Farm storefront policy has been updated.',
                audience: 'farmers',
            });

        expect(res.status).toBe(201);
        expect(res.body.recipientCount).toBeGreaterThanOrEqual(1);

        const broadcastId = res.body.broadcastId;

        const customerPref = await UserPreference.findOne({ where: { user_id: customerUser.id } });
        const farmerPref = await UserPreference.findOne({ where: { user_id: farmerUser.id } });
        const technicianPref = await UserPreference.findOne({ where: { user_id: technicianUser.id } });

        expect(customerPref.notifications.some((item) => item.broadcastId === broadcastId)).toBe(false);
        expect(farmerPref.notifications.some((item) => item.broadcastId === broadcastId)).toBe(true);
        expect(technicianPref.notifications.some((item) => item.broadcastId === broadcastId)).toBe(false);
    });

    test('GET /admin/notifications returns announcement feed', async () => {
        const res = await request(app)
            .get('/admin/notifications?page=1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.announcements)).toBe(true);
        expect(res.body.announcements.length).toBeGreaterThan(0);

        const item = res.body.announcements[0];
        expect(item.title).toBeTruthy();
        expect(item.message).toBeTruthy();
        expect(typeof item.recipientCount).toBe('number');
    });
});
