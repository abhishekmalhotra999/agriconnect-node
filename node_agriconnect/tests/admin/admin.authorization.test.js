const request = require('supertest');
const { app, createAdminUser, createNonAdminUser, cleanupUsers } = require('../helpers/adminTestUtils');
const { encode } = require('../../src/utils/jwt');

describe('Admin Authorization Boundaries', () => {
    const createdUserIds = [];
    let adminToken;
    let nonAdminToken;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        adminToken = encode({ email: admin.user.email }, '1h');

        const nonAdmin = await createNonAdminUser();
        createdUserIds.push(nonAdmin.user.id);
        nonAdminToken = encode({ email: nonAdmin.user.email }, '1h');
    });

    afterAll(async () => {
        await cleanupUsers(createdUserIds);
    });

    test('protected admin endpoints reject missing token', async () => {
        const routes = [
            '/admin/dashboard',
            '/admin/courses',
            '/admin/users',
            '/admin/privacy_policies',
            '/admin/marketplace/products',
            '/admin/marketplace/categories',
            '/admin/services/listings',
            '/admin/services/categories',
            '/admin/services/requests',
            '/admin/notifications',
        ];

        for (const route of routes) {
            const res = await request(app).get(route);
            expect(res.status).toBe(401);
        }
    });

    test('protected admin endpoints reject non-admin token', async () => {
        const routes = [
            '/admin/dashboard',
            '/admin/courses',
            '/admin/users',
            '/admin/privacy_policies',
            '/admin/marketplace/products',
            '/admin/marketplace/categories',
            '/admin/services/listings',
            '/admin/services/categories',
            '/admin/services/requests',
            '/admin/notifications',
        ];

        for (const route of routes) {
            const res = await request(app)
                .get(route)
                .set('Authorization', `Bearer ${nonAdminToken}`);
            expect(res.status).toBe(403);
        }
    });

    test('protected admin endpoints accept admin token', async () => {
        const routes = [
            '/admin/dashboard',
            '/admin/courses',
            '/admin/users',
            '/admin/privacy_policies',
            '/admin/marketplace/products',
            '/admin/marketplace/categories',
            '/admin/services/listings',
            '/admin/services/categories',
            '/admin/services/requests',
            '/admin/notifications',
        ];

        for (const route of routes) {
            const res = await request(app)
                .get(route)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        }
    });
});
