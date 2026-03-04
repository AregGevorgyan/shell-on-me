# StartupShell Plan

## Objective
Operate this codebase as a private StartupShell prediction market using fake currency (Shell Token), restricted to `@startupshell.org` members.

---

## Current Status (March 4, 2026)

### Completed
- Repo simplification:
  - Removed non-core packages/services (`native/`, `twitch-bot/`, `backend/discord-bot/`, `docs/`).
- Auth lockdown baseline:
  - Backend enforcement for StartupShell users.
  - Google-only auth UX path in frontend.
- Real-money flow removal/minimization:
  - Real-money purchase/cashout and related legacy flows removed or disabled from primary UX.
- Email minimization:
  - StartupShell sender/domain defaults applied.
  - Minimal email mode implemented (`MINIMAL_EMAIL_MODE=true` default).
  - Allowlist controls added (`ESSENTIAL_EMAIL_TEMPLATES`, `ESSENTIAL_EMAIL_SUBJECT_KEYWORDS`).
- Bun migration:
  - `yarn.lock` removed, `bun.lock` added.
  - Workspace scripts migrated to Bun.
  - CI updated to Bun install/build flow.
  - Deploy/build helper scripts updated for Bun.
- Currency branding:
  - Default money moniker switched to Shell Token.
  - Core money formatting adjusted for word-style monikers.
  - Major UI copy pass completed to replace user-facing “Mana” with “Shell Token(s)” in core flows.

### Remaining
1. Final copy/branding sweep:
- Remove remaining user-facing legacy “Mana”/“Manifold” strings in low-traffic pages, admin pages, and static/help content. Historical and leagal attributions to "Manifold" can remain.

2. Optional schema cleanup:
- Legacy cash/spice DB fields remain for compatibility.
- If desired, remove via explicit migration after backup and rollout plan.

3. Infra finalization:
- Confirm production Firebase project config and strict StartupShell auth restrictions.
- Confirm Supabase prod project, secrets, and backups.

4. Email policy finalization:
- Lock final essential email allowlist.
- Verify essential account/security notifications still deliver.

5. Ops hardening:
- Add deployment smoke-test checklist automation.
- Add rollback checklist and owner/on-call notes.

---

## Deployment Guide

### 1. Prerequisites
- Vercel project for `web`.
- API host (Railway/Render/etc.) for `backend/api`.
- Supabase project.
- Firebase project (Google auth only).
- Optional Mailgun setup for essential outbound email.
- Runtime/tooling:
  - Node.js 20+
  - Bun 1.x

### 2. Environment Variables
Set appropriately in local/dev/prod:
- Domain/app:
  - `NEXT_PUBLIC_APP_DOMAIN`
  - `NEXT_PUBLIC_DEV_APP_DOMAIN`
  - `NEXT_PUBLIC_DOCS_BASE_URL`
- Firebase (public web vars):
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- Supabase:
  - `NEXT_PUBLIC_SUPABASE_INSTANCE_ID`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - backend server-side DB secrets
- API:
  - `NEXT_PUBLIC_API_ENDPOINT`
  - backend runtime secrets
- Email:
  - `MINIMAL_EMAIL_MODE=true`
  - optional: `ESSENTIAL_EMAIL_TEMPLATES`
  - optional: `ESSENTIAL_EMAIL_SUBJECT_KEYWORDS`
  - optional: `MAILGUN_KEY`, `MAILGUN_DOMAIN`
- Currency branding:
  - `NEXT_PUBLIC_MONEY_MONIKER=Shell Token`

### 3. Database (Supabase)
1. Create project.
2. Apply `backend/supabase/migrations` in order.
3. Verify RLS policies/indexes/extensions.
4. Seed admin IDs via env (`STARTUPSHELL_ADMIN_IDS`, `STARTUPSHELL_DEV_ADMIN_IDS`).

### 4. Firebase
1. Create prod/dev projects.
2. Enable Google sign-in only.
3. Disable all other providers.
4. Configure authorized domains.
5. Optional: add auth blocking function for non-`@startupshell.org` account creation.

### 5. Pre-Deploy Verification
```bash
bun run --cwd backend/api compile
npx tsc --project web/tsconfig.json --noEmit
```

### 6. Deploy Order
1. Deploy API (`backend/api`).
2. Deploy web (`web`).
3. Point DNS:
- app domain -> web
- api domain -> API
4. Verify CORS/session behavior across domains.

### 7. Smoke Tests
1. StartupShell Google login succeeds.
2. Non-StartupShell user is blocked from authenticated actions.
3. Create market, trade, resolve.
4. Notifications and key pages render correctly.
5. Email behavior:
- Non-essential emails skipped.
- Essential allowlisted emails send (if configured).

---

## Immediate Next Work
1. Run a repo-wide final copy sweep for remaining user-facing “Mana/Manifold” strings and patch safe candidates.
2. Finalize essential email allowlist and test in staging.
3. Add a short deploy rollback section to `README.md`.
