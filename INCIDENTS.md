# Engineering Post-Mortems & Incident Log (`INCIDENTS.md`)

---

## [INC-001] Docker Daemon Host Socket Collision on TCP Port 3000

* *+Status:** Resolved
* **Severity:** Blocker (Infrastructure / Local Container Runtime)
* **Impacted Scope:** Local container provisioning (`bkimminich/juice-shop`)

### 1. Incident Symptom
Docker daemon failed to bind port 3000:
` listen tcp 0.0.0.0:3000: bind: Only one usage of each socket address is normally permitted. `

### 2. Root-Cause Autopsy
An orphaned host Node.js process retained an active listening socket on port 3000, blocking the Docker daemon's network allocation.

### 3. Remediation
Extracted the PID via host socket inspection and killed the process:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
docker run -d --name target-juice-shop -p 3000:3000 bkimminich/juice-shop
```(Note: replace <PID> with the actual numeric process ID).


### 4. SDET Architectural Defense
Containerization isolates compute, but shares the host network interface. In CI/CD, ephemeral service containers and dynamic port bindings prevent port-locking flakiness.

---

## [INC-002] Playwright Strict Mode Collision on Composite Search Locators
* **Status:** Resolved
* **Severity:** Medium (Locator Strategy Fragility)
* **Impacted Scope:** `CatalogPage.searchProduct()`

### 1. Incident Symptom
`Error: locator.click: Error: strict mode violation: getByRole('button', { name: /search/i }).or(locator('#searchQuery')) resolved to 3 elements`

### 2. Root-Cause Autopsy
Playwright requires action locators to resolve to exactly one DOM element. The composite regex matched the container, the open button, and the clear button simultaneously.

### 3. Remediation
Refactored to an unambiguous, role-based accessibility locator:
```typescript
this.searchButton = this.getByRole('button', { name: 'Open search' });
```

### 4. SDET Architectural Defense
Loose regex chains yield selector drift. Enterprise automation prioritizes accessibility trees (`aria-label`, accessible names) to survive DOM restructuring.

---

## [INC-003] Pointer Event Interception by Angular Material CDK Overlay Backdrop
* **Status:** Resolved
* **Severity:**High (Asynchronous DOM Race Condition)
* **Impacted Scope:** `CatalogPage.addToCart()`

### 1. Incident Symptom
Playwright timed out after 30,000ms attempting to click "Add to Basket":
`<div class="cdk-overlay-backdrop cdk-overlay-dark-backdrop cdk-overlay-backdrop-showing"></div> from <div class="cdk-overlay-container">…</div> subtree intercepts pointer events`

### 2. Root-Cause Autopsy
Owasp Juice Shop dynamically evaluates configuration background calls on routing. Angular mounted the Welcome Banner modal asynchronously while the test was already typing, putting a dark sheet in front of the button.

### 3. Remediation
Suppressed modal creation at the browser context level via cookies and storage init scripts:
```typescript
await context.addCookies([
  { name: 'cookieconsent_status', value: 'dismiss', domain: 'localhost', path: '/' },
  { name: 'welcomebanner_status', value: 'dismiss', domain: 'localhost', path: '/' },
]);

