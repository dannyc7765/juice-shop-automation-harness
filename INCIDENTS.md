# Engineering Notes: Test Failures and Fixes

Real failures hit while building this harness: what broke, why, and what the code does now.
Each entry points at the code that contains the fix.

---

## INC-001: Strict mode violation on a composite search locator

**Affected:** `CatalogPage.search()`

**Symptom**

```
Error: locator.click: strict mode violation:
getByRole('button', { name: /search/i }).or(locator('#searchQuery')) resolved to 3 elements
```

**Root cause**
Playwright actions require a locator that resolves to exactly one element. The loose regex plus `.or()` matched the search container, the "open" button and the "clear" button.

**Fix**
Use a single role-based locator with an exact accessible name (`src/pages/CatalogPage.ts`):

```ts
this.openSearchButton = page.getByRole('button', { name: 'Open search' });
```

**Lesson**
Broad regexes and `.or()` chains hide ambiguity until the DOM changes. Prefer role + exact name.

---

## INC-002: Angular Material overlay backdrop intercepting clicks

**Affected:** adding a product to the basket

**Symptom**
Click timed out after 30s:

```
<div class="cdk-overlay-backdrop cdk-overlay-dark-backdrop cdk-overlay-backdrop-showing"></div>
... intercepts pointer events
```

**Root cause**
Juice Shop loads its config asynchronously and opens the Welcome Banner modal after the page is already interactive. The test started interacting, then the modal's backdrop covered the button.

**Fix**
Prevent the modal from ever opening by setting the dismissal cookies on the browser context before any navigation (`suppressOverlays` auto-fixture in `src/fixtures.ts`):

```ts
await context.addCookies([
  { name: 'welcomebanner_status', value: 'dismiss', domain, path: '/' },
  { name: 'cookieconsent_status', value: 'dismiss', domain, path: '/' },
]);
```

An earlier version also used `click({ force: true })` and `waitForTimeout`. Both were removed; `force: true` bypasses the very check that surfaced this bug, and ESLint (`playwright/no-force-option`) now blocks it.

**Lesson**
Remove the cause of the race instead of working around it in every test.

---

## INC-003: Basket add silently did nothing (`sessionStorage` not persisted)

**Affected:** `CatalogPage.addToBasket()`, basket assertions

**Symptom**
The click happened, but the basket stayed empty. No request to `/api/BasketItems` appeared in the network trace, and a `waitForResponse` set up after the click timed out.

**Root cause**

1. Juice Shop's client reads the basket id from `sessionStorage['bid']`. Playwright's `storageState` saves cookies and `localStorage`, but not `sessionStorage`, so the id was missing and the client dropped the add silently.
2. The click and the response wait were awaited one after the other, so when the click was blocked the wait could never succeed.

**Fix**

1. Seed `bid` into `sessionStorage` with an init script (`authedPage` fixture, `src/fixtures.ts`).
2. Start waiting for the response in the same step as the click (`src/pages/CatalogPage.ts`):

```ts
const [response] = await Promise.all([
  this.page.waitForResponse(
    (res) => res.url().includes('/api/BasketItems') && res.request().method() === 'POST',
  ),
  addButton.click(),
]);
```

**Lesson**
Register the response listener before (or together with) the action that triggers it.

---

## INC-004: Waiting for a network call that never happens

**Affected:** basket -> checkout transition

**Symptom**

```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
```

**Root cause**
The test waited for a basket API response when clicking "Checkout". In Juice Shop, `/#/basket` -> `/#/address/select` is a client-side route change and the basket is already in memory, so no request is made.

**Fix**
Assert the observable outcome, the URL change, instead of an assumed request (`src/pages/BasketPage.ts`):

```ts
await this.checkoutButton.click();
await expect(this.page).toHaveURL(/address\/select/);
```

**Lesson**
Check the network tab to confirm a request actually exists before waiting on it.

---

## INC-005: Shared admin session made tests order-dependent

**Affected:** whole suite (original design)

**Symptom**
The checkout test had to handle "address already exists" and "card already exists" branches, and the catalog test had a conditional "if badge visible, else open basket" path. Both made it unclear what a pass actually proved.

