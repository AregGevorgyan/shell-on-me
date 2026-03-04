# Plan: StartupShell Internal Prediction Market

> Turn Manifold Markets (open-source) into a private, fake-money betting platform for StartupShell members, accessible only via @startupshell.org Google accounts.

---

## Context

This repo is **Manifold Markets** — a full-stack prediction market platform with:
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS (Vercel)
- **Backend:** Express API (~200+ endpoints) + Supabase PostgreSQL + Firebase Auth
- **Currency:** "Mana" (already virtual/fake — no real money mechanics needed for our purposes)
- **Package manager:** Yarn 1.x workspaces (monorepo with 8 packages)
- **Size:** ~1,763 TypeScript files, ~400k+ LoC, 309 MB

The good news: **Mana is already play money**. The core prediction market mechanics work out of the box. The main work is authentication lockdown, stripping prod-only features, and simplifying the infrastructure.

---

## Phase 1 — Strip the Repo (Reduce Complexity)

Remove packages and features that are irrelevant for an internal org tool.

### 1.1 Delete Unused Packages (Workspace Packages)
These are standalone services with their own Dockerfiles and no bearing on the core web+api:

| Package | Reason to Remove |
|---------|-----------------|
| `native/` | React Native iOS/Android wrapper — not needed |
| `twitch-bot/` | Twitch integration — not needed |
| `backend/discord-bot/` | Discord bot — not needed |
| `docs/` | Public documentation site — not needed |

**Action:** Delete directories, remove from `package.json` workspaces array.

### 1.2 Strip Third-Party Integrations from `backend/api`
Remove all external service integrations that require paid API keys or serve no purpose:

| Integration | Files to Touch | Notes |
|-------------|---------------|-------|
| **Stripe** | `backend/api/src/stripe-endpoints.ts`, any `stripe` import | Real money purchases — remove entirely |
| **Twilio** | Any `twilio` import in `backend/api/src` | SMS verification — remove |
| **Anthropic AI** | Any `@anthropic-ai/sdk` imports | AI-generated market summaries — remove or stub |
| **OpenAI** | Any `openai` imports | Same as above |
| **Amplitude** | `web/lib/amplitude*` imports | Analytics — remove or no-op |
| **Google Tag Manager** | `web/pages/_document.tsx` | Analytics — remove |
| **Manachan tweets** | `backend/supabase/manachan_tweets.sql`, related endpoints | AI tweet feature — remove |

### 1.3 Strip Real-Money Fields & Flows
The currency system has legacy "Cash" and "Spice" alongside Mana. These can be removed:

- Remove `cashBalance`, `spiceBalance` from `User` type (`common/src/user.ts`)
- Remove `ConvertCash`, `ManaPurchase`, `CashBonus` from `txn.ts` transaction types
- Remove any `shop/` purchase flows that involve real currency conversion
- Keep: `ManagramTxn` (mana gifting), `BettingStreakBonus`, `SignupBonus` — these make the experience fun

### 1.4 Remove Social/External Auth Providers
Currently Firebase Auth likely supports Email/Password, Google, and possibly others. We only want Google. Audit `web/lib/firebase/auth.ts` and remove non-Google providers.

### 1.5 Trim CI/CD
- Remove `.github/workflows/` jobs for packages being deleted (discord-bot, scheduler as a service, etc.)
- Keep: TypeScript compilation checks, ESLint, Prettier

**Expected outcome:** Repo size drops from ~309 MB to ~200 MB. Package count reduces from 8 to 4–5. Dependency count drops substantially.

---

## Phase 2 — Authentication: Google OAuth @startupshell.org Only

### 2.1 Strategy

**Recommended approach: Keep Firebase Auth + add a domain-allowlist check at the API layer.**

Firebase Auth doesn't natively restrict Google sign-in to a specific domain, but we can enforce it in two places:
1. **`beforeCreate` Cloud Function (Firebase Auth Blocking Functions)** — reject non-@startupshell.org at the moment of account creation
2. **Backend middleware** — decode the Firebase JWT and check `email.endsWith('@startupshell.org')` before processing any authenticated request

