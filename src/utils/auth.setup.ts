import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate via API and save storage state', async ({ request, page }) => {
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
    {
      name: 'welcomebanner_status',
      value: 'dismiss',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'cookieconsent_status',
      value: 'dismiss',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('http://localhost:3000/#/');
  await page.evaluate(
    ({ jwt, basketId }) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('bid', basketId);
      sessionStorage.setItem('bid', basketId);
      localStorage.setItem('welcomebanner_status', 'dismiss');
      localStorage.setItem('cookieconsent_status', 'dismiss');
    },
    { jwt: token, basketId: bid }
  );

  await page.context().storageState({ path: authFile });
});