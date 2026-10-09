import { test, expect } from '../../src/fixtures.js';
import { ApiClient } from '../../src/api/ApiClient.js';

/**
 * Juice Shop is intentionally vulnerable. These tests assert the SECURE behaviour and are marked
 * test.fail(): they pass while the vulnerability exists, and turn red the day it is fixed (or the
 * suite is pointed at a hardened app), which is the signal to remove the annotation.
 */
test.describe('Known vulnerabilities (expected to fail)', () => {
  test('SQL injection must not allow login bypass', async ({ request }) => {
    test.fail(true, 'Juice Shop is vulnerable to SQLi on /rest/user/login by design');
    const res = await request.post('/rest/user/login', {
      data: { email: "' OR 1=1--", password: 'anything' },
    });
    expect(res.status()).toBe(401);
  });

  test('registration must be rejected when passwordRepeat does not match', async ({ request }) => {
    test.fail(true, 'Juice Shop only validates passwordRepeat client-side');
    const creds = ApiClient.uniqueCredentials();
    const res = await request.post('/api/Users', {
      data: { email: creds.email, password: creds.password, passwordRepeat: 'different' },
    });
    expect(res.status()).toBe(400);
  });

  test("a user must not be able to read another user's basket (IDOR)", async ({ api, request }) => {
    test.fail(true, 'Juice Shop does not check basket ownership by design');
    const victim = await api.createUser();
    const attacker = await api.createUser();

    const res = await request.get(`/rest/basket/${victim.bid}`, {
      headers: ApiClient.bearer(attacker.token),
    });
    expect(res.status()).toBe(403);
  });
});
