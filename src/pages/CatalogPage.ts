import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class CatalogPage extends BasePage {
  readonly searchButton: Locator;
  readonly productCards: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.searchButton = this.getByRole('button', { name: 'Open search' });
    this.productCards = this.page.locator('mat-card');
    this.cartBadge = this.page.locator('button[routerlink="/basket"] .fa-layers-counter');
  }

  async goto(): Promise<void> {
    await this.navigate('/#/');
    await this.dismissModals();
  }

  async dismissModals(): Promise<void> {
    const welcomeDismiss = this.page.locator('button[aria-label="Close Welcome Banner"]');
    if (await welcomeDismiss.isVisible({ timeout: 1500 }).catch(() => false)) {
      await welcomeDismiss.click({ force: true });
    }

    const cookieDismiss = this.page.locator('a[aria-label="dismiss cookie message"]');
    if (await cookieDismiss.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cookieDismiss.click({ force: true });
    }

    const backdrop = this.page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
    }
  }

  async searchProduct(name: string): Promise<void> {
    await this.dismissModals();
    await this.searchButton.waitFor({ state: 'visible' });
    await this.searchButton.click();

    const input = this.page.locator('#searchQuery input');
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(name);
    await input.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async directSearch(query: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/rest/products/search') && resp.status() === 200,
        { timeout: 10000 }
      ),
      this.page.goto(`/#/search?q=${encodeURIComponent(query)}`),
    ]);
    await this.dismissModals();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async addToCart(productName: string): Promise<void> {
    await this.dismissModals();

    const card = this.productCards.filter({ hasText: productName }).first();
    await expect(card).toBeVisible({ timeout: 7000 });

    const addButton = card.locator('button[aria-label*="Add to Basket"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await expect(addButton).toBeEnabled({ timeout: 5000 });

    await addButton.scrollIntoViewIfNeeded();

    // Synchronize click with API completion so cart badge updates deterministically
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().toLowerCase().includes('/api/basketitems') && resp.status() < 400,
        { timeout: 10000 }
      ),
      addButton.click({ force: true }),
    ]);
  }

  async clickAddToBasket(productName: string): Promise<void> {
    await this.addToCart(productName);
  }

  async getCartCount(): Promise<number> {
    await expect(this.cartBadge).toBeVisible({ timeout: 7000 });
    await expect(this.cartBadge).not.toHaveText('0', { timeout: 5000 });
    const countText = await this.cartBadge.textContent();
    return parseInt(countText?.trim() || '0', 10);
  }
}