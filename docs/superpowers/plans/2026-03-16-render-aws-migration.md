# GCP to Render + AWS Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all GCP dependencies from the backend, deploy the API on Render free tier and the Scheduler on AWS ECS Fargate.

**Architecture:** Single-process Node API on Render (free tier, Docker, Git-push deploys). Long-running Scheduler container on AWS ECS Fargate (always-on, AWS credits). Secrets become plain environment variables. GCP monitoring replaced by structured JSON stdout logging.

**Tech Stack:** Node 20, Docker, Render Web Service, AWS ECS Fargate + ECR, Bun (build tool), Firebase Admin SDK, Supabase

**Spec:** `docs/superpowers/specs/2026-03-16-render-aws-migration-design.md`

---

## File Map

**Modified:**
- `common/src/secrets.ts` — remove Secret Manager, read from `process.env`
- `backend/shared/src/monitoring/metric-writer.ts` — replace GCP client with `console.log`
- `backend/shared/src/monitoring/log.ts` — replace `IS_GCP` check with `IS_PROD`
- `backend/shared/src/utils.ts` — replace `LOCAL_DEV` check (must be done before serve.ts)
- `backend/api/src/serve.ts` — fix Firebase Admin init for Render
- `backend/api/src/health.ts` — remove auth wrapper (Render health check probe is unauthenticated)
- `backend/scheduler/src/utils.ts` — fix Firebase init + secrets init for ECS
- `backend/api/Dockerfile` — remove PM2, single process, 400MB heap
- `backend/scheduler/Dockerfile` — remove `--inspect`, reduce heap to 1GB
- `backend/api/package.json` — remove GCP deps
- `backend/scheduler/package.json` — remove GCP deps
- `backend/shared/package.json` — remove GCP deps

**Created:**
- `render.yaml` — Render service definition
- `backend/scheduler/deploy-scheduler-aws.sh` — ECS deploy script

**Deleted:**
- `backend/api/deploy-api.sh`
- `backend/scheduler/deploy-scheduler.sh`
- `backend/api/ecosystem.config.js`
- `backend/shared/src/monitoring/instance-info.ts`

**Docs updated:**
- `deploy.md` — full rewrite for Render + AWS
- `plan.md` — update deployment section

---

## Chunk 1: Code Changes

### Task 1: Rewrite `common/src/secrets.ts`

**Files:**
- Modify: `common/src/secrets.ts`

Remove the `@google-cloud/secret-manager` import and GCP-based `getSecrets()` implementation. Replace with a simple `process.env` reader. Remove `getServiceAccountCredentials` entirely — it's dead code after this migration.

- [ ] **Step 1: Replace the file contents**

