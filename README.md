# OWASP Juice Shop Test Automation Harness

[![E2E Regression & Telemetry](https://github.com/dannyc7765/juice-shop-automation-harness/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/dannyc7765/juice-shop-automation-harness/actions/workflows/e2e.yml)
[![Allure Report](https://img.shields.io/badge/Allure_Report-View_Live-brightgreen)](https://dannyc7765.github.io/juice-shop-automation-harness/)

Playwright + TypeScript UI and API tests for [OWASP Juice Shop](https://github.com/juice-shop/juice-shop), run in GitHub Actions with sharding, Allure reporting and a flaky-test report.

## What is covered

| Area                  | Type | What it checks                                                                                                                                                               |
| --------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                  | API  | register, login, wrong password (401), duplicate email, auth-required endpoints                                                                                              |
| Products              | API  | catalog integrity, data-driven search, empty search, product schema                                                                                                                          |
| Basket                | API  | empty on creation, add, update quantity, remove, schema, duplicate add rejected, requires token                                                                                                                                  |
| Orders              | API   | checkout via API, order history, basket emptied after checkout                                                                                                                   |
| Security              | API  | SQLi login bypass, basket IDOR and server-side `passwordRepeat` validation, asserted as secure behaviour and marked `test.fail()` because Juice Shop is vulnerable by design | The duplicate-basket-item 500 is documented the same way. |
| Login, search, basket | UI   | login success and failure, search, add to basket                                                                                                                             |
| Checkout              | UI   | full purchase: address, delivery, card, order confirmation                                                                                                                   |

## Design decisions

- **Every test gets its own user**, created through the API (`src/fixtures.ts`). No shared state, so tests are safe to run in parallel and need no conditional setup.
- **Page objects** in `src/pages`, API setup in `src/api/ApiClient.ts`.
- **Lint rules enforce the lessons in [INCIDENTS.md](INCIDENTS.md)**: no `force: true`, no `waitForTimeout`, no conditionals inside tests.
- **Retries are CI-only** (1). Anything that fails and then passes is written to `reports/flaky-tests.json` and the CI job summary. It is reported, not hidden.
- **`@smoke` tag**: four fast tests (app loads, login via UI, login via API, catalog integrity) run first in CI as a gate. The full suite only starts if they pass.
- **Playwright is pinned to an exact version** (`package.json` and the Docker base image must match, or the container's browsers won't).
- **Allure history** is preserved on the `gh-pages` branch to show trends across runs.

## Run it

Requires Node 24+.

### Locally

Start Juice Shop (`docker run -d -p 3000:3000 bkimminich/juice-shop:v20.2.0`), then:

```bash
npm ci
npx playwright install --with-deps chromium
npm test            # everything
npm run test:api    # API only
npm run test:ui     # UI only
npm run test:smoke  # the @smoke subset (4 tests, about 10 seconds)
```

### In Docker (Juice Shop + tests on an isolated network)

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

### Quality checks

```bash
npm run typecheck && npm run lint && npm run format:check
```

## CI

`.github/workflows/e2e.yml`: lint and typecheck, then the `@smoke` gate, then the full suite in 2 shards against a Juice Shop service container, then the Allure report is merged and published to GitHub Pages from `main`.

## Troubleshooting (Windows + Docker Desktop)

- `bind: Only one usage of each socket address` on port 3000: another process holds it. Find it with `netstat -ano | findstr :3000` and stop it with `taskkill /PID <PID> /F`.
- `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`: Docker Desktop isn't running. Start it and wait until `docker info` succeeds.

## Known limitations

- Single browser (Chromium).
- Validated against Juice Shop v20.2.0 (pinned in CI and compose). Newer versions may need locator updates.
