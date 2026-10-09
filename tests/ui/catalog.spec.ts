import { test, expect } from '../../src/fixtures.js';
import { CatalogPage } from '../../src/pages/CatalogPage.js';
import { BasketPage } from '../../src/pages/BasketPage.js';

test.describe('Catalog & basket (UI)', () => {
  test('searching shows the matching product', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.search('Apple Juice');
    await expect(catalog.productCard('Apple Juice')).toBeVisible();
  });

  test('item added from the catalog shows up in the basket', async ({ authedPage }) => {
    const catalog = new CatalogPage(authedPage);
    const basket = new BasketPage(authedPage);

    await catalog.goto();
    await catalog.search('Apple Juice');
    await catalog.addToBasket('Apple Juice');

    await basket.goto();
    await expect(basket.rowFor('Apple Juice')).toHaveCount(1);
  });
});