```typescript
import { zip } from 'lodash'

// List of secrets available to backend (api, scheduler, scripts, etc.)
// Set these as environment variables in Render dashboard and ECS task definition.
export const secrets = (
  [
    'API_SECRET',
    'DREAM_KEY',
    'MAILGUN_KEY',
    'OPENAI_API_KEY',
    'SCHEDULER_AUTH_PASSWORD',
    'STRIPE_APIKEY',
    'STRIPE_WEBHOOKSECRET',
    'SUPABASE_KEY',
    'SUPABASE_JWT_SECRET',
    'SUPABASE_PASSWORD',
    'TEST_CREATE_USER_KEY',
    'NEWS_API_KEY',
    'REACT_APP_GIPHY_KEY',
    'TWITTER_API_KEY_JSON',
    'DESTINY_API_KEY',
    'FB_ACCESS_TOKEN',
    'GEODB_API_KEY',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_SID',
    'TWILIO_VERIFY_SID',
    'GIDX_API_KEY',
    'GIDX_MERCHANT_ID',
    'GIDX_PRODUCT_TYPE_ID',
    'GIDX_DEVICE_TYPE_ID',
    'GIDX_ACTIVITY_TYPE_ID',
    'ANTHROPIC_API_KEY',
    'PERPLEXITY_API_KEY',
    'FIRECRAWL_API_KEY',
    'SPORTSDB_KEY',
    'VERIFIED_PHONE_NUMBER',
    'GEMINI_API_KEY',
  ] as const
).concat()

type SecretId = (typeof secrets)[number]

// Reads secrets from environment variables.
// All secrets must be set as env vars in Render dashboard / ECS task definition.
export const getSecrets = async (_credentials?: any, ...ids: SecretId[]) => {
  const secretIds = ids.length > 0 ? ids : secrets
  const pairs = secretIds.map((id) => [id, process.env[id]] as [string, string])
  return Object.fromEntries(pairs)
}

// Loads secrets into process.env (no-op on Render/ECS where they're already set,
// but keeps the same interface for local dev compatibility).
export const loadSecretsToEnv = async (_credentials?: any) => {
  const allSecrets = await getSecrets()
  for (const [key, value] of Object.entries(allSecrets)) {
    if (key && value && !process.env[key]) {
      process.env[key] = value
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from repo root:
```bash
cd "backend/api" && bun run build 2>&1 | head -30
```
Expected: no errors referencing `secrets.ts` or `@google-cloud/secret-manager`

- [ ] **Step 3: Commit**

```bash
git add common/src/secrets.ts
git commit -m "chore: replace GCP Secret Manager with process.env reads"
```

---

### Task 2: Delete `instance-info.ts`, rewrite `metric-writer.ts`

**Files:**
- Delete: `backend/shared/src/monitoring/instance-info.ts`
- Modify: `backend/shared/src/monitoring/metric-writer.ts`

`MetricWriter` currently writes to GCP Cloud Monitoring. Replace the whole thing with structured JSON stdout logging. The `MetricStore` interface and `metrics` export stay the same so callers need no changes.

- [ ] **Step 1: Delete `instance-info.ts`**

```bash
rm "backend/shared/src/monitoring/instance-info.ts"
```

- [ ] **Step 2: Replace `metric-writer.ts`**

```typescript
import { log } from 'shared/utils'
import { MetricStore } from './metrics'

export const METRICS_INTERVAL_MS = 60_000

/** Logs fresh metric entries as structured JSON to stdout. */
export class MetricWriter {
  store: MetricStore
  intervalMs: number
  runInterval?: NodeJS.Timeout

  constructor(store: MetricStore, intervalMs: number) {
    this.store = store
    this.intervalMs = intervalMs
  }

  async write() {
    const freshEntries = this.store.freshEntries()
    if (freshEntries.length > 0) {
      for (const entry of freshEntries) {
        entry.fresh = false
      }
      this.store.clearDistributionGauges()
      log.debug('Metrics snapshot', { entries: freshEntries })
    }
  }

  start() {
    if (!this.runInterval) {
      this.runInterval = setInterval(async () => {
        try {
          await this.write()
        } catch (error) {
          log.error('Failed to write metrics.', { error })
        }
      }, this.intervalMs)
    }
  }

  stop() {
    clearTimeout(this.runInterval)
  }
}

import { metrics } from './metrics'
export const METRIC_WRITER = new MetricWriter(metrics, METRICS_INTERVAL_MS)
```

- [ ] **Step 3: Verify build**

```bash
cd "backend/api" && bun run build 2>&1 | head -30
```
Expected: no errors referencing `instance-info` or `@google-cloud/monitoring`

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/monitoring/metric-writer.ts
git rm backend/shared/src/monitoring/instance-info.ts
git commit -m "chore: replace GCP Monitoring with structured stdout logging"
```

---

### Task 3: Update `log.ts` — replace `IS_GCP` with `IS_PROD`

**Files:**
- Modify: `backend/shared/src/monitoring/log.ts`

`IS_GCP` is `true` when `GOOGLE_CLOUD_PROJECT` is set. On Render/ECS that var is absent, so logs silently switch to human-readable format. Replace with `IS_PROD` so structured JSON logging works on both platforms.

- [ ] **Step 1: Replace the `IS_GCP` constant**

Find line: `const IS_GCP = process.env.GOOGLE_CLOUD_PROJECT != null`

Replace with:
```typescript
const IS_PROD = process.env.IS_PROD === 'true'
```

