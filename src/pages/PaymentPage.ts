import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

/** The "My Payment Options" step of checkout. Locators come from the page's accessibility snapshot. */
export class PaymentPage extends BasePage {
  readonly addCardToggle: Locator;
  readonly nameInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cardNumberError: Locator;
  readonly expiryMonth: Locator;
  readonly expiryYear: Locator;
  readonly submitCardButton: Locator;
  readonly proceedToReviewButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addCardToggle = page.getByRole('button', { name: /Add new card/ });
    this.nameInput = page.getByRole('textbox', { name: 'Name', exact: true });
    this.cardNumberInput = page.getByRole('spinbutton', { name: 'Card Number' });
    this.cardNumberError = page.getByText('Please enter a valid sixteen digit card number.');
    this.expiryMonth = page.getByRole('combobox', { name: 'Expiry Month' });
    this.expiryYear = page.getByRole('combobox', { name: 'Expiry Year' });
    this.submitCardButton = page.getByRole('button', { name: 'Submit' });
    this.proceedToReviewButton = page.getByRole('button', { name: 'Proceed to review' });
  }

  async openAddCardForm(): Promise<void> {
    await this.addCardToggle.click();
    await expect(this.addCardToggle).toHaveAttribute('aria-expanded', 'true');
  }
}
