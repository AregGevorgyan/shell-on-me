# Deployment Guide

## Services

| Service | Platform | Notes |
|---|---|---|
| Web | Vercel | https://shell-on-me-market.vercel.app — auto-deploys on push to `main` |
| API | Render (free tier) | Docker, auto-deploys on push to `main` |
| Scheduler | AWS ECS Fargate | Always-on, deploy via script |
| Database | Supabase | Postgres, manual schema management |
| Auth | Firebase | Google-only sign-in |

## Prerequisites

Install locally before deploying:

- Bun `1.x`
- Node.js `20+`
- Docker
- AWS CLI (`aws configure` with access to the StartupShell AWS account)
- `firebase` CLI
- `supabase` CLI (for schema changes)
- Render account connected to this repo (one-time setup)

## First-time infrastructure checklist

### 1. Vercel project

Connect the repo to Vercel for `web/`. Configure:

- Root directory: `web/`
- All required `NEXT_PUBLIC_*` variables (see Environment variables section below)

### 2. Firebase project

Create a Firebase project. Configure:

- Google sign-in enabled, all other providers disabled
- Authorized domains: add `shell-on-me-market.vercel.app` (and any custom domain if added later)

**Note: Firebase domain-based sign-in restriction is a paid (Blaze) feature.** Restricting sign-in to `@startupshell.org` accounts cannot be enforced at the Firebase level on the free Spark plan. This restriction is enforced in the backend API auth middleware instead.

Obtain a service account key: Firebase Console → Project Settings → Service Accounts → Generate new private key. You will need this as `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON as a single-line string).

### 3. Supabase project

Provision a Supabase project. Collect:

- Project URL and anon key
- Database connection credentials

Schema lives in `backend/supabase/`. Apply SQL files carefully; back up before destructive changes.

### 4. Render — API

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → New → Web Service → connect this repo
2. Render detects `render.yaml` automatically and configures the service
3. In Render dashboard → Environment, add all secrets listed as comments in `render.yaml`:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (single-line JSON of service account key)
   - All backend secrets listed in the Environment variables section below
4. In Render dashboard → Settings → Health & Alerts, set health check timeout to at least 60s

### 5. AWS ECS Fargate — Scheduler

One-time setup in the AWS console:

1. Create an ECR repository: `shell-scheduler-prod`
2. Create an ECS cluster named `shell` (Fargate launch type)
3. Create a task definition:
   - Family: `shell-scheduler-prod`
   - Launch type: Fargate
   - CPU: 0.5 vCPU, Memory: 2GB
   - Container image: `<account-id>.dkr.ecr.<region>.amazonaws.com/shell-scheduler-prod:latest`
   - Environment variables: set `IS_PROD=true`, `NEXT_PUBLIC_FIREBASE_ENV=PROD`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`, and all backend secrets listed in the Environment variables section below
4. Create a service named `shell-scheduler-prod`:
   - Desired count: 1
   - No load balancer needed

Before first deploy, edit `backend/scheduler/deploy-scheduler-aws.sh` and set `AWS_ACCOUNT_ID` and `AWS_REGION`.

## Deployment environments

Two environments are supported:

- `dev` — `NEXT_PUBLIC_FIREBASE_ENV=DEV`
- `prod` — `NEXT_PUBLIC_FIREBASE_ENV=PROD`

App domains:
- prod: `NEXT_PUBLIC_APP_DOMAIN` (default `startupshell.org`)
- dev: `NEXT_PUBLIC_DEV_APP_DOMAIN` (default `dev.startupshell.org`)

API endpoints:
- prod: `NEXT_PUBLIC_API_ENDPOINT`
- dev: `NEXT_PUBLIC_DEV_API_ENDPOINT`

## Environment variables

### Frontend (Vercel)

```bash
NEXT_PUBLIC_APP_DOMAIN=shell-on-me-market.vercel.app
NEXT_PUBLIC_API_ENDPOINT=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_PRIVATE_BUCKET=
NEXT_PUBLIC_FIREBASE_REGION=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_SUPABASE_INSTANCE_ID=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=
NEXT_PUBLIC_AMPLITUDE_API_KEY=
STARTUPSHELL_ADMIN_IDS=
```

### Backend (Render dashboard + ECS task definition)

Both the API and Scheduler need these env vars set:

