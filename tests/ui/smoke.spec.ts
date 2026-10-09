import { test, expect } from '../../src/fixtures.js';

test('application loads and reports a version', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/OWASP Juice Shop/);

  const res = await request.get('/rest/admin/application-version');
  expect(res.ok()).toBeTruthy();
});
