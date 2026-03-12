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
  await page.getByPlaceholder('Your name').fill('E2E LMS User')
  await page.getByPlaceholder('Your email').fill(`e2e.lms.${phone}@example.com`)
  await page.getByPlaceholder('Your address').fill('Monrovia')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByPlaceholder('Create password').fill(DEFAULT_PASSWORD)
  await page.getByPlaceholder('Confirm password').fill(DEFAULT_PASSWORD)
  await page.getByRole('button', { name: 'Complete Signup' }).click()
  await expect(page).toHaveURL(/\/learn$/)
}

async function loginWithPassword(page: Page, identifier: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter phone number or email').fill(identifier)
  await page.getByPlaceholder('Enter password').fill(DEFAULT_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/learn$/)
}

async function openFirstCourse(page: Page): Promise<boolean> {
  const openButtons = page.getByRole('link', { name: 'Open Course' })
  if (await openButtons.count()) {
    await openButtons.first().click()
    await expect(page).toHaveURL(/\/courses\/\d+$/)
    return true
  }

  await expect(page.getByTestId('empty-courses')).toBeVisible()
  return false
}

test.describe('LMS deep end-user flows', () => {
  test('@critical course progress persists after logout and relogin', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)

    const hasCourse = await openFirstCourse(page)
    if (!hasCourse) return

    const enrollButton = page.getByRole('button', { name: /Enroll|Enrolled/i })
    await expect(enrollButton).toBeVisible()
    if (await enrollButton.isEnabled()) {
      await enrollButton.click()
      await expect(page.getByText(/Enrollment successful|already enrolled/i)).toBeVisible()
    }

    const markButtons = page.getByRole('button', { name: 'Mark Complete' })
    if (await markButtons.count()) {
      const progressSave = page.waitForResponse(
        (response) => response.request().method() === 'PUT' && response.url().includes('/api/lesson_progresses/'),
      )
      await markButtons.first().click()
      const progressResponse = await progressSave
      expect(progressResponse.status()).toBe(200)
      await expect(page.getByRole('button', { name: 'Completed' }).first()).toBeDisabled()
    }

    await page.goto('/my-learning')
    await expect(page.getByRole('heading', { name: /My Learning/i })).toBeVisible()
    await expect(page.getByText(/lessons completed/i).first()).toBeVisible()

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/$/)

    await loginWithPassword(page, phone)
    const hasCourseAfterRelogin = await openFirstCourse(page)
    if (!hasCourseAfterRelogin) return

    await expect(page.getByTestId('course-progress')).toBeVisible()
    await expect(page.getByTestId('course-progress')).toContainText(/lessons completed/i)
  })

  test('@critical course save appears in saved page', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)

    const hasCourse = await openFirstCourse(page)
    if (!hasCourse) return

    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.getByRole('button', { name: 'Saved' }).first()).toBeVisible()

    await page.goto('/saved')
    await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible()
    await expect(page.getByText('Courses').first()).toBeVisible()

    const courseCards = page.locator('.card-body .small.text-muted.text-uppercase', { hasText: 'course' })
    await expect(courseCards.first()).toBeVisible()
  })
})
