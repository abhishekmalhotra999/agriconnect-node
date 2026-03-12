import { defineConfig, devices } from '@playwright/test'

const BACKEND_PORT = process.env.E2E_BACKEND_PORT || '3301'
const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '5176'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `PORT=${BACKEND_PORT} npm --prefix ../node_agriconnect run start`,
      url: `http://127.0.0.1:${BACKEND_PORT}/up`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `VITE_API_URL=http://127.0.0.1:${BACKEND_PORT} npm run dev -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
