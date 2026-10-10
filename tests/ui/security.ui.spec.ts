import { test, expect } from '../../src/fixtures.js';

const XSS_PAYLOAD = '<iframe src="javascript:alert(`xss`)">';

/**
 * Asserts the SECURE behaviour and is marked test.fail(): it passes while Juice Shop is vulnerable
 * and turns red the day the search page stops rendering the query as raw HTML.
 */
test.describe('Known vulnerabilities, UI (expected to fail)', () => {
  test('search must not execute injected markup (DOM XSS)', async ({ page }) => {
    test.fail(true, 'Juice Shop renders the search query as unsanitised HTML by design');

    // Listen before navigating so a dialog raised during page load is not missed.
    const dialog = page
      .waitForEvent('dialog', { timeout: 5_000 })
      .then(async (d) => {
        const message = d.message();
        await d.dismiss();
        return message;
      })
      .catch(() => null);

    await page.goto(`/#/search?q=${encodeURIComponent(XSS_PAYLOAD)}`);

    expect(await dialog).toBeNull();
  });
});
