# StartupShell Prediction Market

This repo is a customized fork of Manifold, converted into a private StartupShell internal prediction market.

## Scope

- Google auth only, restricted to `@startupshell.org` accounts
- Fake-money trading (mana) only
- StartupShell domain/environment defaults
- Stripped packages/services not needed for the internal deployment

## Monorepo layout

- `web/`: Next.js frontend
- `backend/api/`: internal Express API
- `backend/shared/`: shared backend services/helpers
- `common/`: shared types, domain logic, and env config

## Requirements

- Node.js 20+
- Bun 1.3+

## Install

From repo root:

```bash
bun install
```

Copy env template:

```bash
cp .env.example .env
```

## Run locally

Frontend:

```bash
bun --cwd web run dev
```

Backend API:

```bash
bun --cwd backend/api run dev
```

## Type/compile checks

Backend compile:

```bash
bun --cwd backend/api run compile
```

Web typecheck:

```bash
npx tsc --project web/tsconfig.json --noEmit
```

## Environment configuration

Primary env config lives in:

- `common/src/envs/prod.ts`
- `common/src/envs/dev.ts`
- `common/src/envs/constants.ts`

Set `NEXT_PUBLIC_APP_DOMAIN`, Firebase, and Supabase vars for your StartupShell environments.

For email safety, keep `MINIMAL_EMAIL_MODE=true` and explicitly allow only essential templates/subjects.

## Design system

The app now uses the StartupShell palette and Titillium Web base font:

- Palette and token mappings: `web/styles/globals.css`
- App font injection: `web/pages/_app.tsx`
