const bcrypt = require('bcrypt');
const request = require('supertest');
const { app } = require('../../src/app');
const { User, Role, Profile, MarketplaceProduct, UserPreference } = require('../../src/models');

function uniquePhone(prefix = '95') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function createUserWithRole(roleName) {
    const [role] = await Role.findOrCreate({ where: { name: roleName }, defaults: { name: roleName } });
    const phone = uniquePhone(roleName === 'farmer' ? '96' : '97');
    const password = 'Role@1234';

    const user = await User.create({
        name: `${roleName} tester`,
        email: `${roleName}-${Date.now()}@example.com`,
        phone,
        role_id: role.id,
        encrypted_password: await bcrypt.hash(password, 10),
        info: {},
    });

    await Profile.create({
        user_id: user.id,
        address: 'QA Address',
        profession_type: roleName,
    });

    if (roleName === 'farmer') {
        await UserPreference.create({
            user_id: user.id,
            saved_items: [],
            recent_items: [],
            notifications: [],
            farmer_onboarding: { completed: true, storeName: 'QA Farm Store' },
        });
    }

    const login = await request(app).post('/api/sign_in').send({ phone, password });
    if (!login.body?.user?.jwtToken) {
        throw new Error(`Unable to login test user: ${JSON.stringify(login.body)}`);
    }

    return { user, token: login.body.user.jwtToken };
}

describe('Marketplace role guards', () => {
    const cleanupUserIds = [];
    const cleanupProductIds = [];

    afterEach(async () => {
        if (cleanupProductIds.length) {
            await MarketplaceProduct.destroy({ where: { id: cleanupProductIds } });
            cleanupProductIds.length = 0;
        }

        if (cleanupUserIds.length) {
            await UserPreference.destroy({ where: { user_id: cleanupUserIds } });
            await Profile.destroy({ where: { user_id: cleanupUserIds } });
            await User.destroy({ where: { id: cleanupUserIds } });
            cleanupUserIds.length = 0;
        }
    });

    test('customer cannot create marketplace product', async () => {
        const { user, token } = await createUserWithRole('customer');
        cleanupUserIds.push(user.id);

        const res = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Maize', unit_price: 12.5, stock_quantity: 30, status: 'published' });

        expect(res.status).toBe(403);
        expect(String(res.body.errors?.[0] || res.body.errors || '')).toMatch(/forbidden/i);
    });

    test('farmer can create marketplace product', async () => {
        const { user, token } = await createUserWithRole('farmer');
        cleanupUserIds.push(user.id);

        const res = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Cassava', unit_price: 8.25, stock_quantity: 15, status: 'published' });

        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Cassava');
        expect(String(res.body.farmer_user_id)).toBe(String(user.id));
        cleanupProductIds.push(res.body.id);
    });

    test('farmer with pending seller status cannot publish product', async () => {
        const { user, token } = await createUserWithRole('farmer');
        cleanupUserIds.push(user.id);

        await UserPreference.update(
            { seller_status: 'pending' },
            { where: { user_id: user.id } },
        );

        const res = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Pepper', unit_price: 5.0, stock_quantity: 8, status: 'published' });

        expect(res.status).toBe(403);
        expect(String(res.body.errors || '')).toMatch(/approved sellers can publish/i);
    });
});
