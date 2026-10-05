import { test, expect } from '@playwright/test';
import { CatalogPage } from '../src/pages/CatalogPage.js';

test.describe('Catalog & Cart Flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.sessionStorage.setItem('bid', '1');
    });
  });

  test('search and add item to cart with bypassed auth', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    await catalog.searchProduct('Apple Juice');
    await catalog.addToCart('Apple Juice');

    // 1. Check if badge renders, otherwise navigate to basket for guaranteed verification
    const badge = catalog.getCartCountLocator();
    const badgeVisible = await badge.isVisible({ timeout: 3000 }).catch(() => false);

    if (badgeVisible) {
      await expect(badge).toHaveText(/^[1-9]\d*$/);
    } else {
      // Direct business verification: navigate to basket and verify line item exists
      await page.goto('/#/basket');
      await expect(page.locator('mat-table, table.mat-table')).toBeVisible({ timeout: 7000 });
      await expect(page.locator('mat-row, tr.mat-row').filter({ hasText: 'Apple Juice' })).toBeVisible({ timeout: 5000 });
    }
  });
});