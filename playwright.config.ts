import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: 1, // Single worker prevents cart mutations across simultaneous tests
  retries: 1, // Retries: 1 triggers quarantine on retry pass
  reporter: [
    ['list'],
    ['./src/reporters/QuarantineReporter.ts', { outputFile: 'flaky-tests.json' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: '.auth/user.json',
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
      },
      dependencies: ['setup'],
    },
  ],
});