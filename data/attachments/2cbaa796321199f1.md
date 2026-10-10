# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui/security.ui.spec.ts >> Known vulnerabilities, UI (expected to fail) >> search must not execute injected markup (DOM XSS)
- Location: tests/ui/security.ui.spec.ts:10:3

# Error details

```
Error: expect(received).toBeNull()

Received: "xss"
```

# Page snapshot

```yaml
- generic [active]:
  - generic [ref=e4]:
    - generic [ref=e7]:
      - button "Open Sidenav" [ref=e8] [cursor=pointer]:
        - img [aria-hidden] [ref=e9]: menu
      - button "Back to homepage" [ref=e12]:
        - generic [ref=e14]:
          - img "OWASP Juice Shop" [ref=e15]
          - generic [ref=e16]: OWASP Juice Shop
      - generic "Click to search" [ref=e20]:
        - button "Open search" [ref=e21] [cursor=pointer]:
          - img [aria-hidden] [ref=e22]: search
        - generic:
          - img [aria-hidden] [ref=e25]: search
          - textbox [ref=e26]
          - button "Close search" [ref=e27] [cursor=pointer]:
            - img [aria-hidden] [ref=e28]: close
      - generic [ref=e31]:
        - button "Show/hide account menu" [ref=e32]:
          - img [aria-hidden] [ref=e33]: account_circle
          - generic [ref=e34]: Account
        - button "Show the shopping cart" [ref=e37]:
          - img [aria-hidden] [ref=e38]: shopping_cart
          - generic [ref=e39]:
            - text: Your Basket
            - generic [ref=e40]: "0"
        - button "Language selection menu" [ref=e43]:
          - img [aria-hidden] [ref=e44]: language
          - generic [ref=e45]: EN
    - generic [ref=e52]:
      - generic [ref=e53]:
        - text: "You successfully solved a challenge: DOM XSS (Perform a DOM XSS attack with <iframe src=\"javascript:alert(`xss`)\">.)"
        - button "Jump to related coding challenge" [ref=e55] [cursor=pointer]:
          - img [aria-hidden] [ref=e56]: code
      - button "X" [ref=e60]
    - main [ref=e65]:
      - generic [ref=e67]:
        - text: Search Results -
        - iframe [ref=e69]
      - generic [ref=e71]:
        - img "No results found" [ref=e72]
        - generic [ref=e73]: No results found
        - generic [ref=e75]: Try adjusting your search to find what you're looking for.
      - group [ref=e77]:
        - generic [ref=e79]:
          - generic [ref=e80]:
            - generic [aria-hidden] [ref=e81]: "Items per page:"
            - combobox "Items per page:" [ref=e86] [cursor=pointer]:
              - generic [ref=e87]: "15"
          - generic [ref=e95]:
            - status [ref=e96]: 0 of 0
            - button "Previous page" [disabled] [ref=e97]
            - button "Next page" [disabled] [ref=e102]
  - generic [ref=e114]:
    - generic [ref=e115]: Language has been changed to English
    - button "Force page reload" [ref=e117]
```

# Test source

```ts
  1  | ﻿import { test, expect } from '../../src/fixtures.js';
  2  | 
  3  | const XSS_PAYLOAD = '<iframe src="javascript:alert(`xss`)">';
  4  | 
  5  | /**
  6  |  * Asserts the SECURE behaviour and is marked test.fail(): it passes while Juice Shop is vulnerable
  7  |  * and turns red the day the search page stops rendering the query as raw HTML.
  8  |  */
  9  | test.describe('Known vulnerabilities, UI (expected to fail)', () => {
  10 |   test('search must not execute injected markup (DOM XSS)', async ({ page }) => {
  11 |     test.fail(true, 'Juice Shop renders the search query as unsanitised HTML by design');
  12 | 
  13 |     // Listen before navigating so a dialog raised during page load is not missed.
  14 |     const dialog = page
  15 |       .waitForEvent('dialog', { timeout: 5_000 })
  16 |       .then(async (d) => {
  17 |         const message = d.message();
  18 |         await d.dismiss();
  19 |         return message;
  20 |       })
  21 |       .catch(() => null);
  22 | 
  23 |     await page.goto(`/#/search?q=${encodeURIComponent(XSS_PAYLOAD)}`);
  24 | 
> 25 |     expect(await dialog).toBeNull();
     |                          ^ Error: expect(received).toBeNull()
  26 |   });
  27 | });
  28 | 
```