await context.addInitScript(() => {
  window.localStorage.setItem('welcomebanner_status', 'dismiss');
  window.sessionStorage.setItem('bid', '1');
});
```

### 4. SDET Architectural Defense
Adding arsenals of `waitForTimeout` masks race conditions. Senior SDETs disable third-party modals overlarge at the browser context bootstrap level.

---

## [INC-004] Client Session Deserialization Drop & Async Response Listener Deadlock
* **Status:** Resolved
* **Severity:** Critical (State Persistence & Asynchronous Deadlock)
* **Impacted Scope:** `CatalogPage.addToCart()` and cart badge assertions

### 1. Incident Symptom
The UI click fired, but the cart count badge remained 0:
`Expected: >= 1, Received: 0`.Network trace showed zero calls to `/api/BasketItems`. An attempted `waitForResponse` listener timed out after 7,000ms.

### 2. Root-Cause Autopsy
1. Playwright's `storageState` does not serialize `sessionStorage`. Juice Shop's Angular client maps basket additions using `sessionStorage.getItem('bid')`. Without it, it dropped the cart action silently.
2. Sequential awaits (`await click()`, followed by `await waitForResponse()`) deadlocked when the click hang on DOM overlays.

### 3. Remediation
4. Pre-seeded `bid` into `sessionStorage` via `addInitScript`.
2. Bound the action dispatch and network listener concurrently via `Promise.all`:
```typescript
const [response] = await Promise.all([
  this.page.waitForResponse(
    (resp) => resp.url().includes('/api/BasketItems') && resp.out() < 400,
    { timeout: 10000 }
  ),
  addButton.dispatchEvent('click'),
]);
```

### 4. SDET Architectural Defense
Awaiting an action and subsequently awaiting its network response is an anti-pattern that causes race conditions. Asynchronous operations tied to events should always be synchronized concurrently using `Promise.all`.

---

## [INC-005] Ghost Network Request Await on Frontend SPA Client-Side Route Transition
* **Status:** Resolved
* **Severity:** High (Asynchronous Flow / Architecture Misalignment)
* **Impacted Scope:** `tests/e2e/checkout.spec.ts` (Basket to Checkout transition)

### 1. Incident Symptom
Playwright timed out after 10,000ms attempting to intercept a basket response upon clicking checkout:
`TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"`
Target route: `/rest/basket/`

### 2. Root-Cause Autopsy
The test implemented a concurrent `Promise.all([page.waitForResponse(...), page.locator('#checkoutButton').click()])` assuming `#checkoutButton` triggered a network fetch to refresh basket state. In OWASP Juice Shop's Angular client, navigating from `/#/basket` to `/#/address/select` is a purely client-side router transition. The basket payload was already cached in client memory. Waiting for a network response that never fired resulted in a deterministic 10-second timeout.

### 3. Remediation
Removed the ghost network interception listener. Replaced with explicit URL routing and DOM state synchronization:
```typescript
await page.goto('/#/basket');
await expect(page).toHaveURL(/.*basket/);
await expect(page.locator('mat-row').first()).toBeVisible({ timeout: 10000 });

await page.locator('#checkoutButton').click();
await expect(page).toHaveURL(/.*address\/select/, { timeout: 10000 });

---

## [INC-006] Windows Named Pipe IPC Failure on Inactive Docker Desktop Daemon
* **Status:** Resolved
* **Severity:** Blocker (Local Infrastructure / OS Inter-Process Communication)
* **Impacted Scope:** Docker CLI execution via Windows PowerShell

### 1. Incident Symptom
Docker Compose aborted before executing builds or pulling images:
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`

### 2. Root-Cause Autopsy
On Windows, the Docker CLI communicates with the Docker Engine service over an IPC Windows Named Pipe (`//./pipe/dockerDesktopLinuxEngine`). The Docker Desktop backend daemon (`dockerd` inside the WSL2 distro) was terminated, removing the pipe handle from the Windows kernel namespace.

### 3. Remediation
Spawned the Docker Desktop host process via PowerShell and added an active polling loop against `docker info` to block execution until the named pipe registered:
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
while (-not (docker info 2>$null)) { Start-Sleep -Seconds 3 }

# Engineering Post-Mortems & Incident Log (`INCIDENTS.md`)

---

## [INC-001] Docker Daemon Host Socket Collision on TCP Port 3000
* **Status:** Resolved
* **Severity:** Blocker (Infrastructure / Local Container Runtime)
* **Impacted Scope:** Local container provisioning (`bkimminich/juice-shop`)

### 1. Incident Symptom
Docker daemon failed to bind port 3000:
`listen tcp 0.0.0.0:3000: bind: Only one usage of each socket address is normally permitted.`

### 2. Root-Cause Autopsy
An orphaned host Node.js process retained an active listening socket on port 3000, blocking the Docker daemon's network allocation.

### 3. Remediation
Extracted the PID via host socket inspection and terminated the process:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
docker run -d --name target-juice-shop -p 3000:3000 bkimminich/juice-shop
