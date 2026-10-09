import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export interface AddressPayload {
  country: string;
  name: string;
  mobileNum: string;
  zipCode: string;
  street: string;
  city: string;
  state: string;
}

export interface PaymentPayload {
  fullName: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
}

/**
 * Drives address -> delivery -> payment -> order summary.
 * Assumes a brand-new user (no saved addresses or cards), which the `user` fixture guarantees.
 */
export class CheckoutPage extends BasePage {
  private readonly nextButton: Locator;
  private readonly firstRadio: Locator;
  private readonly submitButton: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nextButton = page.locator('button.btn-next, button[aria-label*="Proceed"]').first();
    this.firstRadio = page.locator('mat-row mat-radio-button').first();
    this.submitButton = page.locator('#submitButton');
    this.placeOrderButton = page.getByRole('button', { name: 'Complete your purchase' });
  }

  private async selectFirstRadioAndContinue(): Promise<void> {
    await this.firstRadio.locator('label').first().click();
    await expect(this.nextButton).toBeEnabled();
    await this.nextButton.click();
  }

  async addAddress(address: AddressPayload): Promise<void> {
    await expect(this.page).toHaveURL(/address\/select/);
    await this.page.locator('button[aria-label*="Add a new address"]').click();

    await this.page.getByRole('textbox', { name: 'Country', exact: true }).fill(address.country);
    await this.page.getByRole('textbox', { name: 'Name', exact: true }).fill(address.name);
    await this.page.getByRole('spinbutton', { name: 'Mobile Number' }).fill(address.mobileNum);
    await this.page.getByRole('textbox', { name: 'ZIP Code', exact: true }).fill(address.zipCode);
    await this.page.getByRole('textbox', { name: 'Address', exact: true }).fill(address.street);
    await this.page.getByRole('textbox', { name: 'City', exact: true }).fill(address.city);
    await this.page.getByRole('textbox', { name: 'State', exact: true }).fill(address.state);

    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/Addresss') && r.status() === 201),
      this.submitButton.click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await this.selectFirstRadioAndContinue();
  }

  async chooseDelivery(): Promise<void> {
    await expect(this.page).toHaveURL(/delivery-method/);
    await expect(this.firstRadio).toBeVisible();
    await this.selectFirstRadioAndContinue();
  }

  async addCard(card: PaymentPayload): Promise<void> {
    await expect(this.page).toHaveURL(/payment\/shop/);
    await this.page
      .locator('mat-expansion-panel-header')
      .filter({ hasText: /add new card/i })
      .click();

    const panel = this.page.locator('mat-expansion-panel');
    await panel.locator('input[type="text"]').first().fill(card.fullName);
    await panel.locator('input[type="number"]').fill(card.cardNumber);
    await panel.locator('select').first().selectOption(card.expMonth);
    await panel.locator('select').nth(1).selectOption(card.expYear);

    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/Cards') && r.status() === 201),
      panel.locator('#submitButton').click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await this.selectFirstRadioAndContinue();
  }

  private async readSummaryCents(label: string): Promise<number> {
    const cell = this.page
      .getByRole('row', { name: new RegExp(`^${label}`) })
      .getByRole('cell')
      .last();
    const match = (await cell.innerText()).match(/\d+\.\d{2}/);
    if (!match) throw new Error(`No amount found in the "${label}" row`);
    return Math.round(parseFloat(match[0]) * 100);
  }

  /** Waits until the order summary is fully populated and its arithmetic is consistent. */
  async expectOrderSummary(expectedItemPrice: number): Promise<void> {
    await expect(this.placeOrderButton).toBeVisible();

    await expect
      .poll(
        async () => {
          const items = await this.readSummaryCents('Items');
          const delivery = await this.readSummaryCents('Delivery');
          const promotion = await this.readSummaryCents('Promotion');
          const total = await this.readSummaryCents('Total Price');
          return (
            items === Math.round(expectedItemPrice * 100) && total === items + delivery - promotion
          );
        },
        { message: 'order summary should be fully loaded and add up' },
      )
      .toBe(true);
  }

  async placeOrder(): Promise<string> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => /\/rest\/basket\/\d+\/checkout/.test(r.url()) && r.request().method() === 'POST',
      ),
      this.placeOrderButton.click(),
    ]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    return String(body.orderConfirmation);
  }
}
