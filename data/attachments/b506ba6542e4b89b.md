# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/basket.api.spec.ts >> Basket API >> a duplicate add should be a client error, not a server error
- Location: tests/api/basket.api.spec.ts:90:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 500
Received:   500
```

# Test source

```ts
  1  | import { test, expect } from '../../src/fixtures.js';
  2  | import { ApiClient } from '../../src/api/ApiClient.js';
  3  | 
  4  | test.describe('Basket API', () => {
  5  |   test('a new user starts with an empty basket', async ({ api, user }) => {
  6  |     const res = await api.getBasket(user);
  7  |     expect(res.ok()).toBeTruthy();
  8  |     const { data } = await res.json();
  9  |     expect(data.Products).toHaveLength(0);
  10 |   });
  11 | 
  12 |   test('an item added through the API appears in the basket', async ({ api, user }) => {
  13 |     const add = await api.addToBasket(user, 1);
  14 |     expect(add.ok()).toBeTruthy();
  15 | 
  16 |     const { data } = await (await api.getBasket(user)).json();
  17 |     expect(data.Products).toHaveLength(1);
  18 |     expect(data.Products[0].id).toBe(1);
  19 |   });
  20 | 
  21 |   test('basket cannot be read without a token', async ({ request, user }) => {
  22 |     const res = await request.get(`/rest/basket/${user.bid}`);
  23 |     expect(res.status()).toBe(401);
  24 |   });
  25 | 
  26 |   test('basket response matches the expected schema', async ({ api, user }) => {
  27 |     await api.addToBasket(user, 1, 2);
  28 | 
  29 |     const body = await (await api.getBasket(user)).json();
  30 |     expect(body.status).toBe('success');
  31 |     expect(body.data).toEqual(
  32 |       expect.objectContaining({
  33 |         id: Number(user.bid),
  34 |         Products: [
  35 |           expect.objectContaining({
  36 |             id: 1,
  37 |             name: expect.any(String),
  38 |             price: expect.any(Number),
  39 |             BasketItem: expect.objectContaining({
  40 |               id: expect.any(Number),
  41 |               quantity: 2,
  42 |               ProductId: 1,
  43 |               BasketId: Number(user.bid),
  44 |             }),
  45 |           }),
  46 |         ],
  47 |       }),
  48 |     );
  49 |   });
  50 | 
  51 |   test('quantity can be updated', async ({ api, request, user }) => {
  52 |     const add = await (await api.addToBasket(user, 1)).json();
  53 | 
  54 |     const update = await request.put(`/api/BasketItems/${add.data.id}`, {
  55 |       headers: ApiClient.bearer(user.token),
  56 |       data: { quantity: 3 },
  57 |     });
  58 |     expect(update.ok()).toBeTruthy();
  59 | 
  60 |     const { data } = await (await api.getBasket(user)).json();
  61 |     expect(data.Products[0].BasketItem.quantity).toBe(3);
  62 |   });
  63 | 
  64 |   test('an item can be removed', async ({ api, request, user }) => {
  65 |     const add = await (await api.addToBasket(user, 1)).json();
  66 | 
  67 |     const del = await request.delete(`/api/BasketItems/${add.data.id}`, {
  68 |       headers: ApiClient.bearer(user.token),
  69 |     });
  70 |     expect(del.ok()).toBeTruthy();
  71 | 
  72 |     const { data } = await (await api.getBasket(user)).json();
  73 |     expect(data.Products).toHaveLength(0);
  74 |   });
  75 | 
  76 |   test('adding the same product twice is rejected and does not duplicate the item', async ({
  77 |     api,
  78 |     user,
  79 |   }) => {
  80 |     expect((await api.addToBasket(user, 1)).ok()).toBeTruthy();
  81 | 
  82 |     const second = await api.addToBasket(user, 1);
  83 |     expect(second.ok()).toBeFalsy();
  84 | 
  85 |     const { data } = await (await api.getBasket(user)).json();
  86 |     expect(data.Products).toHaveLength(1);
  87 |     expect(data.Products[0].BasketItem.quantity).toBe(1);
  88 |   });
  89 | 
  90 |   test('a duplicate add should be a client error, not a server error', async ({ api, user }) => {
  91 |     test.fail(true, 'Juice Shop returns HTTP 500 for a duplicate basket item instead of a 4xx');
  92 |     expect((await api.addToBasket(user, 1)).ok()).toBeTruthy();
  93 | 
  94 |     const second = await api.addToBasket(user, 1);
> 95 |     expect(second.status()).toBeLessThan(500);
     |                             ^ Error: expect(received).toBeLessThan(expected)
  96 |   });
  97 | });
  98 | 
```