- [ ] **Step 2: Replace all uses of `IS_GCP` with `IS_PROD` in the same file**

The only usage is in `writeLog()`:
```typescript
// before
if (IS_GCP) {
// after
if (IS_PROD) {
```

- [ ] **Step 3: Verify build**

```bash
cd "backend/api" && bun run build 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/monitoring/log.ts
git commit -m "chore: use IS_PROD flag for structured logging instead of GOOGLE_CLOUD_PROJECT"
```

---

### Task 4: Update `utils.ts` — fix `LOCAL_DEV` (**must precede Task 5**)

**Files:**
- Modify: `backend/shared/src/utils.ts`

`LOCAL_DEV` is currently `process.env.GOOGLE_CLOUD_PROJECT == null`. On Render/ECS, `GOOGLE_CLOUD_PROJECT` is absent, making `LOCAL_DEV = true` in production — which causes `serve.ts` to take the wrong init path and never initialize Firebase correctly.

- [ ] **Step 1: Find the `LOCAL_DEV` definition**

```bash
grep -n "LOCAL_DEV" "backend/shared/src/utils.ts"
```

- [ ] **Step 2: Replace the `LOCAL_DEV` line**

Replace:
```typescript
export const LOCAL_DEV = process.env.GOOGLE_CLOUD_PROJECT == null
```
With:
```typescript
export const LOCAL_DEV = process.env.IS_PROD !== 'true'
```

- [ ] **Step 3: Verify build**

```bash
cd "backend/api" && bun run build 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/utils.ts
git commit -m "chore: detect local dev via IS_PROD flag instead of GOOGLE_CLOUD_PROJECT"
```

---

### Task 5: Update `backend/api/src/serve.ts` — fix Firebase init

**Files:**
- Modify: `backend/api/src/serve.ts`

With `LOCAL_DEV` fixed (Task 4), the `else` branch now runs on Render. It currently reads `GOOGLE_CLOUD_PROJECT` — replace with `FIREBASE_PROJECT_ID` and add `FIREBASE_SERVICE_ACCOUNT_KEY` credential. Also remove the now-dead `getServiceAccountCredentials` import and usage.

- [ ] **Step 1: Update the file**

Current content:
```typescript
import * as admin from 'firebase-admin'
import { getLocalEnv, initAdmin } from 'shared/init-admin'
import { loadSecretsToEnv, getServiceAccountCredentials } from 'common/secrets'
import { LOCAL_DEV, log } from 'shared/utils'
...

if (LOCAL_DEV) {
  initAdmin()
} else {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  admin.initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
  })
}

...

const credentials = LOCAL_DEV
  ? getServiceAccountCredentials(getLocalEnv())
  : undefined
```

Replace the import line and the two affected blocks:

```typescript
// Change import — remove getServiceAccountCredentials
import { loadSecretsToEnv } from 'common/secrets'

// Change Firebase init block
if (LOCAL_DEV) {
  initAdmin()
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID
  admin.initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
    ),
  })
}

// Change credentials assignment and loadSecretsToEnv call — no args needed
const credentials = undefined  // remove this line entirely

// Further down in startupProcess():
await loadSecretsToEnv()  // remove the credentials argument
```

Also remove `getLocalEnv` from the import if it's no longer used after this change (check if it's used elsewhere in the file first).

- [ ] **Step 2: Verify build**

```bash
cd "backend/api" && bun run build 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/api/src/serve.ts
git commit -m "chore: initialize Firebase Admin with FIREBASE_PROJECT_ID on Render"
```

---

### Task 6: Update `backend/scheduler/src/utils.ts` — fix Firebase + secrets init

**Files:**
- Modify: `backend/scheduler/src/utils.ts`

`initFirebase()` tries GCP auto-discovery first, falls back to local credentials. `initSecrets()` does the same for secrets. Both try/catch patterns silently swallow missing env vars in production. Replace both with direct initialization using `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_KEY`.

- [ ] **Step 1: Replace the file**

