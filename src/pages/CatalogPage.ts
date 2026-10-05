import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class CatalogPage extends BasePage {
  readonly searchTrigger: Locator;
  readonly searchInputField: Locator;
  readonly productCards: Locator;
  readonly cartButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.searchTrigger = page.locator('#searchQuery');
    this.searchInputField = page.locator('#searchQuery input, input.mat-input-element').first();
    this.productCards = page.locator('mat-grid-list mat-card, mat-card.mat-card');
    this.cartButton = page.locator('button[routerlink="/basket"], button[aria-label="Show the shopping cart"]').first();
    // Resilient locator: match any badge content on or inside the cart button, or with matbadge attribute
    this.cartBadge = page.locator('button[routerlink="/basket"] span[class*="badge"], button[aria-label*="cart"] span[class*="badge"], .mat-badge-content').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/#/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async searchProduct(name: string): Promise<void> {
    if (!(await this.searchInputField.isVisible())) {
      await this.searchTrigger.click();
    }

    await expect(this.searchInputField).toBeVisible({ timeout: 5000 });

    const searchResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/rest/products/search') && res.status() === 200
    );

    await this.searchInputField.fill(name);
    await this.searchInputField.press('Enter');

    await searchResponsePromise;
    await expect(
      this.productCards.filter({ hasText: name }).first()
    ).toBeVisible({ timeout: 7000 });
  }

  async addToCart(name: string): Promise<void> {
    const productCard = this.productCards.filter({ hasText: name }).first();
    await productCard.scrollIntoViewIfNeeded();

    const addToCartButton = productCard.locator('button[aria-label="Add to Basket"]');
    await expect(addToCartButton).toBeVisible({ timeout: 5000 });

    const basketResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/api/BasketItems/'),
      { timeout: 10000 }
    );

    await addToCartButton.click();
    const response = await basketResponsePromise;

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`[Basket Error] HTTP ${response.status()}: ${errorText}`);
    }
  }

  getCartCountLocator(): Locator {
    return this.cartBadge;
  }
}