const request = require('supertest');
const {
    app,
    createAdminUser,
    loginAdmin,
    cleanupUsers,
    cleanupCourses,
    unique,
} = require('../helpers/adminTestUtils');

describe('Admin Courses API', () => {
    const createdUserIds = [];
    const createdCourseIds = [];
    let token;

    beforeAll(async () => {
        const admin = await createAdminUser();
        createdUserIds.push(admin.user.id);
        token = await loginAdmin(admin.user.email, admin.password);
    });

    afterAll(async () => {
        await cleanupCourses(createdCourseIds);
        await cleanupUsers(createdUserIds);
    });

    test('POST/GET/PUT/DELETE /admin/courses full flow with lesson content', async () => {
        const title = unique('qa-course');

        const createRes = await request(app)
            .post('/admin/courses')
            .set('Authorization', `Bearer ${token}`)
            .field('title', title)
            .field('subtitle', 'QA Subtitle')
            .field('description', '<p>QA description</p>')
            .field('price', '10')
            .field('duration', '1 Hour')
            .field('lessons[0][title]', 'Lesson A')
            .field('lessons[0][content]', '<p>Content A</p>')
            .field('lessons[1][title]', 'Lesson B')
            .field('lessons[1][content]', '<p>Content B</p>');

        expect(createRes.status).toBe(201);
        expect(createRes.body.course).toBeDefined();

        const courseId = createRes.body.course.id;
        createdCourseIds.push(courseId);

        const showRes = await request(app)
            .get(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(showRes.status).toBe(200);
        expect(showRes.body.title).toBe(title);
        expect(Array.isArray(showRes.body.lessons)).toBe(true);
        expect(showRes.body.lessons.length).toBe(2);

        const lessonA = showRes.body.lessons.find(l => l.title === 'Lesson A');
        const lessonB = showRes.body.lessons.find(l => l.title === 'Lesson B');
        expect(lessonA).toBeDefined();
        expect(lessonB).toBeDefined();

        const updateRes = await request(app)
            .put(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`)
            .field('title', `${title} Updated`)
            .field('lessons[0][id]', lessonA.id)
            .field('lessons[0][title]', lessonA.title)
            .field('lessons[0][content]', '<p>Content A Updated</p>')
            .field('lessons[1][id]', lessonB.id)
            .field('lessons[1][title]', lessonB.title)
            .field('lessons[1][_destroy]', '1');

        expect(updateRes.status).toBe(200);

        const showAfterUpdate = await request(app)
            .get(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(showAfterUpdate.status).toBe(200);
        expect(showAfterUpdate.body.title).toBe(`${title} Updated`);
        expect(showAfterUpdate.body.lessons.length).toBe(1);
        expect(showAfterUpdate.body.lessons[0].content).toBe('<p>Content A Updated</p>');

        const deleteRes = await request(app)
            .delete(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.message).toBe('Course deleted successfully');

        const idx = createdCourseIds.indexOf(courseId);
        if (idx >= 0) createdCourseIds.splice(idx, 1);
    });
});