```bash
IS_PROD=true
NEXT_PUBLIC_FIREBASE_ENV=PROD
FIREBASE_PROJECT_ID=startupshell
FIREBASE_SERVICE_ACCOUNT_KEY=<JSON string>

# Required:
API_SECRET=
MAILGUN_KEY=
SCHEDULER_AUTH_PASSWORD=
SUPABASE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_PASSWORD=

# Optional (disable features if omitted):
TEST_CREATE_USER_KEY=      # test user creation
REACT_APP_GIPHY_KEY=       # GIF search
TWITTER_API_KEY_JSON=      # Twitter integration
FB_ACCESS_TOKEN=           # Facebook analytics
SPORTSDB_KEY=              # sports markets
PERPLEXITY_API_KEY=        # AI market suggestions
GEMINI_API_KEY=            # AI features
```

### Email safety variables

For a private internal deployment:

```bash
MINIMAL_EMAIL_MODE=true
EMAIL_RECIPIENT_ALLOWLIST_DOMAINS=@startupshell.org
MAILGUN_KEY=
MAILGUN_DOMAIN=
```

Keep `MINIMAL_EMAIL_MODE=true` and recipients allowlisted to `@startupshell.org`.

## Web deployment

Deploys automatically on push to `main`. No manual steps needed.

To trigger manually: Vercel dashboard → Deployments → Redeploy.

### Post-deploy checks

- Homepage loads
- Firebase config initializes
- Login page shows Google-only sign-in
- API requests point to correct domain

## API deployment — Render

Deploys automatically on push to `main`. No manual steps needed.

To trigger manually: Render dashboard → Manual Deploy.

### Health check

```
GET https://<your-render-url>/health
→ {"message":"Server is working."}
```

**Note:** Free tier spins down after 15 min of inactivity. First request after idle will be slow (~30s cold start).

### Rollback

Render dashboard → Deploys → select a prior deploy → Rollback.

## Scheduler deployment — AWS ECS Fargate

```bash
./backend/scheduler/deploy-scheduler-aws.sh prod
```

The script builds the scheduler, pushes the image to ECR, and triggers a new ECS deployment.

### Post-deploy checks

- ECS console shows service stabilized with 1 running task
- Scheduler logs appear in CloudWatch
- No crash loop in task events

### Rollback

AWS console → ECS → Clusters → shell → Services → shell-scheduler-prod → Update service → select previous task definition revision.

## Supabase schema changes

```bash
# Regenerate shared types after schema changes:
bun --cwd common run regen-types
```

Apply SQL files from `backend/supabase/` manually via the Supabase dashboard or CLI. Always back up production before destructive changes.

## Recommended deployment order

1. Apply any Supabase schema changes
2. Deploy the API (push to `main`, Render auto-deploys)
3. Deploy the scheduler if job code changed (`./backend/scheduler/deploy-scheduler-aws.sh prod`)
4. Deploy web (push to `main`, Vercel auto-deploys)
5. Run smoke tests

## Local pre-deploy checks

```bash
bun install
bun --cwd backend/api run compile
npx tsc --project web/tsconfig.json --noEmit
```

## Smoke test checklist

1. Visit the main app domain and verify the page loads
2. Sign in with a valid `@startupshell.org` Google account
3. Confirm a non-StartupShell account cannot proceed
4. Create a test market
5. Place a test trade
6. Resolve the market
7. Confirm market page, portfolio, and notifications render
8. Check API logs (Render dashboard) and scheduler logs (CloudWatch) for errors
9. If email is enabled, verify only allowlisted recipients receive mail

## Rollback

### Web rollback

Vercel dashboard → Deployments → select prior deployment → Promote to Production.

### API rollback

Render dashboard → Deploys → select a prior deploy → Rollback.

### Scheduler rollback

AWS console → ECS → Clusters → shell → Services → shell-scheduler-prod → Update service → select previous task definition revision.

### Database rollback

- If change was additive, prefer a forward fix
- If destructive, restore from backup or execute a prewritten rollback migration
- Do not guess at reversal SQL on live production data

## Authentication and access control

Before production rollout, verify:

- Non-Google auth providers are disabled in Firebase
- `shell-on-me-market.vercel.app` is listed as an authorized domain in Firebase
- `@startupshell.org`-only sign-in is enforced via backend auth middleware (Firebase domain restriction is not available on the free Spark plan)
- `STARTUPSHELL_ADMIN_IDS` is set correctly in Vercel
- Production and dev Firebase projects are not accidentally swapped

## Related files

- `render.yaml`
- `backend/scheduler/deploy-scheduler-aws.sh`
- `.env.example`
- `README.md`
- `common/src/secrets.ts`
- `common/src/envs/prod.ts`
- `common/src/envs/dev.ts`
- `firebase.json`
