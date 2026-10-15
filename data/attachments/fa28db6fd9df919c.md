# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/security.api.spec.ts >> Known vulnerabilities (expected to fail) >> registration must be rejected when passwordRepeat does not match
- Location: tests/api/security.api.spec.ts:18:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 201
```

# Test source

```ts
  1  | import { test, expect } from '../../src/fixtures.js';
  2  | import { ApiClient } from '../../src/api/ApiClient.js';
  3  | 
  4  | /**
  5  |  * Juice Shop is intentionally vulnerable. These tests assert the SECURE behaviour and are marked
  6  |  * test.fail(): they pass while the vulnerability exists, and turn red the day it is fixed (or the
  7  |  * suite is pointed at a hardened app), which is the signal to remove the annotation.
  8  |  */
  9  | test.describe('Known vulnerabilities (expected to fail)', () => {
  10 |   test('SQL injection must not allow login bypass', async ({ request }) => {
  11 |     test.fail(true, 'Juice Shop is vulnerable to SQLi on /rest/user/login by design');
  12 |     const res = await request.post('/rest/user/login', {
  13 |       data: { email: "' OR 1=1--", password: 'anything' },
  14 |     });
  15 |     expect(res.status()).toBe(401);
  16 |   });
  17 | 
  18 |   test('registration must be rejected when passwordRepeat does not match', async ({ request }) => {
  19 |     test.fail(true, 'Juice Shop only validates passwordRepeat client-side');
  20 |     const creds = ApiClient.uniqueCredentials();
  21 |     const res = await request.post('/api/Users', {
  22 |       data: { email: creds.email, password: creds.password, passwordRepeat: 'different' },
  23 |     });
> 24 |     expect(res.status()).toBe(400);
     |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  25 |   });
  26 | 
  27 |   test("a user must not be able to read another user's basket (IDOR)", async ({ api, request }) => {
  28 |     test.fail(true, 'Juice Shop does not check basket ownership by design');
  29 |     const victim = await api.createUser();
  30 |     const attacker = await api.createUser();
  31 | 
  32 |     const res = await request.get(`/rest/basket/${victim.bid}`, {
  33 |       headers: ApiClient.bearer(attacker.token),
  34 |     });
  35 |     expect(res.status()).toBe(403);
  36 |   });
  37 | });
  38 | 
```