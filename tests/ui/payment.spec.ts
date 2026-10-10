import { test, expect } from '../../src/fixtures.js';
import { CatalogPage } from '../../src/pages/CatalogPage.js';
import { BasketPage } from '../../src/pages/BasketPage.js';
import { CheckoutPage } from '../../src/pages/CheckoutPage.js';
import { PaymentPage } from '../../src/pages/PaymentPage.js';

test.describe('Payment form (UI)', () => {
  // Every test starts on the payment step with a one-item basket and a saved address.
  test.beforeEach(async ({ authedPage }) => {
    const catalog = new CatalogPage(authedPage);
    const basket = new BasketPage(authedPage);
    const checkout = new CheckoutPage(authedPage);

    await catalog.goto();
    await catalog.search('Apple Juice');
    await catalog.addToBasket('Apple Juice');
    await basket.goto();
    await basket.proceedToCheckout();
    await checkout.addAddress({
      country: 'United States',
      name: 'Alex Mercer',
      mobileNum: '5551234567',
      zipCode: '30047',
      street: '100 Technology Pkwy',
      city: 'Atlanta',
      state: 'Georgia',
    });
    await checkout.chooseDelivery();
    await expect(authedPage).toHaveURL(/payment\/shop/);
  });

  test('a short card number is flagged and cannot be submitted', async ({ authedPage }) => {
    const payment = new PaymentPage(authedPage);
    await payment.openAddCardForm();

    await payment.cardNumberInput.fill('123');
    await payment.cardNumberInput.press('Tab');

    await expect(payment.cardNumberError).toBeVisible();
    await expect(payment.submitCardButton).toBeDisabled();
  });

  test('the card form can only be submitted once it is complete', async ({ authedPage }) => {
    const payment = new PaymentPage(authedPage);
    await payment.openAddCardForm();
    await expect(payment.submitCardButton).toBeDisabled();

    await payment.nameInput.fill('Alex Mercer');
    await expect(payment.submitCardButton).toBeDisabled();

    await payment.cardNumberInput.fill('4111111111111111');
    await payment.expiryMonth.selectOption('11');
    await payment.expiryYear.selectOption('2085');

    await expect(payment.cardNumberError).toBeHidden();
    await expect(payment.submitCardButton).toBeEnabled();
  });

  test('checkout cannot continue before a payment method is chosen', async ({ authedPage }) => {
    const payment = new PaymentPage(authedPage);
    await expect(payment.proceedToReviewButton).toBeDisabled();
  });
});
