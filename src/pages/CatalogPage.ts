import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class CatalogPage extends BasePage {
  readonly openSearchButton: Locator;
  readonly searchInput: Locator;
  readonly productCards: Locator;

  constructor(page: Page) {
    super(page);
    this.openSearchButton = page.getByRole('button', { name: 'Open search' });
    this.searchInput = page.locator('#searchQuery input');
    this.productCards = page.locator('mat-card');
  }

  async goto(): Promise<void> {
    await this.navigate('/#/');
  }

  productCard(name: string): Locator {
    return this.productCards.filter({ hasText: name }).first();
  }

  async search(term: string): Promise<void> {
    await this.openSearchButton.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await expect(this.page.getByText(`Search Results - ${term}`)).toBeVisible();
  }

  /** Clicks "Add to Basket" and waits for the POST that persists the item. */
  async addToBasket(name: string): Promise<void> {
    const addButton = this.productCard(name).locator('button[aria-label="Add to Basket"]');
    await expect(addButton).toBeVisible();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.url().includes('/api/BasketItems') && res.request().method() === 'POST',
      ),
      addButton.click(),
    ]);
    expect(response.status(), await response.text()).toBeLessThan(400);
  }
}
