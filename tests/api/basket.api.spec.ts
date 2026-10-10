import { test, expect } from '../../src/fixtures.js';
import { ApiClient } from '../../src/api/ApiClient.js';

test.describe('Basket API', () => {
  test('a new user starts with an empty basket', async ({ api, user }) => {
    const res = await api.getBasket(user);
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.Products).toHaveLength(0);
  });

  test('an item added through the API appears in the basket', async ({ api, user }) => {
    const add = await api.addToBasket(user, 1);
    expect(add.ok()).toBeTruthy();

    const { data } = await (await api.getBasket(user)).json();
    expect(data.Products).toHaveLength(1);
    expect(data.Products[0].id).toBe(1);
  });

  test('basket cannot be read without a token', async ({ request, user }) => {
    const res = await request.get(`/rest/basket/${user.bid}`);
    expect(res.status()).toBe(401);
  });

  test('basket response matches the expected schema', async ({ api, user }) => {
    await api.addToBasket(user, 1, 2);

    const body = await (await api.getBasket(user)).json();
    expect(body.status).toBe('success');
    expect(body.data).toEqual(
      expect.objectContaining({
        id: Number(user.bid),
        Products: [
          expect.objectContaining({
            id: 1,
            name: expect.any(String),
            price: expect.any(Number),
            BasketItem: expect.objectContaining({
              id: expect.any(Number),
              quantity: 2,
              ProductId: 1,
              BasketId: Number(user.bid),
            }),
          }),
        ],
      }),
    );
  });

  test('quantity can be updated', async ({ api, request, user }) => {
    const add = await (await api.addToBasket(user, 1)).json();

    const update = await request.put(`/api/BasketItems/${add.data.id}`, {
      headers: ApiClient.bearer(user.token),
      data: { quantity: 3 },
    });
    expect(update.ok()).toBeTruthy();

    const { data } = await (await api.getBasket(user)).json();
    expect(data.Products[0].BasketItem.quantity).toBe(3);
  });

  test('an item can be removed', async ({ api, request, user }) => {
    const add = await (await api.addToBasket(user, 1)).json();

    const del = await request.delete(`/api/BasketItems/${add.data.id}`, {
      headers: ApiClient.bearer(user.token),
    });
    expect(del.ok()).toBeTruthy();

    const { data } = await (await api.getBasket(user)).json();
    expect(data.Products).toHaveLength(0);
  });

  test('adding the same product twice is rejected and does not duplicate the item', async ({
    api,
    user,
  }) => {
    expect((await api.addToBasket(user, 1)).ok()).toBeTruthy();

    const second = await api.addToBasket(user, 1);
    expect(second.ok()).toBeFalsy();

    const { data } = await (await api.getBasket(user)).json();
    expect(data.Products).toHaveLength(1);
    expect(data.Products[0].BasketItem.quantity).toBe(1);
  });

  test('a duplicate add should be a client error, not a server error', async ({ api, user }) => {
    test.fail(true, 'Juice Shop returns HTTP 500 for a duplicate basket item instead of a 4xx');
    expect((await api.addToBasket(user, 1)).ok()).toBeTruthy();

    const second = await api.addToBasket(user, 1);
    expect(second.status()).toBeLessThan(500);
  });
});
