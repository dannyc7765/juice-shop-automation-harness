import { test, expect } from '../../src/fixtures.js';
import { ApiClient } from '../../src/api/ApiClient.js';

test.describe('Basket API', () => {
  test('a new user starts with an empty basket', async ({ request, user }) => {
    const res = await request.get(`/rest/basket/${user.bid}`, {
      headers: ApiClient.bearer(user.token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.Products).toHaveLength(0);
  });

  test('an item added through the API appears in the basket', async ({ request, user }) => {
    const headers = ApiClient.bearer(user.token);

    const add = await request.post('/api/BasketItems', {
      headers,
      data: { ProductId: 1, BasketId: user.bid, quantity: 1 },
    });
    expect(add.ok()).toBeTruthy();

    const res = await request.get(`/rest/basket/${user.bid}`, { headers });
    const { data } = await res.json();
    expect(data.Products).toHaveLength(1);
    expect(data.Products[0].id).toBe(1);
  });

  test('basket cannot be read without a token', async ({ request, user }) => {
    const res = await request.get(`/rest/basket/${user.bid}`);
    expect(res.status()).toBe(401);
  });
});
