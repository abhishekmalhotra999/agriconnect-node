const request = require('supertest');
const {
    app,
    createAdminUser,
    loginAdmin,
    cleanupUsers,
    cleanupCourses,
    unique,
} = require('../helpers/adminTestUtils');

describe('Admin Courses Upload and Remove Flags', () => {
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

    test('course create accepts valid image/video uploads and exposes paths', async () => {
        const title = unique('qa-upload-course');

        const createRes = await request(app)
            .post('/admin/courses')
            .set('Authorization', `Bearer ${token}`)
            .field('title', title)
            .field('description', '<p>Upload validation</p>')
            .field('lessons[0][title]', 'Upload Lesson')
            .field('lessons[0][content]', '<p>Upload lesson content</p>')
            .attach('thumbnail_image', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
                filename: 'thumb.jpg',
                contentType: 'image/jpeg',
            })
            .attach('course_preview', Buffer.from([0x00, 0x00, 0x00, 0x18]), {
                filename: 'preview.mp4',
                contentType: 'video/mp4',
            })
            .attach('lesson_asset_0', Buffer.from([0x00, 0x00, 0x00, 0x18]), {
                filename: 'lesson.mp4',
                contentType: 'video/mp4',
            })
            .attach('lesson_thumbnail_asset_0', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
                filename: 'lesson-thumb.jpg',
                contentType: 'image/jpeg',
            });

        expect(createRes.status).toBe(201);
        const courseId = createRes.body.course.id;
        createdCourseIds.push(courseId);

        const showRes = await request(app)
            .get(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(showRes.status).toBe(200);
        expect(showRes.body.thumbnail_image).toMatch(/^\/uploads\//);
        expect(showRes.body.course_preview).toMatch(/^\/uploads\//);
        expect(showRes.body.lessons[0].lesson_asset).toMatch(/^\/uploads\//);
        expect(showRes.body.lessons[0].thumbnail_asset).toMatch(/^\/uploads\//);
    });

    test('course update remove flags clear existing uploaded media', async () => {
        const title = unique('qa-remove-flags');

        const createRes = await request(app)
            .post('/admin/courses')
            .set('Authorization', `Bearer ${token}`)
            .field('title', title)
            .field('lessons[0][title]', 'Lesson for remove flags')
            .attach('thumbnail_image', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
                filename: 'thumb.jpg',
                contentType: 'image/jpeg',
            })
            .attach('course_preview', Buffer.from([0x00, 0x00, 0x00, 0x18]), {
                filename: 'preview.mp4',
                contentType: 'video/mp4',
            });

        expect(createRes.status).toBe(201);
        const courseId = createRes.body.course.id;
        createdCourseIds.push(courseId);

        const updateRes = await request(app)
            .put(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`)
            .field('remove_thumbnail_image', '1')
            .field('remove_preview', '1');

        expect(updateRes.status).toBe(200);

        const showRes = await request(app)
            .get(`/admin/courses/${courseId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(showRes.status).toBe(200);
        expect(showRes.body.thumbnail_image).toBeNull();
        expect(showRes.body.course_preview).toBeNull();
    });

    test('course create rejects invalid file type', async () => {
        const title = unique('qa-invalid-file');

        const res = await request(app)
            .post('/admin/courses')
            .set('Authorization', `Bearer ${token}`)
            .field('title', title)
            .attach('thumbnail_image', Buffer.from('not-an-image'), {
                filename: 'thumb.txt',
                contentType: 'text/plain',
            });

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).not.toBe(201);
    });
});
