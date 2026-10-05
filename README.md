# Project 1 E2E - OWASP Juice Shop Architecture

![E2E Regression](https://github.com/dannyc7765/project-1-e2e/actions/workflows/e2e.yml/badge.svg?branch=main)
[![Allure Report](https://img.shields.io/badge/Allure%20Report-View%20Live-brightgreen)](https://dannyc7765.github.io/project-1-e2e/)

Production-grade Playwright orchestration suite featuring API token injection, overlay bypass automation, sharded parallel CI execution, and quarantined telemetry collection.

## Execution Runbooks

### 1. Local Headless Execution
Run the full regression suite headless (requires Node 24+ and installed browsers):
```bash
npm ci
npx playwright install --with-deps chromium
npx playwright test