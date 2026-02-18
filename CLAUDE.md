# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**app-factory** is an automated BoomScreen application enrollment tool. It programmatically creates and submits rental screening applications against the BoomScreen API by generating fake applicant data and walking through every step of the application flow (enrollment, identity verification, personal details, housing history, income, disclosure, and submission). It supports multi-applicant scenarios by recursively inviting and processing co-applicants.

## Running

```bash
# Run with a magic link (primary usage)
tsx runner.ts "https://screen.staging.boompay.app/a/<token>"

# Or via npm
npm start -- "https://screen.staging.boompay.app/a/<token>"
```

The environment (BASE_URL) is auto-detected from the magic link hostname by replacing `screen` with `api` in the URL. No `.env` file is needed for the BASE_URL — it's extracted at runtime. However, `GEOAPIFY_API_KEY` must be set in a `.env` file for address generation.

## Prerequisites

- The magic link must come from a unit whose verification template is **"AppFactory - DO NOT TOUCH!!!"**
- A `GEOAPIFY_API_KEY` env var is required (used by `helpers/address-generator.ts`)
- `test-data/Paystub.pdf` and `test-data/signature.svg` must exist (used during income and disclosure steps)

## Architecture

The codebase follows a sequential pipeline pattern orchestrated by `runner.ts`:

```
runner.ts (orchestrator)
  → services/auth-token-provider.ts  — OTP-based auth, gets bearer/refresh tokens
  → services/api-client.ts           — Playwright-based HTTP client with auto token refresh
  → workflows/enrollment.service.ts  — Enroll, start app, submit final application
  → workflows/verification.service.ts — Extract verification IDs from enrollment response
  → workflows/personal-details.service.ts — All form steps + file uploads
```

**Key design decisions:**
- **Playwright `request` API** is used as the HTTP client (not a browser), providing built-in request context management
- **`ApiClient`** is initialized once and shared across all workflows. It handles automatic 401 → token refresh → retry
- **`AppInfo`** (in `models/app-info.model.ts`) is the central mutable state object passed through the entire pipeline. Workflows mutate it directly (adding IDs, verification references, etc.)
- **Multi-applicant support** is recursive: after the first applicant submits, `runner.ts` invites a co-applicant and calls itself with the new magic link. The count is controlled by `APP_CONFIG.ACTORS.APPLICANT`

**Data generators** (`helpers/`):
- Names and employee data via `@faker-js/faker`
- Phone numbers via custom NANP generator (valid US area codes)
- Emails via `mail.tm` API (creates real temporary inboxes)
- Addresses via Geoapify geocoding API

**Configuration** lives in `config/app.config.ts` — contains verification names, step names, default form values, timeouts, retry settings, and actor counts. All configurable values are centralized here.

## File Conventions

- Each `index.ts` barrel file re-exports everything from its directory
- Workflow functions receive `ApiClient` and `AppInfo` as their first two arguments
- Test data and logs are gitignored; `current-app.json` persists the last run's state for debugging
- Winston logs go to both console and `logs/` directory (cleared on each run)
