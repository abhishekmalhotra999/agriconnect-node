import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@agriconnect.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin@1234';
const BACKEND_PORT = process.env.E2E_BACKEND_PORT || '3201';
const API_BASE = `http://127.0.0.1:${BACKEND_PORT}`;

function unique(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function uniquePhone(prefix = '99') {
    const digits = `${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(0, 10);
    return `${prefix}${digits.slice(0, 8)}`;
}

async function ensureRoleUser(page, roleName, profileFields = {}) {
    const phone = uniquePhone(roleName === 'farmer' ? '96' : roleName === 'technician' ? '97' : '95');
    const password = 'Role@1234';
    const email = `${roleName}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;

    const otpRes = await page.request.post(`${API_BASE}/api/get_otp`, {
        data: {
            phone,
            name: unique(`${roleName}-e2e`),
            accountType: roleName,
        },
    });
    expect(otpRes.status()).toBe(200);

    const signUpRes = await page.request.post(`${API_BASE}/api/sign_up`, {
        data: {
            phone,
            email,
            password,
            confirmPassword: password,
            address: 'E2E Address',
            yearsOfExperience: profileFields.yearsOfExperience || '5',
            farmSize: profileFields.farmSize || '8 acres',
            farmingType: profileFields.farmingType || 'Crop Farming',
            technicianType: profileFields.technicianType || 'Irrigation Specialist',
        },
    });
    expect(signUpRes.status()).toBe(200);

    const signInRes = await page.request.post(`${API_BASE}/api/sign_in`, {
        data: { phone, password },
    });
    expect(signInRes.status()).toBe(200);

    const signInJson = await signInRes.json();
    const token = signInJson?.user?.jwtToken;
    expect(token).toBeTruthy();

    if (roleName === 'farmer') {
        const onboardingRes = await page.request.put(`${API_BASE}/api/users/preferences`, {
            headers: { Authorization: `Bearer ${token}` },
            data: {
                farmerOnboarding: {
                    completed: true,
                    completedAt: Date.now(),
                    storeName: 'E2E Farmer Store',
                    serviceArea: 'Montserrado',
                    contactPhone: phone,
                    contactEmail: email,
                    businessType: 'General Produce',
                },
            },
        });
        expect(onboardingRes.status()).toBe(200);
    }

    return { token, user: signInJson.user };
}

async function seedMarketplaceProduct(page, farmerToken, title) {
    const res = await page.request.post(`${API_BASE}/api/marketplace/products`, {
        headers: { Authorization: `Bearer ${farmerToken}` },
        data: {
            title,
            description: 'E2E marketplace product seeded for admin review',
            unit_price: 55.5,
            stock_quantity: 14,
            status: 'published',
        },
    });
    expect(res.status()).toBe(201);
    return res.json();
}

async function seedServiceListing(page, technicianToken, title) {
    const res = await page.request.post(`${API_BASE}/api/services/listings`, {
        headers: { Authorization: `Bearer ${technicianToken}` },
        data: {
            title,
            description: 'E2E service listing seeded for admin review',
            service_area: 'E2E Area',
            is_active: true,
        },
    });
    expect(res.status()).toBe(201);
    return res.json();
}

async function seedServiceRequest(page, customerToken, listingId) {
    const res = await page.request.post(`${API_BASE}/api/services/requests`, {
        headers: { Authorization: `Bearer ${customerToken}` },
        data: {
            service_listing_id: listingId,
            requester_name: 'Admin E2E Customer',
            requester_phone: '990009999',
            requester_email: 'admin.e2e.customer@example.com',
            message: unique('Need on-site service'),
        },
    });
    expect(res.status()).toBe(201);
    return res.json();
}

async function login(page) {
    await page.goto('/login');
    await expect(page.getByText('AgriConnect Admin')).toBeVisible();
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

async function fillQuillEditor(page, index, text) {
    const editor = page.locator('.ql-editor[contenteditable="true"]').nth(index);
    await editor.click();
    await editor.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await editor.type(text);
}

test.describe('Admin panel E2E smoke', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('login plus course CRUD flow', async ({ page }) => {
        const title = unique('E2E Course');
        const subtitle = unique('E2E Subtitle');
        const updatedSubtitle = `${subtitle} updated`;
        const courseDescription = unique('E2E course description');
        const updatedLessonContent = unique('Updated lesson content');

        await page.goto('/courses/new');
        await expect(page.getByRole('heading', { name: 'New Course' })).toBeVisible();

        await page.locator('div:has(> label.form-label:has-text("Title *")) input').first().fill(title);
        await page.locator('div:has(> label.form-label:has-text("Subtitle")) input').first().fill(subtitle);
        await page.locator('div:has(> label.form-label:has-text("Price")) input').first().fill('99');
        await page.locator('div:has(> label.form-label:has-text("Duration")) input').first().fill('2 Hour');

        await fillQuillEditor(page, 0, courseDescription);

        const lessonTitleInputs = page.locator('div:has(> label.form-label.small:has-text("Title *")) input');
        await lessonTitleInputs.nth(0).fill('Lesson One');

        await page.getByRole('button', { name: '+ Add Lesson' }).click();
        await lessonTitleInputs.nth(1).fill('Lesson Two');

        await page.getByRole('button', { name: 'Save Course' }).click();
        await expect(page).toHaveURL(/\/courses$/);

        const createdRow = page.locator('tbody tr', { hasText: title }).first();
        await expect(createdRow).toBeVisible();

        await createdRow.getByRole('button', { name: 'View' }).click();
        await expect(page).toHaveURL(/\/courses\/\d+$/);
        await expect(page.getByRole('heading', { name: title })).toBeVisible();
        await expect(page.locator('.card.shadow-sm.mb-4').first()).toContainText(subtitle);

        await page.getByRole('link', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/courses\/\d+\/edit$/);

        await page.locator('div:has(> label.form-label:has-text("Subtitle")) input').first().fill(updatedSubtitle);

        // First lesson editor appears after course description editor.
        await fillQuillEditor(page, 1, updatedLessonContent);

        await page.getByRole('button', { name: 'Save Course' }).click();
        await expect(page).toHaveURL(/\/courses$/);

        const updatedRow = page.locator('tbody tr', { hasText: title }).first();
        await updatedRow.getByRole('button', { name: 'View' }).click();
        await expect(page.locator('.card.shadow-sm.mb-4').first()).toContainText(updatedSubtitle);
        await expect(page.locator('div.card.shadow-sm.mb-3').first()).toContainText(updatedLessonContent);

        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: 'Delete' }).click();
        await expect(page).toHaveURL(/\/courses$/);

        await expect(page.locator('tbody tr', { hasText: title })).toHaveCount(0);
    });

    test('privacy policy CRUD flow', async ({ page }) => {
        const policyText = unique('E2E privacy policy');
        const updatedPolicyText = `${policyText} updated`;

        await page.goto('/privacy-policies/new');
        await expect(page.getByRole('heading', { name: 'New Privacy Policy' })).toBeVisible();

        await fillQuillEditor(page, 0, policyText);
        await page.getByRole('button', { name: 'Save Policy' }).click();
        await expect(page).toHaveURL(/\/privacy-policies$/);

        const createdCard = page.locator('.card', { hasText: policyText }).first();
        await expect(createdCard).toBeVisible();
        await createdCard.getByRole('button', { name: 'View' }).click();

        await expect(page).toHaveURL(/\/privacy-policies\/\d+$/);
        await expect(page.locator('.ql-editor')).toContainText(policyText);

        await page.getByRole('link', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/privacy-policies\/\d+\/edit$/);

        await fillQuillEditor(page, 0, updatedPolicyText);
        await page.getByRole('button', { name: 'Update Policy' }).click();
        await expect(page).toHaveURL(/\/privacy-policies$/);

        const updatedCard = page.locator('.card', { hasText: updatedPolicyText }).first();
        await expect(updatedCard).toBeVisible();
        await updatedCard.getByRole('button', { name: 'View' }).click();

        await expect(page.locator('.ql-editor')).toContainText(updatedPolicyText);

        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: 'Delete' }).click();
        await expect(page).toHaveURL(/\/privacy-policies$/);

        await expect(page.locator('.card', { hasText: updatedPolicyText })).toHaveCount(0);
    });

    test('marketplace and services admin management flow', async ({ page }) => {
        const marketplaceCategory = unique('E2E Market Cat');
        const marketplaceCategoryUpdated = `${marketplaceCategory} Updated`;
        const serviceCategory = unique('E2E Service Cat');
        const serviceCategoryUpdated = `${serviceCategory} Updated`;
        const productTitle = unique('E2E Vendor Product');
        const serviceTitle = unique('E2E Technician Service');

        const { token: farmerToken } = await ensureRoleUser(page, 'farmer', {
            farmSize: '10 acres',
            farmingType: 'Crop Farming',
            yearsOfExperience: '7',
        });
        const { token: technicianToken } = await ensureRoleUser(page, 'technician', {
            yearsOfExperience: '6',
            technicianType: 'Solar Technician',
        });
        const { token: customerToken } = await ensureRoleUser(page, 'customer');

        const seededProduct = await seedMarketplaceProduct(page, farmerToken, productTitle);
        const seededService = await seedServiceListing(page, technicianToken, serviceTitle);
        const seededRequest = await seedServiceRequest(page, customerToken, seededService.id);

        await page.goto('/marketplace/categories');
        await expect(page.getByRole('heading', { name: 'Marketplace Categories' })).toBeVisible();

        const marketplaceForm = page.locator('form.card').first();
        await marketplaceForm.locator('input.form-control').nth(0).fill(marketplaceCategory);
        await marketplaceForm.locator('input.form-control').nth(1).fill('E2E marketplace category description');
        await marketplaceForm.getByRole('button', { name: 'Add' }).click();

        const createdMarketRow = page.locator('tbody tr', { hasText: marketplaceCategory }).first();
        await expect(createdMarketRow).toBeVisible();
        await createdMarketRow.getByRole('button', { name: 'Edit' }).click();
        await marketplaceForm.locator('input.form-control').nth(0).fill(marketplaceCategoryUpdated);
        await marketplaceForm.getByRole('button', { name: 'Update' }).click();
        await expect(page.locator('tbody tr', { hasText: marketplaceCategoryUpdated }).first()).toBeVisible();

        await page.goto('/marketplace/products');
        await expect(page.getByRole('heading', { name: 'Marketplace Products' })).toBeVisible();
        const productRows = page.locator('tbody tr');
        await expect(productRows.first()).toBeVisible();
        const seededProductRow = page.locator('tbody tr', { hasText: String(seededProduct.id) }).first();
        const productRow = (await seededProductRow.count()) > 0 ? seededProductRow : productRows.first();
        await expect(productRow).toBeVisible();
        await productRow.locator('select').first().selectOption('archived');
        await expect(productRow.locator('select').first()).toHaveValue('archived');

        await page.goto('/services/categories');
        await expect(page.getByRole('heading', { name: 'Service Categories' })).toBeVisible();

        const serviceForm = page.locator('form.card').first();
        await serviceForm.locator('input.form-control').nth(0).fill(serviceCategory);
        await serviceForm.locator('input.form-control').nth(1).fill('E2E service category description');
        await serviceForm.getByRole('button', { name: 'Add' }).click();

        const createdServiceRow = page.locator('tbody tr', { hasText: serviceCategory }).first();
        await expect(createdServiceRow).toBeVisible();
        await createdServiceRow.getByRole('button', { name: 'Edit' }).click();
        await serviceForm.locator('input.form-control').nth(0).fill(serviceCategoryUpdated);
        await serviceForm.getByRole('button', { name: 'Update' }).click();
        await expect(page.locator('tbody tr', { hasText: serviceCategoryUpdated }).first()).toBeVisible();

        await page.goto('/services/listings');
        await expect(page.getByRole('heading', { name: 'Service Listings' })).toBeVisible();
        const listingRows = page.locator('tbody tr');
        await expect(listingRows.first()).toBeVisible();
        const seededServiceRow = page.locator('tbody tr', { hasText: String(seededService.id) }).first();
        const listingRow = (await seededServiceRow.count()) > 0 ? seededServiceRow : listingRows.first();
        await expect(listingRow).toBeVisible();

        const activeToggle = listingRow.getByRole('button', { name: /Active|Inactive/ }).first();
        await expect(activeToggle).toHaveText('Active');
        await activeToggle.click();
        await expect(listingRow.getByRole('button', { name: /Active|Inactive/ }).first()).toHaveText('Inactive');
        await listingRow.getByRole('button', { name: /Active|Inactive/ }).first().click();
        await expect(listingRow.getByRole('button', { name: /Active|Inactive/ }).first()).toHaveText('Active');

        await page.goto('/services/requests');
        await expect(page.getByRole('heading', { name: 'Service Requests' })).toBeVisible();
        const requestRows = page.locator('tbody tr');
        await expect(requestRows.first()).toBeVisible();
        const seededRequestRow = page.locator('tbody tr', { hasText: String(seededRequest.id) }).first();
        const requestRow = (await seededRequestRow.count()) > 0 ? seededRequestRow : requestRows.first();
        await expect(requestRow).toBeVisible();
        await requestRow.locator('select').first().selectOption('resolved');
        await expect(requestRow.locator('select').first()).toHaveValue('resolved');

        await page.goto('/marketplace/categories');
        page.once('dialog', (dialog) => dialog.accept());
        await page.locator('tbody tr', { hasText: marketplaceCategoryUpdated }).first().getByRole('button', { name: 'Delete' }).click();
        await expect(page.locator('tbody tr', { hasText: marketplaceCategoryUpdated })).toHaveCount(0);

        await page.goto('/services/categories');
        page.once('dialog', (dialog) => dialog.accept());
        await page.locator('tbody tr', { hasText: serviceCategoryUpdated }).first().getByRole('button', { name: 'Delete' }).click();
        await expect(page.locator('tbody tr', { hasText: serviceCategoryUpdated })).toHaveCount(0);
    });
});
