import { test, expect } from '../../src/fixtures.js';
import { LoginPage } from '../../src/pages/LoginPage.js';

test.describe('Login (UI)', () => {
  test('registered user can log in', async ({ page, api }) => {
    const creds = await api.register();
    const login = new LoginPage(page);

    await login.goto();
    await login.login(creds.email, creds.password);

    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('token'))).toBeTruthy();
  });

  test('wrong password shows an error and does not authenticate', async ({ page, api }) => {
    const creds = await api.register();
    const login = new LoginPage(page);

    await login.goto();
    await login.login(creds.email, 'wrong-password');

    await expect(login.errorMessage).toContainText(/invalid email or password/i);
    expect(await page.evaluate(() => window.localStorage.getItem('token'))).toBeNull();
  });
});