```typescript
import * as admin from 'firebase-admin'
import { initAdmin } from 'shared/init-admin'
import { loadSecretsToEnv } from 'common/secrets'
import { LOCAL_DEV, log } from 'shared/utils'

export function initFirebase() {
  if (LOCAL_DEV) {
    initAdmin()
    log.info('Initialized Firebase using local credentials.')
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID
    admin.initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
      ),
    })
    log.info(`Initialized Firebase for project ${projectId}.`)
  }
}

export async function initSecrets() {
  await loadSecretsToEnv()
  log.info('Secrets ready.')
}
```

- [ ] **Step 2: Verify build**

```bash
cd "backend/scheduler" && bun run build 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/scheduler/src/utils.ts
git commit -m "chore: initialize Firebase and secrets without GCP credential fallback"
```

---

### Task 7: Fix `backend/api/src/health.ts` — make health endpoint public

**Files:**
- Modify: `backend/api/src/health.ts`

Render's health check probe sends an unauthenticated GET to `/health`. The current route is wrapped in `authEndpoint` which returns 401 for unauthenticated requests — Render will mark the service unhealthy.

- [ ] **Step 1: Check how the health route is registered**

```bash
grep -rn "health" "backend/api/src/app.ts" "backend/api/src/old-routes.ts" 2>/dev/null | head -20
```
Note the route registration pattern so the replacement export matches what's expected.

- [ ] **Step 2: Replace with a plain handler**

The new handler must not reference `auth` (no auth wrapper), and must return a plain 200 JSON response:

```typescript
import { RequestHandler } from 'express'

export const health: RequestHandler = (_req, res) => {
  res.json({ message: 'Server is working.' })
}
```

- [ ] **Step 3: Verify build**

```bash
cd "backend/api" && bun run build 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/api/src/health.ts
git commit -m "fix: make health endpoint public for Render health checks"
```

---

### Task 8: Update `backend/api/Dockerfile` — remove PM2, single process

**Files:**
- Modify: `backend/api/Dockerfile`

- [ ] **Step 1: Replace the Dockerfile**

```dockerfile
# prereq: first do `bun run build` to compile typescript & etc.

FROM node:20-alpine
WORKDIR /usr/src/app

# first get dependencies in for efficient docker layering
COPY dist/package.json dist/bun.lock ./
RUN npm install --omit=dev

# then copy over typescript payload
COPY dist ./

EXPOSE 80/tcp

CMD ["node", "--max-old-space-size=400", "backend/api/lib/serve.js"]
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/Dockerfile
git commit -m "chore: simplify API Dockerfile to single process, remove PM2"
```

---

### Task 9: Update `backend/scheduler/Dockerfile` — remove `--inspect`, reduce heap

**Files:**
- Modify: `backend/scheduler/Dockerfile`

- [ ] **Step 1: Replace the ENTRYPOINT line**

Current:
```dockerfile
ENTRYPOINT [ "node", "--inspect", "--max-old-space-size=14336", "backend/scheduler/lib/index.js" ]
```

Replace with:
```dockerfile
ENTRYPOINT [ "node", "--max-old-space-size=1024", "backend/scheduler/lib/index.js" ]
```

- [ ] **Step 2: Commit**

```bash
git add backend/scheduler/Dockerfile
git commit -m "chore: remove --inspect flag and reduce scheduler heap for ECS Fargate"
```

---

### Task 10: Remove GCP dependencies from package.json files

**Files:**
- Modify: `backend/api/package.json`
- Modify: `backend/scheduler/package.json`
- Modify: `backend/shared/package.json`

- [ ] **Step 1: Remove from each package.json**

Remove the following packages from whichever files contain them (not all packages are in all files):

| Package | In api? | In scheduler? | In shared? |
|---|---|---|---|
| `@google-cloud/secret-manager` | yes | yes | yes |
| `@google-cloud/monitoring` | yes | yes | yes |
| `gcp-metadata` | yes | yes | yes |

- [ ] **Step 2: Reinstall to update lockfile**

```bash
bun install
```

- [ ] **Step 3: Verify builds still pass**

```bash
cd "backend/api" && bun run build 2>&1 | tail -5
cd "backend/scheduler" && bun run build 2>&1 | tail -5
```
Expected: no errors in either

