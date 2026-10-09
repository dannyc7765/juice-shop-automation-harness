import { test, expect } from '../../src/fixtures.js';

interface Product {
  id: number;
  name: string;
  price: number;
}

test.describe('Products API', () => {
  test('catalog is non-empty and every product has a name and positive price', async ({
    request,
  }) => {
    const res = await request.get('/api/Products');
    expect(res.ok()).toBeTruthy();
    const { data } = (await res.json()) as { data: Product[] };
    expect(data.length).toBeGreaterThan(0);
    for (const p of data) {
      expect(p.name).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
    }
  });

  for (const term of ['apple', 'banana', 'lemon']) {
    test(`search for "${term}" only returns matching products`, async ({ request }) => {
      const res = await request.get('/rest/products/search', { params: { q: term } });
      expect(res.ok()).toBeTruthy();
      const { data } = (await res.json()) as { data: Product[] };
      expect(data.length).toBeGreaterThan(0);
      for (const p of data) {
        expect(`${p.name}`.toLowerCase()).toContain(term);
      }
    });
  }

  test('search with no match returns an empty result set', async ({ request }) => {
    const res = await request.get('/rest/products/search', {
      params: { q: 'zzzz-no-such-product' },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = (await res.json()) as { data: Product[] };
    expect(data).toHaveLength(0);
  });
});