The second alone is sufficient for a private deployment (non-org users can auth but can't do anything). Adding the Cloud Function gives a proper "you're not authorized" message on the login screen.

### 2.2 Firebase Auth Blocking Function

Create a new function in `backend/` (or a minimal new `functions/` package):

```typescript
// functions/src/auth.ts
import * as functions from 'firebase-functions/v2/identity';

export const beforecreate = functions.beforeUserCreated((event) => {
  const email = event.data.email ?? '';
  if (!email.endsWith('@startupshell.org')) {
    throw new functions.HttpsError(
      'permission-denied',
      'Access is restricted to @startupshell.org accounts.'
    );
  }
});
```

Deploy via `firebase deploy --only functions:beforecreate`.

### 2.3 Backend API Middleware

In `backend/api/src/helpers/endpoint.ts`, update the auth helper to verify domain:

```typescript
// After decoding Firebase JWT:
if (!decodedToken.email?.endsWith('@startupshell.org')) {
  throw new APIError(403, 'Access restricted to StartupShell members.');
}
```

### 2.4 Frontend UX

In `web/lib/firebase/auth.ts`, ensure:
- Only `GoogleAuthProvider` is used (remove email/password, anonymous auth)
- On auth error, show a clear "Sign in with your @startupshell.org Google account" message
- Remove or hide the "Sign up" form (login = Google OAuth only)

### 2.5 Alternative: Replace Firebase Auth with NextAuth.js

If Firebase Auth feels like overkill, NextAuth.js is a simpler option:
- Native Google OAuth support with `hd` (hosted domain) parameter to restrict to `startupshell.org`
- Drop Firebase Auth SDK dependency entirely (~50 KB JS)
- Requires reworking `web/lib/firebase/auth.ts` and all `getAuth()` calls

**Verdict:** Firebase Auth is already wired deep into the codebase (~50+ files reference it). Keeping it and layering the domain check is significantly less work. Migrate to NextAuth only if Firebase Auth proves problematic.

---

## Phase 3 — Fake Money Setup

The core currency (Mana / M$) is already virtual. Adjustments needed:

### 3.1 Sign-Up Bonus
Grant new users a generous starting balance so they can participate immediately. Recommended: **M$ 1,000** on account creation.

Find the sign-up bonus in `backend/api/src/` (likely `create-user.ts` or a `SignupBonus` txn handler) and set the value. Ensure this is the only "free money" source.

### 3.2 Periodic Bonus (Optional)
Manifold already has a `BettingStreakBonus` and `QuestReward` system. These incentivize daily engagement — keep them as-is since they use fake Mana.

### 3.3 Remove Real Money Flows
- Delete Stripe webhook handlers: `backend/api/src/stripe-endpoints.ts`
- Remove `ManaPurchase` transaction type and any endpoint that accepts real payment
- Remove any UI showing "Buy Mana" with a dollar amount

### 3.4 Admin Balance Tools
Add or expose an admin endpoint to manually grant/remove Mana for org admins:

```
POST /admin/adjust-balance  { userId, amount, reason }
```

(Check if this already exists as a hidden endpoint — Manifold has extensive admin tooling in `backend/api/src/`.)

---

## Phase 4 — Database & Infrastructure

### 4.1 Supabase Setup (Free Tier Sufficient)
- Create a new Supabase project at supabase.com
- Run all migrations from `backend/supabase/migrations/` in order
- Set up Row Level Security (RLS) policies — the repo includes these already
- Expected org size: <500 users → free tier (500 MB DB, 5 GB bandwidth) is fine

### 4.2 Firebase Project
- Create a new Firebase project at console.firebase.google.com
- Enable **Google Auth** only (disable all other providers)
- Set OAuth redirect domains to your deployment domain
- Add the blocking function from Phase 2

### 4.3 Deployment

| Service | Provider | Tier |
|---------|----------|------|
| **Frontend (Next.js)** | Vercel | Hobby/free |
| **Backend API (Express)** | Railway or Render | Free/starter |
| **Database** | Supabase | Free |
| **Auth** | Firebase | Spark (free) |
| **File Storage** | Firebase Storage or Supabase Storage | Free |

> **Railway** is the recommended API host for simplicity — push a Dockerfile and it just works. Much simpler than GCP for a small internal tool.

### 4.4 Environment Variables
Audit `common/src/envs/constants.ts` and create a clean `.env.local` (web) and `.env` (api) with only the variables needed for your Firebase project and Supabase project. Strip all prod/dev switching logic that references `mantic-markets` or `dev-mantic-markets`.

---

## Phase 5 — Bun Migration

### Should We Do It?

**Short answer: Yes for package management, not yet for runtime.**

| Layer | Bun? | Reasoning |
|-------|------|-----------|
| Package manager (`bun install`) | **Yes** | 10–25× faster than `yarn install`. Drop-in replacement for Yarn workspaces. Bun supports `workspaces` in `package.json` natively. |
| Test runner (`bun test`) | **Yes** | Drop-in for Jest with compatible APIs. Eliminates `jest` + `ts-jest` dependencies. |
| Frontend dev (`bun run dev`) | **Yes** | Next.js officially supports Bun as a package manager. `next dev` still runs via Node. |
| Backend runtime (replace `node`) | **Not yet** | `backend/api` uses `firebase-admin`, `pg-promise`, and PM2 — compatibility with Bun runtime is not fully validated. Low risk/reward tradeoff for a first deploy. |

### 5.1 Migration Steps

**Step 1: Remove Yarn, add Bun**
```bash
# Delete yarn.lock and node_modules
rm yarn.lock
find . -name node_modules -type d -maxdepth 3 -exec rm -rf {} +

# Install Bun (if not already)
curl -fsSL https://bun.sh/install | bash

# Install all workspace packages
bun install   # generates bun.lockb
```

**Step 2: Update `package.json` scripts**
Replace `yarn` with `bun run` or `bun` in all `scripts` fields across workspace packages:
```json
// Before
"dev": "yarn next dev"
// After
"dev": "bun run next dev"
```

**Step 3: Update CI/CD**
```yaml
# .github/workflows/check.yml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
- run: bun install --frozen-lockfile
- run: bun run build
```

**Step 4: Migrate tests (optional but nice)**
```json
// package.json
"scripts": {
  "test": "bun test"  // replaces: "jest --runInBand"
}
```
Remove `jest`, `ts-jest`, `@types/jest` from dependencies. `bun test` supports the same `describe`/`it`/`expect` API.

**Step 5: Replace nodemon (backend dev)**
```json
// Before
"dev": "nodemon --exec ts-node src/index.ts"
// After
"dev": "bun --watch src/index.ts"
```

### 5.2 Caveats
- **`bun.lockb` is binary** — diffs in PRs won't be human-readable. Acceptable for a small team.
- **Bun workspaces** work the same as Yarn — no config changes beyond removing `yarn.lock`.
- **Firebase Admin SDK** works with Bun runtime in most cases, but stick with Node for production backend until confirmed.

---

## Phase 6 — Branding & UX Polish (Optional)

Small changes to make it feel like a StartupShell tool:

- Replace Manifold logo and "Mana" branding with StartupShell equivalents (or keep Mana as-is — it's fun)
- Update `web/public/` favicon and OG images
- Add a homepage banner explaining the platform to new members
- Set a `robots.txt` to `Disallow: /` (no indexing — this is internal)
- Optionally seed the platform with a few starter markets about org topics (fundraising rounds, demo day outcomes, etc.)

---

## Execution Order

```
Phase 1: Strip repo          ← Do first, reduces noise for all later work
Phase 2: Auth lockdown       ← Critical, do before any deployment
Phase 3: Fake money setup    ← Quick, mostly config changes
Phase 4: DB & infra setup    ← Can parallelize with Phases 2–3
Phase 5: Bun migration       ← Do after initial deploy is working; low risk
Phase 6: Branding            ← Last, cosmetic
```

---

## Key Files to Touch (Summary)

| File | Change |
|------|--------|
| `package.json` (root) | Remove native/, twitch-bot/, discord-bot/, docs/ from workspaces |
| `common/src/user.ts` | Remove `cashBalance`, `spiceBalance` fields |
| `common/src/txn.ts` | Remove real-money txn types (ManaPurchase, ConvertCash, etc.) |
| `common/src/envs/constants.ts` | Clean up to only StartupShell project IDs |
| `web/lib/firebase/auth.ts` | Google-only auth + domain check on client |
| `backend/api/src/helpers/endpoint.ts` | Domain check middleware (`@startupshell.org`) |
| `backend/api/src/stripe-endpoints.ts` | Delete entire file |
| `backend/api/src/create-user.ts` | Set M$ 1,000 signup bonus |
| `backend/supabase/config.toml` | Point to new Supabase project |
| `yarn.lock` → `bun.lockb` | Package manager migration |
| `.github/workflows/check.yml` | Bun CI setup |
| `web/public/` | Favicon, OG image, robots.txt |

---

## What We Keep (Mostly Untouched)

- Core CPMM market math (`common/src/calculate-cpmm.ts`) — battle-tested, keep it
- Betting mechanics and limit orders — keep as-is
- All ~200 API endpoints for market creation/trading/resolution — keep
- Supabase schema and migrations — keep (just run against new project)
- Leagues, betting streaks, quest system — keep (makes it more fun)
- Comments, groups/topics, user profiles — keep
- Real-time WebSocket updates — keep
- Moderation tools (admin ban, etc.) — keep (useful for org admins)

---

## Estimated Effort

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1: Strip | 1–2 days | Mostly deleting files and untangling imports |
| Phase 2: Auth | 0.5–1 day | Firebase config + 1 blocking function + middleware |
| Phase 3: Money | 2–4 hours | Config changes + delete Stripe files |
| Phase 4: Infra | 0.5–1 day | Supabase + Firebase project setup + Railway deploy |
| Phase 5: Bun | 2–4 hours | `rm yarn.lock && bun install` + CI update |
| Phase 6: Branding | 1–2 hours | Replace images and copy |
| **Total** | **~4–6 days** | Assuming 1–2 engineers |