**Root cause**
All tests shared one admin login and one basket, so state left by one test changed what the next one saw.

**Fix**
Each test gets its own user, created through the API (`user` and `authedPage` fixtures, `ApiClient.createUser()`). A brand-new user always has an empty basket, no addresses and no cards, so the page objects follow a single path and the conditionals were removed. ESLint (`playwright/no-conditional-in-test`) keeps them out of the specs.

**Lesson**
Make the starting state deterministic, then the test doesn't need branches.

---

## INC-006: Order summary read before it finished rendering

**Affected:** `CheckoutPage` order summary assertion

**Symptom**
The "total is at least the item price" check failed twice with different wrong values, first `0` and then `0.99` (expected at least `1.99`). The page snapshot taken after the failure showed the correct summary (Items 1.99, Delivery 0.99, Total 2.98).

**Root cause**
The summary table renders first and fills in its figures progressively. The first read saw `0.00`. My first fix waited for "any non-zero number", which let the half-loaded state through: the total briefly showed only the delivery fee, `0.99`.

**Fix**
Wait for the page to be fully consistent instead of for "a number". The test polls until Items equals the price from the API and Total equals Items + Delivery - Promotion, working in whole cents to avoid floating-point error (`CheckoutPage.expectOrderSummary()`):

```ts
await expect
  .poll(async () => {
    const items = await this.readSummaryCents('Items');
    const delivery = await this.readSummaryCents('Delivery');
    const promotion = await this.readSummaryCents('Promotion');
    const total = await this.readSummaryCents('Total Price');
    return items === Math.round(expectedItemPrice * 100) && total === items + delivery - promotion;
  })
  .toBe(true);
```

**Lesson**
Asserting that a value is "not the initial value" is weaker than asserting what the value should be. The expected price comes from the API, so the UI is checked against an independent source.

---

## INC-007: Waiting on a specific search response hung the test

**Affected:** `CatalogPage.search()`

**Symptom**
`page.waitForResponse` timed out after 30s even though the page snapshot showed the search results rendered.

**Root cause**
The predicate matched on the exact request URL and query string. I never established which part of the real request it failed to match. That is the point: the check was coupled to request details that don't matter to what the test is verifying.

**Fix**
Assert the outcome the user sees, the rendered results heading, instead of the request that produced it (`src/pages/CatalogPage.ts`):

```ts
await expect(this.page.getByText(`Search Results - ${term}`)).toBeVisible();
```

**Lesson**
Wait on the user-visible result unless the request itself is what's under test. Network waits are brittle (see also INC-004). `addToBasket` still waits on its response, because there the API call is the behaviour being verified.

---

## INC-008: `passwordRepeat` is only validated in the browser

**Affected:** user registration (`POST /api/Users`)

**Symptom**
A test expecting a 4xx when `password` and `passwordRepeat` differ received `201 Created`.

**Root cause**
This is a server-side validation gap, not a test bug: the mismatch check only exists in the Angular form.

**Fix**
Moved the test to `tests/api/security.api.spec.ts`, asserting the secure behaviour (400) and marked with `test.fail()`, like the SQL injection and IDOR checks. It passes while the gap exists and fails when the server starts enforcing the rule, which is the prompt to remove the annotation.

**Lesson**
When a test fails because the application is wrong, record that as a finding instead of bending the assertion to match the current behaviour.

---

## INC-009: Duplicate basket item returns 500, not 4xx

**Affected:** `POST /api/BasketItems`

**Symptom**
A test expecting HTTP 400 when the same product is added to a basket twice received `500`.

**Root cause**
The server rejects the duplicate (a uniqueness constraint) but surfaces the database error as an internal server error instead of a client error.

**Fix**
The behavioural test now asserts what matters: the second add is rejected and the basket still holds one line with quantity 1. A separate `test.fail()` test records the defect (status should be below 500), so it turns red if the server is fixed.

**Lesson**
A guess about an API's error code is a hypothesis. When the server disagrees, assert the behaviour you can rely on and record the defect separately.
