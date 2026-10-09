# OWASP Juice Shop E2E Test Automation Harness

[![E2E Regression & Telemetry](https://github.com/dannyc7765/juice-shop-automation-harness/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/dannyc7765/juice-shop-automation-harness/actions/workflows/e2e.yml)
[![Allure Report](https://img.shields.io/badge/Allure_Report-View_Live-brightgreen)](https://dannyc7765.github.io/juice-shop-automation-harness/)

Production-grade Playwright orchestration suite featuring API token injection, overlay bypass automation, sharded parallel CI execution, and quarantined telemetry collection.
### 🛡️ Engineering Post-Mortems & Incident Log
Detailed root-cause autopsies documenting distributed CI race conditions, overlay deadlocks, and container networking triage are tracked in [`INCIDENTS.md`](./INCIDENTS.md).
## Execution Runbooks

### 1. Local Headless Execution
Run the full regression suite headless (requires Node 24+ and installed browsers):
```bash
npm ci
npx playwright install --with-deps chromium
npx playwright test
