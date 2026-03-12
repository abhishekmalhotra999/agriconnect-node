const request = require('supertest');
const {
    app,
    createAdminUser,
    loginAdmin,
    cleanupUsers,
    unique,
} = require('../helpers/adminTestUtils');
const { MarketplaceCategory, ServiceCategory } = require('../../src/models');

describe('Admin Categories API', () => {
    const createdUserIds = [];
    const createdMarketplaceCategoryIds = [];
    const createdServiceCategoryIds = [];
    let token;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        token = await loginAdmin(admin.user.email, admin.password);
    });

    afterAll(async () => {
        if (createdMarketplaceCategoryIds.length > 0) {
            await MarketplaceCategory.destroy({ where: { id: createdMarketplaceCategoryIds } });
        }
        if (createdServiceCategoryIds.length > 0) {
            await ServiceCategory.destroy({ where: { id: createdServiceCategoryIds } });
        }
        await cleanupUsers(createdUserIds);
    });

    test('marketplace categories CRUD works', async () => {
        const createRes = await request(app)
            .post('/admin/marketplace/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: unique('market-cat'), description: 'Seeds and produce' });

        expect(createRes.status).toBe(201);
        expect(createRes.body.id).toBeDefined();
        const categoryId = createRes.body.id;
        createdMarketplaceCategoryIds.push(categoryId);

        const indexRes = await request(app)
            .get('/admin/marketplace/categories?page=1')
            .set('Authorization', `Bearer ${token}`);

        expect(indexRes.status).toBe(200);
        expect(Array.isArray(indexRes.body.categories)).toBe(true);

        const updateRes = await request(app)
            .put(`/admin/marketplace/categories/${categoryId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ description: 'Updated description' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.description).toBe('Updated description');

        const deleteRes = await request(app)
            .delete(`/admin/marketplace/categories/${categoryId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.message).toMatch(/deleted successfully/i);

        const idx = createdMarketplaceCategoryIds.indexOf(categoryId);
        if (idx >= 0) createdMarketplaceCategoryIds.splice(idx, 1);
    });

    test('service categories CRUD works', async () => {
        const createRes = await request(app)
            .post('/admin/services/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: unique('service-cat'), description: 'Irrigation repair' });

        expect(createRes.status).toBe(201);
        expect(createRes.body.id).toBeDefined();
        const categoryId = createRes.body.id;
        createdServiceCategoryIds.push(categoryId);

        const indexRes = await request(app)
            .get('/admin/services/categories?page=1')
            .set('Authorization', `Bearer ${token}`);

        expect(indexRes.status).toBe(200);
        expect(Array.isArray(indexRes.body.categories)).toBe(true);

        const updateRes = await request(app)
            .put(`/admin/services/categories/${categoryId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ description: 'Updated service description' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.description).toBe('Updated service description');

        const deleteRes = await request(app)
            .delete(`/admin/services/categories/${categoryId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.message).toMatch(/deleted successfully/i);

        const idx = createdServiceCategoryIds.indexOf(categoryId);
        if (idx >= 0) createdServiceCategoryIds.splice(idx, 1);
    });
});
