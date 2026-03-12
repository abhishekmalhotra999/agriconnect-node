const request = require('supertest');
const {
    app,
    createAdminUser,
    loginAdmin,
    cleanupUsers,
} = require('../helpers/adminTestUtils');

describe('Admin Dashboard API', () => {
    const createdUserIds = [];
    let token;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        token = await loginAdmin(admin.user.email, admin.password);
    });

    afterAll(async () => {
        await cleanupUsers(createdUserIds);
    });

    test('GET /admin/dashboard returns 401 without token', async () => {
        const res = await request(app).get('/admin/dashboard');
        expect(res.status).toBe(401);
    });

    test('GET /admin/dashboard returns count payload with token', async () => {
        const res = await request(app)
            .get('/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(typeof res.body.totalCourses).toBe('number');
        expect(typeof res.body.totalUsers).toBe('number');
        expect(typeof res.body.totalEnrollments).toBe('number');
    });
});
