import { test, expect, type Page } from '@playwright/test'

const DEFAULT_PASSWORD = 'Demo@1234'

function uniquePhone() {
  const t = Date.now().toString()
  const r = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
  return `${t}${r}`
}

async function sendOtp(page: Page, phone: string) {
  await page.goto('/otp')
  await page.locator('select').first().selectOption('customer')
  await page.getByLabel('Phone Number').fill(phone)
  await page.getByRole('button', { name: 'Send OTP' }).click()
  await expect(page.getByText('OTP Code')).toBeVisible()
}

async function completeSignup(page: Page, phone: string, accountType: 'customer' | 'farmer' | 'technician' = 'customer', password = DEFAULT_PASSWORD) {
  await page.goto('/otp')
  await page.locator('select').first().selectOption(accountType)
  await page.getByLabel('Phone Number').fill(phone)
  await page.getByRole('button', { name: 'Send OTP' }).click()
  await page.getByLabel('OTP Code').fill('1234')
  await page.getByRole('button', { name: /Verify & Continue/i }).click()

  await page.goto('/signup')
  await page.getByPlaceholder('Your name').fill(`E2E ${accountType}`)
  await page.getByPlaceholder('Your email').fill(`e2e.${accountType}.${phone}@example.com`)
  await page.getByPlaceholder('Your address').fill('Monrovia')
  await page.getByRole('button', { name: 'Continue' }).click()

  if (accountType === 'farmer') {
    await page.getByPlaceholder('e.g. 5 acres').fill('3 acres')
    await page.getByPlaceholder('e.g. 6').fill('2')
    await page.getByPlaceholder('e.g. Rice Farming').fill('Rice Farming')
  }

  if (accountType === 'technician') {
    await page.getByPlaceholder('e.g. 4').fill('5')
    await page.getByPlaceholder('e.g. Irrigation Systems').fill('Irrigation Systems')
  }

  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByPlaceholder('Create password').fill(password)
  await page.getByPlaceholder('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Complete Signup' }).click()

  if (accountType === 'farmer') {
    await expect(page).toHaveURL(/\/onboarding\/farmer$/)
    return
  }

  if (accountType === 'technician') {
    await expect(page).toHaveURL(/\/services$/)
    return
  }

  await expect(page).toHaveURL(/\/learn$/)
}

async function loginWithPassword(page: Page, identifier: string, password: string, expected: RegExp) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter phone number or email').fill(identifier)
  await page.getByPlaceholder('Enter password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(expected)
}

test.describe('Auth critical journeys', () => {
  test('@critical route guards redirect correctly', async ({ page }) => {
    await page.goto('/learn')
    await expect(page).toHaveURL(/\/$/)

    const phone = uniquePhone()
    await completeSignup(page, phone)
    await expect(page).toHaveURL(/\/learn$/)

    await page.goto('/login')
    await expect(page).toHaveURL(/\/learn$/)
  })

  test('@critical OTP signup then password login works', async ({ page }) => {
    const phone = uniquePhone()
    await completeSignup(page, phone)

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/$/)

    await loginWithPassword(page, phone, DEFAULT_PASSWORD, /\/learn$/)

    await expect(page).toHaveURL(/\/learn$/)
    await expect(page.locator('p.small', { hasText: 'Learn today' }).first()).toBeVisible()
  })

  test('@critical forgot and reset password then login with new password', async ({ page }) => {
    const phone = uniquePhone()
    const newPassword = 'NewPass@1234'

    await completeSignup(page, phone)

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/$/)

    await page.goto('/forgot-password')
    await page.locator('input').first().fill(phone)
    await page.getByRole('button', { name: 'Send Reset OTP' }).click()
    await expect(page.getByText(/OTP has been sent if the number exists/i)).toBeVisible()

    await page.goto('/reset-password')
    await page.locator('input').nth(0).fill(phone)
    await page.locator('input').nth(1).fill('1234')
    await page.locator('input').nth(2).fill(newPassword)
    await page.locator('input').nth(3).fill(newPassword)
    await page.getByRole('button', { name: 'Reset Password' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await loginWithPassword(page, phone, newPassword, /\/learn$/)

    await expect(page).toHaveURL(/\/learn$/)
  })

  test('@critical role-based signup sets expected capabilities', async ({ page }) => {
    const farmerPhone = uniquePhone()
    const technicianPhone = uniquePhone()

    await completeSignup(page, farmerPhone, 'farmer')
    await page.getByLabel('Store Name').fill('Farmer Capability Store')
    await page.getByLabel('Service Area').fill('Bong')
    await page.getByLabel('Contact Phone').fill('0881234567')
    await page.getByRole('button', { name: 'Complete Store Setup' }).click()
    await expect(page).toHaveURL(/\/seller\/dashboard$/)

    await page.goto('/marketplace')
    await expect(page.getByRole('button', { name: 'Add Product' })).toBeVisible()
    await page.getByRole('button', { name: 'Logout' }).click()

    await completeSignup(page, technicianPhone, 'technician')
    await page.goto('/services')
    await expect(page.getByRole('button', { name: 'Add Service' })).toBeVisible()
  })
})
