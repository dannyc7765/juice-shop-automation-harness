import { test, expect } from '../../src/fixtures.js';
import { ApiClient } from '../../src/api/ApiClient.js';

test.describe('Orders API', () => {
  test('a completed checkout appears in order history', async ({ api, request, user }) => {
    expect((await api.addToBasket(user, 1)).ok()).toBeTruthy();

    const orderId = await api.checkout(user);
    expect(orderId).toBeTruthy();

    const res = await request.get('/rest/order-history', {
      headers: ApiClient.bearer(user.token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].orderId).toBe(orderId);
  });

  test('the basket is emptied after checkout', async ({ api, user }) => {
    expect((await api.addToBasket(user, 1)).ok()).toBeTruthy();
    await api.checkout(user);

    const { data } = await (await api.getBasket(user)).json();
    expect(data.Products).toHaveLength(0);
  });

  test('a new user has no order history', async ({ request, user }) => {
    const res = await request.get('/rest/order-history', {
      headers: ApiClient.bearer(user.token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data).toHaveLength(0);
  });
});
