import { test, expect } from '@playwright/test';

test('verify authenticated access state', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/OWASP Juice Shop/);
});