- [ ] **Step 4: Commit**

```bash
git add backend/api/package.json backend/scheduler/package.json backend/shared/package.json bun.lockb
git commit -m "chore: remove @google-cloud/* and gcp-metadata dependencies"
```

---

### Task 11: Delete old GCP files

**Files:**
- Delete: `backend/api/deploy-api.sh`
- Delete: `backend/scheduler/deploy-scheduler.sh`
- Delete: `backend/api/ecosystem.config.js`

- [ ] **Step 1: Delete the files**

```bash
git rm backend/api/deploy-api.sh
git rm backend/scheduler/deploy-scheduler.sh
git rm backend/api/ecosystem.config.js
# Note: instance-info.ts was already deleted in Task 2
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove GCP deploy scripts and PM2 ecosystem config"
```

---

## Chunk 2: Deployment Config + Docs

### Task 12: Create `render.yaml`

**Files:**
- Create: `render.yaml` (repo root)

- [ ] **Step 1: Create the file**

```yaml
services:
  - type: web
    name: shell-api
    runtime: docker
    dockerfilePath: ./backend/api/Dockerfile
    plan: free
    healthCheckPath: /health
    envVars:
      - key: NEXT_PUBLIC_FIREBASE_ENV
        value: PROD
      - key: IS_PROD
        value: "true"
      - key: FIREBASE_PROJECT_ID
        value: startupshell
      # Set these manually in the Render dashboard (mark as secret):
      # FIREBASE_SERVICE_ACCOUNT_KEY   (JSON string of service account key)
      # API_SECRET
      # DREAM_KEY
      # MAILGUN_KEY
      # OPENAI_API_KEY
      # SCHEDULER_AUTH_PASSWORD
      # STRIPE_APIKEY
      # STRIPE_WEBHOOKSECRET
      # SUPABASE_KEY
      # SUPABASE_JWT_SECRET
      # SUPABASE_PASSWORD
      # TEST_CREATE_USER_KEY
      # NEWS_API_KEY
      # REACT_APP_GIPHY_KEY
      # TWITTER_API_KEY_JSON
      # DESTINY_API_KEY
      # FB_ACCESS_TOKEN
      # GEODB_API_KEY
      # TWILIO_AUTH_TOKEN
      # TWILIO_SID
      # TWILIO_VERIFY_SID
      # GIDX_API_KEY
      # GIDX_MERCHANT_ID
      # GIDX_PRODUCT_TYPE_ID
      # GIDX_DEVICE_TYPE_ID
      # GIDX_ACTIVITY_TYPE_ID
      # ANTHROPIC_API_KEY
      # PERPLEXITY_API_KEY
      # FIRECRAWL_API_KEY
      # SPORTSDB_KEY
      # VERIFIED_PHONE_NUMBER
      # GEMINI_API_KEY
```

- [ ] **Step 2: Verify in Render dashboard after first deploy**

Free tier has no persistent health check between deploys. After connecting the repo, verify in Render dashboard → Settings → Health & Alerts that the health check timeout is set to at least 60s to account for cold starts.

- [ ] **Step 3: Commit**

```bash
git add render.yaml
git commit -m "chore: add render.yaml for Render Web Service deployment"
```

---

### Task 13: Create `backend/scheduler/deploy-scheduler-aws.sh`

**Files:**
- Create: `backend/scheduler/deploy-scheduler-aws.sh`

- [ ] **Step 1: Create the file**

```bash
#!/bin/bash
set -euo pipefail

# Configure these before running
AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"   # e.g. 123456789012
AWS_REGION="us-east-1"             # your preferred region

ENV=${1:-prod}
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/shell-scheduler-${ENV}"
CLUSTER="shell"
SERVICE="shell-scheduler-${ENV}"

cd "$(dirname "$0")/../.."

echo "Building scheduler..."
bun --cwd backend/scheduler run build

echo "Logging in to ECR..."
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "Building and pushing Docker image..."
docker build -t "shell-scheduler-${ENV}" ./backend/scheduler
docker tag "shell-scheduler-${ENV}:latest" "$ECR_URI:latest"
docker push "$ECR_URI:latest"

echo "Updating ECS service..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment

echo "Deploy triggered. Monitor rollout in the AWS ECS console."
```

