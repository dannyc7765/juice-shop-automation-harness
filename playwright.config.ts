import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  reporter: [['list'], ['allure-playwright']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
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