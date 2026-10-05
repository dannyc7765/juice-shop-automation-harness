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

export class CheckoutPage extends BasePage {
  readonly addNewAddressBtn: Locator;
  readonly countryInput: Locator;
  readonly nameInput: Locator;
  readonly mobileNumberInput: Locator;
  readonly zipCodeInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly submitAddressBtn: Locator;
  readonly addressSelectionRadio: Locator;
  readonly nextButton: Locator;

  readonly deliverySpeedRadio: Locator;

  readonly addNewCardAccordion: Locator;
  readonly cardNameInput: Locator;
  readonly cardNumberInput: Locator;
  readonly expiryMonthSelect: Locator;
  readonly expiryYearSelect: Locator;
  readonly submitPaymentBtn: Locator;
  readonly cardSelectionRadio: Locator;

  readonly checkoutSubmitBtn: Locator;
  readonly orderConfirmationHeader: Locator;

  constructor(page: Page) {
    super(page);

    this.addNewAddressBtn = page.locator('button[aria-label*="Add a new address"], button:has-text("Add new address"), button:has-text("Add New Address")').first();
    this.countryInput = page.getByPlaceholder(/country/i);
    this.nameInput = page.getByPlaceholder(/name/i);
    this.mobileNumberInput = page.getByPlaceholder(/mobile/i);
    this.zipCodeInput = page.getByPlaceholder(/zip/i);
    this.addressInput = page.getByPlaceholder(/street address/i);
    this.cityInput = page.getByPlaceholder(/city/i);
    this.stateInput = page.getByPlaceholder(/state/i);
    this.submitAddressBtn = page.locator('#submitButton');

    this.addressSelectionRadio = page.locator('mat-table mat-row mat-radio-button, mat-row mat-radio-button').first();
    this.deliverySpeedRadio = page.locator('mat-table mat-row mat-radio-button, mat-row mat-radio-button').first();
    this.cardSelectionRadio = page.locator('mat-table mat-row mat-radio-button, mat-row mat-radio-button').first();
    this.nextButton = page.locator('button.btn-next, button[aria-label*="Proceed"], button:has-text("Continue")').first();

    this.addNewCardAccordion = page.locator('mat-expansion-panel-header').filter({ hasText: /add new card/i });
    this.cardNameInput = page.locator('mat-expansion-panel input[type="text"]').first();
    this.cardNumberInput = page.locator('mat-expansion-panel input[type="number"]');
    this.expiryMonthSelect = page.locator('mat-expansion-panel select').first();
    this.expiryYearSelect = page.locator('mat-expansion-panel select').nth(1);
    this.submitPaymentBtn = page.locator('mat-expansion-panel #submitButton');

    this.checkoutSubmitBtn = page.locator('#checkoutButton');
    this.orderConfirmationHeader = page.locator('h1.confirmation-header, .confirmation, mat-card:has-text("Thank you")');
  }

  async selectOrAddAddress(address: AddressPayload): Promise<void> {
    await this.page.waitForURL(/.*address\/select/);
    await this.page.waitForLoadState('domcontentloaded');

    // Wait up to 3s for existing address rows to populate
    const addressExists = await this.addressSelectionRadio.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

    if (!addressExists) {
      await expect(this.addNewAddressBtn).toBeVisible({ timeout: 5000 });
      await this.addNewAddressBtn.click();
      await this.countryInput.fill(address.country);
      await this.nameInput.fill(address.name);
      await this.mobileNumberInput.fill(address.mobileNum);
      await this.zipCodeInput.fill(address.zipCode);
      await this.addressInput.fill(address.street);
      await this.cityInput.fill(address.city);
      await this.stateInput.fill(address.state);

      const [addrResp] = await Promise.all([
        this.page.waitForResponse(
          (resp) => resp.url().includes('/api/Addresss') && resp.status() === 201,
          { timeout: 10000 }
        ),
        this.submitAddressBtn.click(),
      ]);
      expect(addrResp.ok()).toBeTruthy();
    }

    const radioClickable = this.addressSelectionRadio.locator('label, input, .mat-radio-container').first();
    if (await radioClickable.isVisible()) {
      await radioClickable.click();
    } else {
      await this.addressSelectionRadio.click();
    }

    await expect(this.nextButton).toBeEnabled({ timeout: 5000 });
    await this.nextButton.click();
  }

  async selectDeliverySpeed(): Promise<void> {
    await this.page.waitForURL(/.*delivery-method/);
    await expect(this.deliverySpeedRadio).toBeVisible({ timeout: 5000 });

    const radioClickable = this.deliverySpeedRadio.locator('label, input, .mat-radio-container').first();
    if (await radioClickable.isVisible()) {
      await radioClickable.click();
    } else {
      await this.deliverySpeedRadio.click();
    }

    await expect(this.nextButton).toBeEnabled({ timeout: 5000 });
    await this.nextButton.click();
  }

  async selectOrAddPayment(card: PaymentPayload): Promise<void> {
    await this.page.waitForURL(/.*payment\/shop/);
    await this.page.waitForLoadState('domcontentloaded');

    const cardExists = await this.cardSelectionRadio.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

    if (!cardExists) {
      await this.addNewCardAccordion.click();
      await this.cardNameInput.fill(card.fullName);
      await this.cardNumberInput.fill(card.cardNumber);
      await this.expiryMonthSelect.selectOption(card.expMonth);
      await this.expiryYearSelect.selectOption(card.expYear);

      const [cardResp] = await Promise.all([
        this.page.waitForResponse(
          (resp) => resp.url().includes('/api/Cards') && resp.status() === 201,
          { timeout: 10000 }
        ),
        this.submitPaymentBtn.click(),
      ]);
      expect(cardResp.ok()).toBeTruthy();
    }

    const radioClickable = this.cardSelectionRadio.locator('label, input, .mat-radio-container').first();
    if (await radioClickable.isVisible()) {
      await radioClickable.click();
    } else {
      await this.cardSelectionRadio.click();
    }

    await expect(this.nextButton).toBeEnabled({ timeout: 5000 });
    await this.nextButton.click();
  }

  async getReviewSubtotal(): Promise<string> {
    await this.page.waitForURL(/.*order-summary/);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.checkoutSubmitBtn).toBeVisible({ timeout: 10000 });

    const totalRow = this.page.locator('tr:has-text("Total Price"), tr:has-text("Total:")').last();
    if (await totalRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await totalRow.innerText();
      const match = text.match(/([0-9]+\.[0-9]{2})/);
      if (match && parseFloat(match[1]) > 0) {
        return match[1];
      }
    }

    const validCells = this.page.locator('table tr td, mat-row mat-cell, td.mat-column-price');
    const cellCount = await validCells.count();

    for (let i = 0; i < cellCount; i++) {
      const text = await validCells.nth(i).innerText();
      const match = text.match(/([0-9]+\.[0-9]{2})/);
      if (match && parseFloat(match[1]) > 0) {
        return match[1];
      }
    }

    throw new Error('Failed to extract a non-zero subtotal from the order summary page.');
  }

  async placeOrder(): Promise<{ orderId: string; subtotal: string }> {
    const [orderResp] = await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/checkout') && resp.status() === 200,
        { timeout: 15000 }
      ),
      this.checkoutSubmitBtn.click(),
    ]);

    const data = await orderResp.json();
    const orderConfirmationId = String(
      data.orderConfirmation || data.data?.orderId || 'CONFIRMED'
    );
    const totalPrice = String(data.data?.totalPrice || '');

    return { orderId: orderConfirmationId, subtotal: totalPrice };
  }
}