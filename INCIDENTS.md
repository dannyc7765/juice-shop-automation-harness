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
