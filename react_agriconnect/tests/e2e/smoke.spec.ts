import { test, expect } from '@playwright/test'

const DEFAULT_PASSWORD = 'Demo@1234'

function uniquePhone() {
  const t = Date.now().toString()
  const r = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
  return `${t}${r}`
}

async function completeCustomerSignupViaOtp(page: import('@playwright/test').Page, phone: string) {
  await page.goto('/otp')
  await page.locator('input').first().fill(phone)
  await page.getByRole('button', { name: 'Send OTP' }).click()
  await page.locator('input').nth(1).fill('1234')
  await page.getByRole('button', { name: /Verify & Continue/i }).click()
  await page.getByPlaceholder('Your name').fill('E2E Customer')
  await page.getByPlaceholder('Your email').fill(`e2e.customer.${phone}@example.com`)
  await page.getByPlaceholder('Your address').fill('Monrovia')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByPlaceholder('Create password').fill(DEFAULT_PASSWORD)
  await page.getByPlaceholder('Confirm password').fill(DEFAULT_PASSWORD)
  await page.getByRole('button', { name: 'Complete Signup' }).click()
  await expect(page).toHaveURL(/\/learn$/)
}

test.describe('React AgriConnect user smoke', () => {
  test('onboarding + OTP login + learn dashboard', async ({ page }) => {
    const phone = uniquePhone()

    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Welcome to AgriConnect Liberia/i })).toBeVisible()

    await page.getByRole('link', { name: 'Sign Up' }).click()
    await expect(page.getByRole('heading', { name: /Phone Verification/i })).toBeVisible()
    await completeCustomerSignupViaOtp(page, phone)
    await expect(page.locator('p.small', { hasText: 'Learn today' }).first()).toBeVisible()

    const grid = page.getByTestId('course-grid')
    const gridCount = await grid.count()
    if (gridCount > 0) {
      const openButtons = page.getByRole('link', { name: 'Open Course' })
      if (await openButtons.count()) {
        await openButtons.first().click()
        await expect(page).toHaveURL(/\/courses\/\d+$/)
        await expect(page.getByRole('heading', { level: 3 })).toBeVisible()
      }
    } else {
      await expect(page.getByTestId('empty-courses')).toBeVisible()
    }
  })

  test('protected nav pages render', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)

    await page.goto('/my-learning')
    await expect(page.getByRole('heading', { name: /My Learning/i })).toBeVisible()

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /Your Details/i })).toBeVisible()

    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible()
  })

  test('mark complete persists and progress is visible', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)

    const openButtons = page.getByRole('link', { name: 'Open Course' })
    await expect(openButtons.first()).toBeVisible()
    await openButtons.first().click()
    await expect(page).toHaveURL(/\/courses\/\d+$/)

    const enrollButton = page.getByRole('button', { name: /Enroll|Enrolled/i })
    await expect(enrollButton).toBeVisible()
    if (await enrollButton.isEnabled()) {
      await enrollButton.click()
    }

    const markButtons = page.getByRole('button', { name: 'Mark Complete' })
    await expect(markButtons.first()).toBeVisible()

    const progressSave = page.waitForResponse(
      (response) => response.request().method() === 'PUT' && response.url().includes('/api/lesson_progresses/'),
    )
    await markButtons.first().click()
    const progressResponse = await progressSave
    const progressBody = await progressResponse.json()
    expect(progressResponse.status(), JSON.stringify(progressBody)).toBe(200)
    expect(progressBody.success, JSON.stringify(progressBody)).toBeTruthy()

    const completedButtons = page.getByRole('button', { name: 'Completed' })
    await expect(completedButtons.first()).toBeVisible()
    await expect(completedButtons.first()).toBeDisabled()

    await page.reload()
    await expect(page.getByTestId('course-progress')).toBeVisible()
    await expect(page.getByTestId('course-progress')).toContainText(/1\s*\//)
    await expect(page.getByRole('button', { name: 'Completed' }).first()).toBeDisabled()

    await page.goto('/my-learning')
    await expect(page.getByRole('heading', { name: /My Learning/i })).toBeVisible()
    await expect(page.getByText(/lessons completed/i).first()).toBeVisible()
  })

  test('marketplace and services pages work for customer', async ({ page }) => {
    const phone = uniquePhone()
    await completeCustomerSignupViaOtp(page, phone)

    await page.goto('/marketplace')
    await expect(page.getByRole('heading', { name: /Marketplace/i })).toBeVisible()

    const marketplaceCards = page.locator('.course-card')
    const noProducts = page.getByText(/No products found/i)
    await Promise.race([
      marketplaceCards.first().waitFor({ state: 'visible', timeout: 10_000 }),
      noProducts.waitFor({ state: 'visible', timeout: 10_000 }),
    ]).catch(() => undefined)

    if (await marketplaceCards.count()) {
      await expect(marketplaceCards.first()).toBeVisible()

      // Some seeded products may not include an image. Validate image markup only when present.
      const marketplaceImages = page.locator('.course-card img.card-img-top')
      if (await marketplaceImages.count()) {
        await expect(marketplaceImages.first()).toBeVisible()
        await expect(marketplaceImages.first()).toHaveAttribute('src', /.+/)
      }
    } else {
      await expect(noProducts).toBeVisible()
    }

    await page.goto('/services')
    await expect(page.getByRole('heading', { name: /Technician Services/i })).toBeVisible()

    const noServices = page.getByText(/No services available\./i)

    await Promise.race([
      noServices.waitFor({ state: 'visible', timeout: 10_000 }),
      page.locator('.course-card').first().waitFor({ state: 'visible', timeout: 10_000 }),
    ]).catch(() => undefined)

    if (await noServices.isVisible()) {
      await expect(noServices).toBeVisible()
      return
    }

    const serviceImages = page.locator('.course-card img.card-img-top')
    if (await serviceImages.count()) {
      await expect(serviceImages.first()).toBeVisible()
      await expect(serviceImages.first()).toHaveAttribute('src', /.+/)
    }

    await page.locator('.course-card').first().click()
    await expect(page).toHaveURL(/\/services\/\d+$/)

    await page.getByPlaceholder('Your name').first().fill('E2E Customer')
    await page.getByPlaceholder('Your phone').first().fill('990001234')
    await page.getByPlaceholder('Your email (optional)').first().fill('e2e.customer@example.com')
    await page.getByPlaceholder('Describe your service need').first().fill('Need irrigation pump maintenance support.')

    await page.getByRole('button', { name: 'Send Request' }).first().click()
    await expect(page.getByText(/Service request submitted successfully/i)).toBeVisible()
  })
})
