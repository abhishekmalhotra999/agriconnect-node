const request = require('supertest');
const {
    app,
    createAdminUser,
    loginAdmin,
    cleanupUsers,
    cleanupPolicies,
    unique,
} = require('../helpers/adminTestUtils');

describe('Admin Privacy Policies API', () => {
    const createdUserIds = [];
    const createdPolicyIds = [];
    let token;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        token = await loginAdmin(admin.user.email, admin.password);
    });

    afterAll(async () => {
        await cleanupPolicies(createdPolicyIds);
        await cleanupUsers(createdUserIds);
    });

    test('POST /admin/privacy_policies validates required content', async () => {
        const res = await request(app)
            .post('/admin/privacy_policies')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(422);
    });

    test('privacy policy CRUD flow works', async () => {
        const initialContent = `<p>${unique('policy-content')}</p>`;

        const createRes = await request(app)
            .post('/admin/privacy_policies')
            .set('Authorization', `Bearer ${token}`)
            .send({ content: initialContent });

        expect(createRes.status).toBe(201);
        expect(createRes.body.id).toBeDefined();
        expect(createRes.body.content).toBe(initialContent);

        const policyId = createRes.body.id;
        createdPolicyIds.push(policyId);

        const indexRes = await request(app)
            .get('/admin/privacy_policies?page=1')
            .set('Authorization', `Bearer ${token}`);

        expect(indexRes.status).toBe(200);
        expect(Array.isArray(indexRes.body.privacy_policies)).toBe(true);

        const showRes = await request(app)
            .get(`/admin/privacy_policies/${policyId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(showRes.status).toBe(200);
        expect(String(showRes.body.id)).toBe(String(policyId));

        const updatedContent = `<p>${unique('policy-updated')}</p>`;
        const updateRes = await request(app)
            .put(`/admin/privacy_policies/${policyId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ content: updatedContent });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.content).toBe(updatedContent);

        const deleteRes = await request(app)
            .delete(`/admin/privacy_policies/${policyId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.message).toBe('Deleted successfully');

        // Remove from cleanup tracking because it was deleted successfully.
        const idx = createdPolicyIds.indexOf(policyId);
        if (idx >= 0) createdPolicyIds.splice(idx, 1);
    });
});