- [ ] **Step 2: Make executable**

```bash
chmod +x backend/scheduler/deploy-scheduler-aws.sh
```

- [ ] **Step 3: Commit**

```bash
git add backend/scheduler/deploy-scheduler-aws.sh
git commit -m "chore: add AWS ECS Fargate deploy script for scheduler"
```

---

### Task 14: Audit and trim scheduler jobs

**Files:**
- Modify: `backend/scheduler/src/jobs/index.ts`

Review every job in `createJobs()` and remove any that are Manifold-specific and not relevant to StartupShell.

- [ ] **Step 1: Read the full jobs list**

```bash
grep -n "createJob\|'[a-z]" backend/scheduler/src/jobs/index.ts | head -100
```

- [ ] **Step 2: For each job, decide: keep or remove?**

Use this full reference list (from `index.ts` imports):

| Job | Decision | Reason |
|---|---|---|
| `auto-leagues-cycle` | keep | leagues feature |
| `send-market-close-emails` | keep | market emails |
| `update-contract-metrics` | keep | core market data |
| `update-contract-metrics-full` | keep | core market data |
| `update-creator-metrics` | keep | user metrics |
| `update-user-metric-periods` | keep | user metrics |
| `update-user-portfolio-histories` | keep | user portfolio |
| `downsample-portfolio-history` | keep | DB housekeeping |
| `send-weekly-markets-emails` | keep | email digest |
| `send-portfolio-update-emails` | keep | email digest |
| `apply-pending-clarifications` | keep | market mechanics |
| `auto-award-bounty` | keep if bounty markets exist, else remove | check codebase |
| `clean-old-notifications` | keep | housekeeping |
| `denormalize-answers` | keep | market data |
| `drizzle-liquidity` | keep | market mechanics |
| `expire-limit-orders` | keep | market mechanics |
| `score-contracts` | keep | market scoring |
| `send-market-movement-notifications` | keep | notifications |
| `send-unseen-notifications` | keep | notifications |
| `send-streak-notifications` | keep | streak feature |
| `check-push-notification-receipts` | keep | push notifications |
| `reset-betting-streaks` | keep | streak feature |
| `reset-daily-quest-stats` | keep | quests feature |
| `reset-weekly-quest-stats` | keep | quests feature |
| `reset-weekly-email-flags` | keep | email feature |
| `update-league` | keep | leagues feature |
| `update-league-ranks` | keep | leagues feature |
| `update-stats` | keep | stats/leaderboard |
| `reset-pg-stats` | keep | DB housekeeping |
| `onboarding-notification` | keep | onboarding |
| `group-importance-score` | keep | topic/feed ranking |
| `calculate-user-topic-interests` | keep | feed personalization (core feature) |
| `calculate-conversion-score` | evaluate — check if `conversionScore` field is used in the web app |
| `refresh-ach-account-age` | evaluate — check if achievements UI exists in web/ |
| `refresh-ach-comments` | evaluate — same as above |
| `refresh-ach-creator-contracts` | evaluate — same as above |
| `refresh-ach-creator-traders` | evaluate — same as above |
| `refresh-ach-leagues` | evaluate — same as above |
| `refresh-ach-pnl` | evaluate — same as above |
| `refresh-ach-referrals` | evaluate — same as above |
| `refresh-ach-txns` | evaluate — same as above |
| `refresh-ach-volume` | evaluate — same as above |
| `poll-poll-resolutions` | evaluate — check if poll-type markets exist |
| `process-membership-renewals` | remove — payments code was removed |
| `unban-users` | evaluate — check if ban system exists |

To evaluate uncertain jobs, run:
```bash
# Check for achievements UI
grep -r "achievement" web/src --include="*.tsx" -l | head -5
# Check for poll markets
grep -r "poll" web/src --include="*.tsx" -l | head -5
# Check for ban system
grep -r "isBannedFromPosting\|banUser" web/src -l | head -5
# Check for conversion score usage
grep -r "conversionScore" web/src -l | head -5
```

