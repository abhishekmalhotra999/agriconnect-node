# LMS Admin Panel Integration Checklist

This checklist validates admin frontend flows against Node.js admin APIs.

## 1. Environment Setup

1. Start backend:
```bash
cd /Users/evervent/Desktop/backend/node_agriconnect
npm run dev
```
2. Start admin panel:
```bash
cd /Users/evervent/Desktop/backend/node_agriconnect/admin-panel
npm run dev
```
3. Open `http://localhost:5173`.

## 2. Automated API Baseline

Run API suite before manual UI verification:
```bash
cd /Users/evervent/Desktop/backend/node_agriconnect
npm test
```
Expected: all admin test suites pass.

## 3. Login Flow

API: `POST /admin/login`

1. Open `/login`.
2. Submit empty form.
3. Verify browser validation blocks submit.
4. Enter invalid credentials and submit.
5. Verify error appears.
6. Enter valid admin credentials and submit.
7. Verify redirect to `/dashboard` and token stored in localStorage (`admin_token`).

## 4. Dashboard Flow

API: `GET /admin/dashboard`

1. After login, verify 3 cards are visible: courses/users/enrollments.
2. Verify values are numbers.
3. Refresh page and confirm values still load.
4. Remove `admin_token` from localStorage and refresh.
5. Verify redirect to `/login`.

## 5. Course List Flow

API: `GET /admin/courses?page=N`, `DELETE /admin/courses/:id`

1. Open `/courses`.
2. Verify table loads and pagination works.
3. Click to next page and verify URL/query behavior and list update.
4. Click delete on a course and cancel.
5. Verify no deletion occurs.
6. Delete a course and confirm.
7. Verify row disappears after refresh.

## 6. Course Create Flow

API: `POST /admin/courses` (multipart)

1. Open `/courses/new`.
2. Fill title, subtitle, description, price, duration.
3. Add two lessons with title + rich content.
4. Upload thumbnail image and optional preview file.
5. Upload lesson asset/thumbnail files.
6. Click Save.
7. Verify redirect to `/courses`.
8. Open newly created course and verify:
- course description renders
- lesson descriptions render
- uploaded files are accessible

## 7. Course Edit Flow

API: `GET /admin/courses/:id`, `PUT /admin/courses/:id`

1. Open `/courses/:id/edit`.
2. Update course description and lesson 1 content.
3. Mark lesson 2 as remove (`Remove` button).
4. Mark existing media remove checkboxes where needed.
5. Save.
6. Open `/courses/:id` and verify:
- long text wraps, no overflow to right
- updated lesson content persists
- removed lesson is no longer shown
- removed media is gone

## 8. Course Show Flow

API: `GET /admin/courses/:id`, `DELETE /admin/courses/:id`

1. Open `/courses/:id`.
2. Verify title, subtitle, price, duration, instructor, description.
3. Verify lessons count and details.
4. For lessons with no data, verify empty helper text appears.
5. Delete course from show page.
6. Verify redirect to `/courses` and removed record is not found.

## 9. Users List Flow

API: `GET /admin/users?page=N`

1. Open `/users`.
2. Verify list loads and pagination works.
3. Verify admin accounts are not displayed.
4. Verify profile columns display values when available.

## 10. Privacy Policies CRUD Flow

API: `GET /admin/privacy_policies?page=N`, `GET /admin/privacy_policies/:id`, `POST /admin/privacy_policies`, `PUT /admin/privacy_policies/:id`, `DELETE /admin/privacy_policies/:id`

1. Open `/privacy-policies`.
2. Create new policy with rich text.
3. Verify it appears in index and show page.
4. Edit policy content and save.
5. Verify updated HTML content in show page.
6. Delete policy and verify removal from index.

## 11. Authorization and Session Hard Checks

1. With active session, open any protected route directly (`/courses`, `/users`).
2. Verify it loads.
3. Remove token and refresh protected route.
4. Verify redirect to `/login`.
5. Login again, click logout.
6. Verify token/user removed from localStorage and login page shown.

## 12. Regression Smoke (Daily)

Run these in order:
1. Login success.
2. Dashboard numbers load.
3. Create course with one lesson and save.
4. Edit course lesson content and save.
5. Verify content appears in show page.
6. Delete course.
7. Create and delete privacy policy.
8. Open users list page.
