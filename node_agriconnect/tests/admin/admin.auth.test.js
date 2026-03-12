const request = require('supertest');
const {
    app,
    createAdminUser,
    createNonAdminUser,
    cleanupUsers,
} = require('../helpers/adminTestUtils');

describe('Admin Auth API', () => {
    const createdUserIds = [];
    let adminUser;
    let nonAdminUser;

    beforeAll(async () => {
        const admin = await createAdminUser();
        adminUser = admin;
        createdUserIds.push(admin.user.id);

        const nonAdmin = await createNonAdminUser();
        nonAdminUser = nonAdmin;
        createdUserIds.push(nonAdmin.user.id);
    });

    afterAll(async () => {
        await cleanupUsers(createdUserIds);
    });

    test('POST /admin/login returns 422 for missing email/password', async () => {
        const res = await request(app).post('/admin/login').send({});
        expect(res.status).toBe(422);
        expect(res.body.errors).toBeDefined();
    });

    test('POST /admin/login returns 403 for non-admin account', async () => {
        const res = await request(app)
            .post('/admin/login')
            .send({ email: nonAdminUser.user.email, password: nonAdminUser.password });

        expect(res.status).toBe(403);
        expect(Array.isArray(res.body.errors)).toBe(true);
    });

    test('POST /admin/login returns 401 for invalid password', async () => {
        const res = await request(app)
            .post('/admin/login')
            .send({ email: adminUser.user.email, password: 'wrong-password' });

        expect(res.status).toBe(401);
        expect(Array.isArray(res.body.errors)).toBe(true);
    });

    test('POST /admin/login returns token for valid admin credentials', async () => {
        const res = await request(app)
            .post('/admin/login')
            .send({ email: adminUser.user.email, password: adminUser.password });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
        expect(res.body.admin).toMatchObject({
            email: adminUser.user.email,
            name: 'QA Admin',
        });
    });
});
