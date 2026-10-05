import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate via API and save storage state', async ({ request, page }) => {
  // 1. Send login credentials straight to the server
  const response = await request.post('http://localhost:3000/rest/user/login', {
    data: {
      email: 'admin@juice-sh.op',
      password: 'admin123',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const token = body.authentication.token;
  const bid = String(body.authentication.bid);

  // 2. Set the cookie on localhost
  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // 3. Open the site once to attach localStorage variables to the origin
  await page.goto('http://localhost:3000/#/');
  await page.evaluate(({ jwt, basketId }) => {
    localStorage.setItem('token', jwt);
    localStorage.setItem('bid', basketId);
    sessionStorage.setItem('bid', basketId);
  }, { jwt: token, basketId: bid });

  // 4. Save this snapshot to .auth/user.json so future tests reuse it
  await page.context().storageState({ path: authFile });
});