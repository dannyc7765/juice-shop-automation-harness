import { test, expect } from '../../src/fixtures.js';

test.describe('Auth API', () => {
  test('valid credentials return a token and a basket id', { tag: '@smoke' }, async ({ api }) => {
    const creds = await api.register();
    const session = await api.login(creds);
    expect(session.token.split('.')).toHaveLength(3); // JWT
    expect(session.bid).toMatch(/^\d+$/);
  });

  test('wrong password is rejected with 401', async ({ api, request }) => {
    const creds = await api.register();
    const res = await request.post('/rest/user/login', {
      data: { email: creds.email, password: 'definitely-wrong' },
    });
    expect(res.status()).toBe(401);
  });

  test('registering an already-registered email is rejected', async ({ api, request }) => {
    const creds = await api.register();
    const res = await request.post('/api/Users', {
      data: { email: creds.email, password: creds.password, passwordRepeat: creds.password },
    });
    expect(res.status()).toBe(400);
  });

  test('user list requires authentication', async ({ request }) => {
    const res = await request.get('/api/Users');
    expect(res.status()).toBe(401);
  });
});
