import { test, expect } from '../../src/fixtures.js';
import { CatalogPage } from '../../src/pages/CatalogPage.js';
import { BasketPage } from '../../src/pages/BasketPage.js';
import { CheckoutPage } from '../../src/pages/CheckoutPage.js';

test.describe('Checkout (UI)', () => {
  test('new user completes a purchase', async ({ authedPage, request }) => {
    // Source of truth for the expected price comes from the API, not from the UI under test.
    const products = await (
      await request.get('/rest/products/search', { params: { q: 'Apple Juice' } })
    ).json();
    const itemPrice: number = products.data[0].price;

    const catalog = new CatalogPage(authedPage);
    const basket = new BasketPage(authedPage);
    const checkout = new CheckoutPage(authedPage);

    await catalog.goto();
    await catalog.search('Apple Juice');
    await catalog.addToBasket('Apple Juice');

    await basket.goto();
    await expect(basket.rowFor('Apple Juice')).toHaveCount(1);
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
    await checkout.addCard({
      fullName: 'Alex Mercer',
      cardNumber: '4111111111111111',
      expMonth: '11',
      expYear: '2085',
    });

    await checkout.expectOrderSummary(itemPrice);

    const orderId = await checkout.placeOrder();
    expect(orderId).toBeTruthy();
    await expect(
      authedPage.getByRole('heading', { name: /thank you for your purchase/i }),
    ).toBeVisible();
  });
});
