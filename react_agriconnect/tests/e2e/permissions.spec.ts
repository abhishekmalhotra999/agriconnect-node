import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

type RoleType = 'customer' | 'farmer' | 'technician'

const API_BASE = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT || '3301'}`
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

test.describe('Role-based frontend permissions', () => {
  test('@negative customer cannot access seller/provider create actions', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'customer', phone)
    await loginWithPassword(page, phone, /\/learn$/)

    await page.goto('/marketplace')
    await expect(page.getByRole('button', { name: 'Add Product' })).toHaveCount(0)

    await page.goto('/services')
    await expect(page.getByRole('button', { name: 'Add Service' })).toHaveCount(0)

    await page.goto('/seller/dashboard')
    await expect(page).toHaveURL(/\/learn$/)
  })

  test('@negative farmer cannot access technician create actions or customer requests page', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'farmer', phone)
    await loginWithPassword(page, phone, /\/onboarding\/farmer$/)

    await page.getByLabel('Store Name').fill('Permissions Farmer Setup')
    await page.getByLabel('Service Area').fill('Bong')
    await page.getByLabel('Contact Phone').fill('088000111')
    await page.getByRole('button', { name: 'Complete Store Setup' }).click()
    await expect(page).toHaveURL(/\/seller\/dashboard$/)

    await page.goto('/marketplace')
    await expect(page.getByRole('button', { name: 'Add Product' })).toBeVisible()

    await page.goto('/services')
    await expect(page.getByRole('button', { name: 'Add Service' })).toHaveCount(0)

    await page.goto('/my-requests')
    await expect(page.getByText(/Failed to load your requests|Forbidden/i)).toBeVisible()
  })

  test('@negative technician cannot access farmer create actions or customer requests page', async ({ page, request }) => {
    const phone = uniquePhone()
    await createRoleUser(request, 'technician', phone)
    await loginWithPassword(page, phone, /\/services$/)

    await page.goto('/services')
    await expect(page.getByRole('button', { name: 'Add Service' })).toBeVisible()

    await page.goto('/marketplace')
    await expect(page.getByRole('button', { name: 'Add Product' })).toHaveCount(0)

    await page.goto('/seller/dashboard')
    await expect(page).toHaveURL(/\/services$/)

    await page.goto('/my-requests')
    await expect(page.getByText(/Failed to load your requests|Forbidden/i)).toBeVisible()
  })
})
