import { test, expect, type Page } from '@playwright/test'

const DEFAULT_PASSWORD = 'Demo@1234'

function uniquePhone() {
  const t = Date.now().toString()
  const r = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
  return `${t}${r}`
}

async function completeCustomerSignupViaOtp(page: Page, phone: string) {
  await page.goto('/otp')
  await page.locator('input').first().fill(phone)
  await page.getByRole('button', { name: 'Send OTP' }).click()
  await page.locator('input').nth(1).fill('1234')
  await page.getByRole('button', { name: /Verify & Continue/i }).click()
  await page.getByPlaceholder('Your name').fill('E2E UX User')
  await page.getByPlaceholder('Your email').fill(`e2e.ux.${phone}@example.com`)
  await page.getByPlaceholder('Your address').fill('Monrovia')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByPlaceholder('Create password').fill(DEFAULT_PASSWORD)
  await page.getByPlaceholder('Confirm password').fill(DEFAULT_PASSWORD)
  await page.getByRole('button', { name: 'Complete Signup' }).click()
  await expect(page).toHaveURL(/\/learn$/)
}

async function clearUxLocalState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('agri_saved_items')
    localStorage.removeItem('agri_recent_items')
    localStorage.removeItem('agri_notifications')
  })
}

test.describe('UX state persistence flows', () => {
  test('@critical recently viewed appears after visiting product details', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)
    await clearUxLocalState(page)

    await page.goto('/marketplace')
    const firstProductCard = page.locator('.course-card').first()
    await expect(firstProductCard).toBeVisible()
    await firstProductCard.click()

    await expect(page).toHaveURL(/\/marketplace\/\d+$/)
    const productTitle = (await page.locator('h1.h3').first().textContent())?.trim() || ''

    await page.goto('/learn')
    await expect(page.getByRole('heading', { name: /Recently viewed/i })).toBeVisible()
    if (productTitle) {
      await expect(page.getByText(productTitle, { exact: false }).first()).toBeVisible()
    }
  })

  test('@critical save action creates unread notification and opening panel marks it read', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)
    await clearUxLocalState(page)

    await page.goto('/marketplace')
    await page.locator('.course-card').first().click()
    await expect(page).toHaveURL(/\/marketplace\/\d+$/)

    await page.getByRole('button', { name: /^Save$/ }).first().click()
    await expect(page.getByRole('button', { name: /Saved/i }).first()).toBeVisible()

    const bellButton = page.locator('header.topbar button').first()
    await expect(page.locator('.notif-badge')).toBeVisible()

    await bellButton.click()
    await expect(page.getByText('Notifications')).toBeVisible()
    await expect(page.getByText(/Saved:/i).first()).toBeVisible()

    await expect(page.locator('.notif-badge')).toHaveCount(0)
  })
})
