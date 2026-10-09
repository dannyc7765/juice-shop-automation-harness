import { test as base, type Page } from '@playwright/test';
import { ApiClient, type TestUser } from './api/ApiClient.js';

interface Fixtures {
  /** API helper bound to the configured baseURL. */
  api: ApiClient;
  /** A fresh user created through the API. Every test gets its own, so tests never share state. */
  user: TestUser;
  /** A page already authenticated as `user`. */
  authedPage: Page;
  /** Auto fixture: suppresses the welcome banner / cookie banner before any navigation. */
  suppressOverlays: void;
}

export const test = base.extend<Fixtures>({
  suppressOverlays: [
    async ({ context, baseURL }, use) => {
      const domain = new URL(baseURL ?? 'http://localhost:3000').hostname;
      await context.addCookies([
        { name: 'welcomebanner_status', value: 'dismiss', domain, path: '/' },
        { name: 'cookieconsent_status', value: 'dismiss', domain, path: '/' },
      ]);
      await use();
    },
    { auto: true },
  ],

  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  user: async ({ api }, use) => {
    await use(await api.createUser());
  },

  authedPage: async ({ page, context, user, baseURL }, use) => {
    const domain = new URL(baseURL ?? 'http://localhost:3000').hostname;
    await context.addCookies([{ name: 'token', value: user.token, domain, path: '/' }]);
    // Juice Shop reads the basket id from sessionStorage, which Playwright's storageState does not persist.
    await context.addInitScript(
      ({ token, bid }) => {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('bid', bid);
        window.sessionStorage.setItem('bid', bid);
      },
      { token: user.token, bid: user.bid },
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
