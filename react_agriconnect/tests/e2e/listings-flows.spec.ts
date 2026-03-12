import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

type RoleType = 'customer' | 'farmer' | 'technician'

const API_BASE = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT || '3301'}`
const TEST_UPLOAD_IMAGE = fileURLToPath(new URL('../../../node_agriconnect/uploads/random_images/images.jpeg', import.meta.url))
const TEST_UPLOAD_IMAGE_2 = fileURLToPath(new URL('../../../node_agriconnect/uploads/random_images/images (1).jpeg', import.meta.url))
const DEFAULT_PASSWORD = 'Demo@1234'

function uniquePhone() {
  const t = Date.now().toString()
  const r = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
  return `${t}${r}`
}

async function createRoleUser(request: APIRequestContext, role: RoleType, phone: string) {
  const otpRes = await request.post(`${API_BASE}/api/get_otp`, {
    data: {
      phone,
      name: `E2E ${role}`,
      accountType: role,
    },
  })
  expect(otpRes.ok(), await otpRes.text()).toBeTruthy()

  const signUpPayload: Record<string, string> = {
    phone,
    email: `e2e.${role}.${phone}@example.com`,
    password: DEFAULT_PASSWORD,
    confirmPassword: DEFAULT_PASSWORD,
    name: `E2E ${role}`,
    address: 'Monrovia',
    farmSize: '5 acres',
    yearsOfExperience: '4',
    professionType: role,
    farmingType: 'Rice Farming',
    technicianType: 'Irrigation Systems',
  }

  const signRes = await request.post(`${API_BASE}/api/sign_up`, {
    data: signUpPayload,
  })
  expect(signRes.ok(), await signRes.text()).toBeTruthy()
  const body = await signRes.json()
  expect(body.errors, JSON.stringify(body)).toBeFalsy()
}

async function loginWithPassword(page: Page, identifier: string, expectedUrl: RegExp) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter phone number or email').fill(identifier)
  await page.getByPlaceholder('Enter password').fill(DEFAULT_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(expectedUrl)
}

test.describe('Marketplace and services end-user flows', () => {
  test('@critical customer can review+save product and request service', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'customer', phone)
    await loginWithPassword(page, phone, /\/learn$/)

    await page.goto('/marketplace')
    const firstProductCard = page.locator('.course-card').first()
    await expect(firstProductCard).toBeVisible()
    await firstProductCard.click()

    await expect(page).toHaveURL(/\/marketplace\/\d+$/)
    const productTitle = await page.locator('h1.h3').first().textContent()
    await page.getByRole('button', { name: /^Save$/ }).first().click()
    await expect(page.getByRole('button', { name: /Saved/i }).first()).toBeVisible()

    const reviewComment = `Great product ${Date.now()}`
    await page.getByPlaceholder('Write a short review (optional)').fill(reviewComment)
    await page.getByRole('button', { name: 'Submit Review' }).click()
    await expect(page.getByText(reviewComment).first()).toBeVisible()

    await page.goto('/saved')
    await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible()
    if (productTitle) {
      await expect(page.getByText(productTitle, { exact: false }).first()).toBeVisible()
    }

    await page.goto('/services')
    const firstServiceCard = page.locator('.course-card').first()
    await expect(firstServiceCard).toBeVisible()
    await firstServiceCard.click()
    await expect(page).toHaveURL(/\/services\/\d+$/)

    await page.getByPlaceholder('Your name').first().fill('E2E Customer')
    await page.getByPlaceholder('Your phone').first().fill('980001234')
    await page.getByPlaceholder('Your email (optional)').first().fill(`customer.${phone}@example.com`)
    await page.getByPlaceholder('Describe your service need').first().fill('Need urgent support for irrigation line maintenance.')
    const requestSave = page.waitForResponse((res) => {
      return res.request().method() === 'POST' && res.url().includes('/api/services/requests')
    })
    await page.getByRole('button', { name: /Send Request/i }).first().click()
    const requestRes = await requestSave
    expect(requestRes.status()).toBe(201)

    await page.goto('/my-requests')
    await expect(page.getByRole('heading', { name: /My Service Requests/i })).toBeVisible()
    await expect(page.locator('.request-timeline').first()).toBeVisible()
  })

  test('@critical farmer can create product with uploaded images', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'farmer', phone)
    await loginWithPassword(page, phone, /\/onboarding\/farmer$/)
    await expect(page).toHaveURL(/\/onboarding\/farmer$/)

    await page.getByLabel('Store Name').fill('E2E Farm Store')
    await page.getByLabel('Service Area').fill('Montserrado')
    await page.getByLabel('Contact Phone').fill('099000111')
    await page.getByRole('button', { name: 'Complete Store Setup' }).click()
    await expect(page).toHaveURL(/\/seller\/dashboard$/)

    await page.goto('/marketplace')

    await page.getByRole('button', { name: 'Add Product' }).click()

    const title = `E2E Farmer Product ${Date.now()}`
    await page.getByPlaceholder('Product title').fill(title)
    await page.getByPlaceholder('Price').fill('99.99')
    await page.getByPlaceholder('Stock').fill('15')
    await page.getByPlaceholder('Product description').fill('Uploaded image product from e2e test.')

    await page.getByRole('button', { name: 'Upload file' }).first().click()
    await page.getByRole('button', { name: 'Upload files' }).first().click()

    const fileInputs = page.locator('input[type="file"]')
    await fileInputs.nth(0).setInputFiles(TEST_UPLOAD_IMAGE)
    await fileInputs.nth(1).setInputFiles([TEST_UPLOAD_IMAGE, TEST_UPLOAD_IMAGE_2])

    await page.getByRole('button', { name: 'Create Product' }).click()
    await expect(page.getByText(/Product created successfully/i)).toBeVisible()
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test('@critical farmer seller dashboard can edit and publish own product', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'farmer', phone)
    await loginWithPassword(page, phone, /\/onboarding\/farmer$/)

    await page.goto('/onboarding/farmer')
    await page.getByLabel('Store Name').fill('Seller Dashboard Farm')
    await page.getByLabel('Service Area').fill('Nimba')
    await page.getByLabel('Contact Phone').fill('099111222')
    await page.getByRole('button', { name: 'Complete Store Setup' }).click()
    await expect(page).toHaveURL(/\/seller\/dashboard$/)

    await page.goto('/marketplace')
    await page.getByRole('button', { name: 'Add Product' }).click()
    const createdTitle = `Seller Flow Product ${Date.now()}`
    await page.getByPlaceholder('Product title').fill(createdTitle)
    await page.getByPlaceholder('Price').fill('12.5')
    await page.getByPlaceholder('Stock').fill('10')
    await page.locator('select.form-select').nth(1).selectOption('draft')
    const createSave = page.waitForResponse((res) => {
      return res.request().method() === 'POST' && res.url().includes('/api/marketplace/products')
    })
    await page.getByRole('button', { name: 'Create Product' }).click()
    const createRes = await createSave
    expect(createRes.status()).toBe(201)
    const createdBody = await createRes.json()
    const productId = String(createdBody?.id || '')
    expect(productId).not.toBe('')
    await expect(page.getByText(/Product created successfully/i)).toBeVisible()

    await page.goto('/seller/dashboard')
    await expect(page.getByRole('heading', { name: 'Seller Dashboard' })).toBeVisible()
    await expect(page.getByText('6/6 complete')).toBeVisible()

    await page.goto('/seller/products')
    await expect(page.getByRole('heading', { name: 'My Products' })).toBeVisible()

    const row = page.getByTestId(`seller-product-row-${productId}`)
    await expect(row).toBeVisible()
    await page.getByTestId(`seller-edit-${productId}`).click()

    await page.getByTestId(`seller-edit-title-${productId}`).fill(`${createdTitle} Updated`)
    await page.getByTestId(`seller-edit-stock-${productId}`).fill('25')
    await page.getByTestId(`seller-edit-price-${productId}`).fill('45')
    await page.getByTestId(`seller-save-${productId}`).click()

    const updatedRow = page.locator('tbody tr', { hasText: `${createdTitle} Updated` }).first()
    await expect(updatedRow).toBeVisible()
    await page.getByTestId(`seller-publish-toggle-${productId}`).click()
    await expect(updatedRow.getByText('published')).toBeVisible()
  })

  test('@critical technician can create service with uploaded images', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'technician', phone)
    await loginWithPassword(page, phone, /\/services$/)

    await page.goto('/services')
    await page.getByRole('button', { name: 'Add Service' }).click()

    const title = `E2E Technician Service ${Date.now()}`
    await page.getByPlaceholder('Service title').fill(title)
    await page.getByPlaceholder('Service area').fill('Montserrado')
    await page.getByPlaceholder('Contact email').fill(`tech.${phone}@example.com`)
    await page.getByPlaceholder('Service description').fill('Uploaded image service listing from e2e test.')

    await page.getByRole('button', { name: 'Upload file' }).first().click()
    await page.getByRole('button', { name: 'Upload files' }).first().click()

    const fileInputs = page.locator('input[type="file"]')
    await fileInputs.nth(0).setInputFiles(TEST_UPLOAD_IMAGE)
    await fileInputs.nth(1).setInputFiles([TEST_UPLOAD_IMAGE, TEST_UPLOAD_IMAGE_2])

    await page.getByRole('button', { name: 'Create Service Listing' }).click()
    await expect(page.getByText(/Service listing created successfully/i)).toBeVisible()
    await expect(page.getByText(title).first()).toBeVisible()
  })
})
