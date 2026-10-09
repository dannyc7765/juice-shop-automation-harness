import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class BasketPage extends BasePage {
  readonly rows: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.locator('mat-row');
    this.checkoutButton = page.locator('#checkoutButton');
  }

  async goto(): Promise<void> {
    await this.navigate('/#/basket');
  }

  rowFor(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await expect(this.page).toHaveURL(/address\/select/);
  }
}
