import { test, expect } from '@playwright/test';
import { CatalogPage } from '../src/pages/CatalogPage.js';

test.describe('Catalog & Cart Flow', () => {
  test.beforeEach(async ({ context }) => {
    // 1. Kill both banners in browser cookies BEFORE any HTML is requested
    await context.addCookies([
      {
        name: 'cookieconsent_status',
        value: 'dismiss',
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
    ]);

    // 2. Pre-seed local and session storage before Angular initializes
    await context.addInitScript(() => {
      window.localStorage.setItem('welcomebanner_status', 'dismiss');
      window.sessionStorage.setItem('bid', '1');
    });
  });

  test('search and add item to cart with bypassed auth', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    await catalog.searchProduct('Apple Juice');
    await catalog.addToCart('Apple Juice');

    const count = await catalog.getCartCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});