- [ ] **Step 3: Remove irrelevant jobs and their imports**

For each job being removed:
1. Delete the `createJob(...)` block from `createJobs()`
2. Delete the corresponding `import` at the top of the file
3. If the imported function is only used here, that file may also be deletable (check with `grep -rn "functionName" backend/`)

- [ ] **Step 4: Verify scheduler still builds**

```bash
cd backend/scheduler && bun run build 2>&1 | tail -10
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/scheduler/src/jobs/index.ts
git commit -m "chore: trim scheduler to StartupShell-relevant jobs only"
```

---

### Task 15: Update `deploy.md`

**Files:**
- Modify: `deploy.md`

Full rewrite — remove all GCP sections, add Render and AWS ECS sections.

- [ ] **Step 1: Read current `deploy.md`**

```bash
cat deploy.md
```

- [ ] **Step 2: Rewrite `deploy.md`**

Structure:
```markdown
# Deployment

## Prerequisites
- Node 20, Bun, Docker
- AWS CLI configured (`aws configure`) with access to the StartupShell account
- Render account connected to this repo (one-time setup)

## Services

| Service | Platform | URL |
|---|---|---|
| Web | Vercel | Auto-deploys on push to main |
| API | Render (free tier) | https://shell-api.onrender.com |
| Scheduler | AWS ECS Fargate | Managed via AWS console |
| Database | Supabase | https://app.supabase.com |
| Auth | Firebase | https://console.firebase.google.com |

## API — Render

### First-time setup
1. Connect repo to Render: https://dashboard.render.com → New → Web Service → connect this repo
2. Render detects `render.yaml` automatically
3. In Render dashboard → Environment, add all secret env vars listed in `render.yaml` comments
4. Obtain Firebase service account key JSON from Firebase Console → Project Settings → Service Accounts
5. Add `FIREBASE_SERVICE_ACCOUNT_KEY` as a single-line JSON string

### Deploying
Push to `main` — Render auto-deploys.

Or trigger manually: Render dashboard → Manual Deploy.

### Rollback
Render dashboard → Deploys → select a prior deploy → Rollback.

### Health check
GET https://shell-api.onrender.com/health → should return `{"message":"Server is working."}`

**Note:** Render free tier spins down after 15 min of inactivity. First request after idle will be slow (~30s cold start).

## Scheduler — AWS ECS Fargate

### First-time setup (one-time, done via AWS console)
1. Create ECR repository: `shell-scheduler-prod`
2. Create ECS cluster named `shell` (Fargate type)
3. Create task definition:
   - Family: `shell-scheduler-prod`
   - Launch type: Fargate
   - CPU: 0.5 vCPU, Memory: 2GB
   - Container image: `<account-id>.dkr.ecr.<region>.amazonaws.com/shell-scheduler-prod:latest`
   - Environment variables: set all vars listed in the spec prerequisites (IS_PROD, NEXT_PUBLIC_FIREBASE_ENV, FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_KEY, and all 31 secrets)
4. Create ECS service named `shell-scheduler-prod` using the task definition
   - Desired count: 1
   - No load balancer needed

### Deploying
1. Edit `backend/scheduler/deploy-scheduler-aws.sh` — set `AWS_ACCOUNT_ID` and `AWS_REGION`
2. Run: `./backend/scheduler/deploy-scheduler-aws.sh`

### Rollback
AWS console → ECS → Clusters → shell → Services → shell-scheduler-prod → Update service → select previous task definition revision.

## Web — Vercel

Auto-deploys on push to `main`. No manual steps needed.

## Supabase

Database migrations are run manually via the Supabase dashboard or CLI. No deploy automation.

## Firebase

Auth configuration is managed via the Firebase console. No deploy automation.
```

- [ ] **Step 3: Commit**

```bash
git add deploy.md
git commit -m "docs: rewrite deploy.md for Render + AWS ECS (remove GCP)"
```

---

### Task 16: Update `plan.md`

**Note:** `plan.md` was deleted from the repo (git shows `D plan.md`). Skip this task — the file no longer exists and there is nothing to update.
