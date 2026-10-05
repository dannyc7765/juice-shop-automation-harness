import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../../src/pages/CheckoutPage.js';

test.describe('Transactional Business Operations', () => {
  test('Complete purchase with network assertions and artificial latency quarantine validation', async ({ page }) => {
    const checkout = new CheckoutPage(page);

    await page.addInitScript(() => {
      const storedBid = window.localStorage.getItem('bid') || '1';
      window.sessionStorage.setItem('bid', storedBid);
      window.localStorage.setItem('welcomebanner_status', 'dismiss');
      window.localStorage.setItem('cookieconsent_status', 'dismiss');
    });

    await page.goto('/#/search');
    await page.waitForLoadState('domcontentloaded');

    const welcomeDismiss = page.locator('button[aria-label="Close Welcome Banner"]');
    if (await welcomeDismiss.isVisible({ timeout: 1500 }).catch(() => false)) {
      await welcomeDismiss.click({ force: true });
    }

    const searchBtn = page.getByRole('button', { name: 'Open search' });
    await searchBtn.waitFor({ state: 'visible' });
    await searchBtn.click();

    const searchInput = page.locator('#searchQuery input');
    await searchInput.fill('Apple Juice');
    await searchInput.press('Enter');

    const appleCard = page.locator('mat-card').filter({ hasText: 'Apple Juice' }).first();
    await expect(appleCard).toBeVisible({ timeout: 10000 });

    const addToBasketBtn = appleCard.locator('button[aria-label*="Add to Basket"]');
    await expect(addToBasketBtn).toBeVisible({ timeout: 5000 });
    await addToBasketBtn.scrollIntoViewIfNeeded();

    const [basketResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().toLowerCase().includes('/api/basketitems') && resp.status() < 400,
        { timeout: 15000 }
      ),
      addToBasketBtn.click({ force: true }),
    ]);

    expect(basketResponse.ok()).toBeTruthy();
    const basketData = await basketResponse.json();
    expect(basketData.status).toBe('success');

    await page.goto('/#/basket');
    await expect(page).toHaveURL(/.*basket/);
    await expect(page.locator('mat-row').first()).toBeVisible({ timeout: 10000 });

    await page.locator('#checkoutButton').click();
    await expect(page).toHaveURL(/.*address\/select/, { timeout: 10000 });

    await checkout.selectOrAddAddress({
      country: 'United States',
      name: 'Alex Mercer',
      mobileNum: '5551234567',
      zipCode: '30047',
      street: '100 Technology Pkwy',
      city: 'Atlanta',
      state: 'Georgia',
    });

    await checkout.selectDeliverySpeed();

    // Attempt 0: Intercept and throttle /checkout by 1,500ms to breach SLA and trigger retry
    if (test.info().retry === 0) {
      await page.route('**/rest/basket/*/checkout', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
    }

    await checkout.selectOrAddPayment({
      fullName: 'Alex Mercer',
      cardNumber: '4111111111111111',
      expMonth: '11',
      expYear: '2085',
    });

    const subtotal = await checkout.getReviewSubtotal();
    const parsedSubtotal = parseFloat(subtotal);
    expect(parsedSubtotal).toBeGreaterThan(0);

    const orderPromise = checkout.placeOrder();

    if (test.info().retry === 0) {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Artificial SLA violation: endpoint latency exceeded 1000ms limit')), 1000)
      );
      await Promise.race([orderPromise, timeoutPromise]);
    }

    const { orderId } = await orderPromise;

    expect(orderId).toBeTruthy();
    expect(orderId.length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: /thank you for your purchase/i })).toBeVisible({ timeout: 5000 });
  });
});