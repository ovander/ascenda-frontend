import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace:   'on-first-retry',
    // Give Vue time to settle after navigation
    navigationTimeout: 15_000,
    actionTimeout:     10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Always build first so tests run against the latest source.
    // Uses vite build directly (skips vue-tsc) so pre-existing type errors in
    // unrelated files don't block the test run.
    // reuseExistingServer is intentionally false to prevent stale-build issues.
    command:             'npx vite build && npm run preview',
    url:                 'http://localhost:4173',
    reuseExistingServer: false,
    timeout:             120_000,
    stdout:              'ignore',
    stderr:              'pipe',
  },
})
