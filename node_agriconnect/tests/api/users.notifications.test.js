const bcrypt = require('bcrypt');
const request = require('supertest');
const { app } = require('../../src/app');
const { User, Role, Profile, UserPreference } = require('../../src/models');

function uniquePhone(prefix = '99') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

describe('User Preferences Notification Read State API', () => {
    const cleanupUserIds = [];

    afterEach(async () => {
        if (cleanupUserIds.length === 0) return;
        await UserPreference.destroy({ where: { user_id: cleanupUserIds } });
        await Profile.destroy({ where: { user_id: cleanupUserIds } });
        await User.destroy({ where: { id: cleanupUserIds } });
        cleanupUserIds.length = 0;
    });

    async function createAndLoginUser() {
        const [role] = await Role.findOrCreate({ where: { name: 'user' }, defaults: { name: 'user' } });
        const phone = uniquePhone();
        const password = 'User@1234';

        const user = await User.create({
            name: 'Notification Tester',
            email: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`,
            phone,
            role_id: role.id,
            encrypted_password: await bcrypt.hash(password, 10),
            info: {},
        });

        cleanupUserIds.push(user.id);

        await Profile.create({
            user_id: user.id,
            address: 'QA Lane',
            profession_type: 'Customer',
        });

        await UserPreference.create({
            user_id: user.id,
            saved_items: [],
            recent_items: [],
            notifications: [
                {
                    id: 'qa-notif-1',
                    title: 'Welcome',
                    message: 'Welcome to AgriConnect',
                    read: false,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                },
            ],
            farmer_onboarding: { completed: false },
            seller_status: 'approved',
            seller_status_reason: null,
        });

        const login = await request(app).post('/api/sign_in').send({ phone, password });
        if (!login.body?.user?.jwtToken) {
            throw new Error(`Unable to login test user: ${JSON.stringify(login.body)}`);
        }

        return { user, token: login.body.user.jwtToken };
    }

    test('PATCH /api/users/preferences/notifications/:notificationId marks notification as read', async () => {
        const { token, user } = await createAndLoginUser();

        const res = await request(app)
            .patch('/api/users/preferences/notifications/qa-notif-1')
            .set('Authorization', `Bearer ${token}`)
            .send({ read: true });

        expect(res.status).toBe(200);
        expect(res.body.notification).toBeTruthy();
        expect(res.body.notification.read).toBe(true);
        expect(res.body.notification.isRead).toBe(true);

        const pref = await UserPreference.findOne({ where: { user_id: user.id } });
        const item = (pref.notifications || []).find((n) => String(n.id) === 'qa-notif-1');
        expect(item).toBeTruthy();
        expect(item.read).toBe(true);
        expect(item.isRead).toBe(true);
    });

    test('PATCH /api/users/preferences/notifications/:notificationId validates read boolean', async () => {
        const { token } = await createAndLoginUser();

        const res = await request(app)
            .patch('/api/users/preferences/notifications/qa-notif-1')
            .set('Authorization', `Bearer ${token}`)
            .send({ read: 'yes' });

        expect(res.status).toBe(422);
        expect(String(res.body.errors || '')).toMatch(/read must be true or false/i);
    });

    test('PATCH /api/users/preferences/notifications/:notificationId returns 404 for missing notification', async () => {
        const { token } = await createAndLoginUser();

        const res = await request(app)
            .patch('/api/users/preferences/notifications/missing-id')
            .set('Authorization', `Bearer ${token}`)
            .send({ read: true });

        expect(res.status).toBe(404);
        expect(String(res.body.errors || '')).toMatch(/not found/i);
    });
});
