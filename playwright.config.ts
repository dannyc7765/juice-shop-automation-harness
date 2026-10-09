import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries are only on in CI, and every retried-then-passed test is reported by FlakyTestReporter.
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 4,
  reporter: [
    ['list'],
    ['./src/reporters/FlakyTestReporter.ts', { outputFile: 'reports/flaky-tests.json' }],
    ['allure-playwright', { detail: true, outputFolder: 'allure-results', suiteTitle: true }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  expect: { timeout: 10_000 },
});
