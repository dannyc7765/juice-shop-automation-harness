import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
  ['list'],
  ['./src/reporters/QuarantineReporter.ts'],
  [
    'allure-playwright',
    {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: true,
    },
  ],
],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /src\/utils\/auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /tests\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});