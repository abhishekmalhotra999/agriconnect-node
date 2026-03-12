const bcrypt = require('bcrypt');
const request = require('supertest');
const { app } = require('../../src/app');
const { Role, User, Profile, Lesson, Course, PrivacyPolicy } = require('../../src/models');

function unique(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function ensureRole(name) {
    const [role] = await Role.findOrCreate({ where: { name }, defaults: { name } });
    return role;
}

async function createAdminUser() {
    const adminRole = await ensureRole('admin');
    const password = 'Admin@1234';
    const email = `${unique('qa-admin')}@example.com`;
    const encrypted_password = await bcrypt.hash(password, 10);

    const user = await User.create({
        name: 'QA Admin',
        email,
        phone: unique('555'),
        role_id: adminRole.id,
        encrypted_password,
        info: {},
    });

    return { user, password };
}

async function createNonAdminUser() {
    const userRole = await ensureRole('user');
    const password = 'User@1234';
    const email = `${unique('qa-user')}@example.com`;
    const encrypted_password = await bcrypt.hash(password, 10);

    const user = await User.create({
        name: 'QA User',
        email,
        phone: unique('556'),
        role_id: userRole.id,
        encrypted_password,
        info: {},
    });

    return { user, password };
}

async function loginAdmin(email, password) {
    const res = await request(app)
        .post('/admin/login')
        .send({ email, password });

    if (res.status !== 200 || !res.body.token) {
        throw new Error(`Admin login failed in test setup: ${res.status} ${JSON.stringify(res.body)}`);
    }

    return res.body.token;
}

async function cleanupUsers(ids) {
    if (!ids.length) return;
    await Profile.destroy({ where: { user_id: ids } });
    await User.destroy({ where: { id: ids } });
}

async function cleanupCourses(ids) {
    if (!ids.length) return;
    await Lesson.destroy({ where: { course_id: ids } });
    await Course.destroy({ where: { id: ids } });
}

async function cleanupPolicies(ids) {
    if (!ids.length) return;
    await PrivacyPolicy.destroy({ where: { id: ids } });
}

module.exports = {
    app,
    unique,
    createAdminUser,
    createNonAdminUser,
    loginAdmin,
    cleanupUsers,
    cleanupCourses,
    cleanupPolicies,
};
