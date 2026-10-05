import { Page, Locator } from '@playwright/test';
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
    await this.navigate('/#/search');
    await this.cleanOverlays();
  }

  private async cleanOverlays(): Promise<void> {
    // Force close any dialog or backdrop if Angular still managed to render it
    const dismissDialog = this.page.locator('button[aria-label="Close Welcome Banner"], mat-dialog-container button:has-text("Dismiss")');
    if (await dismissDialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      await dismissDialog.click();
    }

    // Force remove any leftover CDK overlay backdrop via the DOM
    await this.page.evaluate(() => {
      const backdrops = document.querySelectorAll('.cdk-overlay-backdrop');
      backdrops.forEach((b) => b.remove());
    });
  }

  async searchProduct(name: string): Promise<void> {
    await this.searchButton.click();
    const input = this.page.locator('#searchQuery input');
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(name);
    await input.press('Enter');
    await this.waitForNetworkIdle();
  }

  async addToCart(productName: string): Promise<void> {
    await this.cleanOverlays();

    const card = this.productCards.filter({ hasText: productName }).first();
    await card.waitFor({ state: 'visible', timeout: 5000 });

    const addButton = card.locator('button[aria-label*="Add to Basket"], button:has-text("Add to Basket")');
    await addButton.scrollIntoViewIfNeeded();

    // Listen for the basket update response concurrently with the click
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/BasketItems') && resp.status() < 400,
        { timeout: 10000 }
      ),
      addButton.dispatchEvent('click'),
    ]);

    if (!response.ok()) {
      throw new Error(`Basket API failed with status ${response.status()}`);
    }
  }

  async getCartCount(): Promise<number> {
    await this.cartBadge.waitFor({ state: 'visible', timeout: 7000 });
    const countText = await this.cartBadge.textContent();
    return parseInt(countText?.trim() || '0', 10);
  }
}