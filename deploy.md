# Deployment Guide

This document is a more detailed deployment runbook for this StartupShell fork than the short deployment section in `plan.md`.

## Current deployment shape

This repository is currently structured to deploy across several services:

- `web/`: Next.js frontend, intended for Vercel.
- `backend/api/`: primary backend API, deployed to Google Cloud Compute Engine through `backend/api/deploy-api.sh`.
- `backend/scheduler/`: scheduled job runner, deployed to Google Cloud Compute Engine through `backend/scheduler/deploy-scheduler.sh`.
- `backend/supabase/`: SQL schema files for the Supabase Postgres database.
- Firebase: Google auth and related Firebase project configuration.

The short version is:

- Web goes to Vercel.
- API goes to GCP in `us-east4`.
- Scheduler goes to GCP in `us-east4`.
- Data lives in Supabase.
- Auth is Google-only via Firebase.

## Deployment environments

The codebase supports two main runtime environments:

- `dev`
- `prod`

Those map to:

- Firebase env selector: `NEXT_PUBLIC_FIREBASE_ENV=DEV` or `PROD`
- app domains:
  - prod: `NEXT_PUBLIC_APP_DOMAIN`, default `startupshell.org`
  - dev: `NEXT_PUBLIC_DEV_APP_DOMAIN`, default `dev.startupshell.org`
- API endpoints:
  - prod: `NEXT_PUBLIC_API_ENDPOINT`, default `api.startupshell.org`
  - dev: `NEXT_PUBLIC_DEV_API_ENDPOINT`, default `api.dev.startupshell.org`

The backend deploy scripts still target the original GCP project names:

- dev: `dev-mantic-markets`
- prod: `mantic-markets`

If you intend to deploy into new GCP projects for StartupShell, update the shell scripts before your first real deployment.

## Prerequisites

Install and verify these locally before attempting a deploy:

- Bun `1.x`
- Node.js `20+`
- Docker
- `gcloud` CLI
- `firebase` CLI
- `supabase` CLI if you plan to manage schema changes from the command line
- Vercel access to the target project
- GCP access to the target project(s)
- Supabase project access
- Firebase project access

Recommended local checks:

```bash
bun --version
node --version
docker --version
gcloud --version
firebase --version
```

## First-time infrastructure checklist

Before the first deployment, make sure the following already exists.

### 1. Vercel project

Create a Vercel project connected to this repository for `web/`.

Configure:

- Production branch
- Preview deployments for pull requests if desired
- Custom domains:
  - production app domain, for example `startupshell.org`
  - dev or preview domain as needed
- All required `NEXT_PUBLIC_*` variables in Vercel project settings

### 2. Firebase project(s)

Create separate Firebase projects for dev and prod if you want isolated environments.

Configure each project with:

- Google sign-in enabled
- all other auth providers disabled
- authorized domains added for the relevant app domains
- storage bucket enabled if the app uses uploads
- private deployment policy that only StartupShell users should be able to sign in

For this fork, the expected policy is:

- Google-only login
- `@startupshell.org`-restricted usage

### 3. Supabase project

Provision a Supabase project for each environment you need.

At minimum, collect:

- project ID / instance ID
- anon key
- database connection credentials for backend use

Schema source lives in `backend/supabase/`. This directory contains SQL files rather than a single migration chain. That means you should treat schema rollout carefully:

- apply schema in a controlled order
- validate extensions, indexes, views, functions, and policies
- back up production before destructive changes

If you do not already have an established rollout method for these SQL files, do not improvise directly against production.

### 4. GCP resources for API

The API deploy script assumes:

- region `us-east4`
- zone `us-east4-a`
- managed instance group named `api-group-east`
- container image registry in Artifact Registry under `builds/api`
- several reserved static IPs named `api-static-ip-1` through `api-static-ip-4`

The script creates a new instance template on each deploy and then performs a rolling update against the managed instance group.

### 5. GCP resources for scheduler

The scheduler deploy script assumes:

- region `us-east4`
- zone `us-east4-a`
- compute instance named `scheduler`
- reserved address named `scheduler-east` when initializing a new instance
- container image registry in Artifact Registry under `builds/scheduler`

Unlike the API, the scheduler is updated in place unless you manually set `INITIALIZE=true` in the script.

### 6. Secrets management

Backend secrets should not be stored in source control.

Current repo guidance indicates:

- GCP runtime secrets are managed with Google Secret Manager
- the allowlisted secret names are defined in `backend/shared/src/secrets.ts`

If you add a new backend secret:

1. Add it in Google Secret Manager.
2. Update `backend/shared/src/secrets.ts`.
3. Confirm the runtime can read it in the target environment.

## Environment variables

Start from `.env.example` for local reference. For actual deployments, split variables by platform:

- Vercel: public frontend variables
- GCP / Secret Manager: backend secrets and runtime config
- Firebase / Supabase consoles: service-specific credentials

### Shared branding and domain variables

These matter across environments:

```bash
NEXT_PUBLIC_APP_DOMAIN=startupshell.org
NEXT_PUBLIC_DEV_APP_DOMAIN=dev.startupshell.org
NEXT_PUBLIC_MONEY_MONIKER=Shell Token
```

### Production frontend variables

These are read by `common/src/envs/prod.ts`:

```bash
NEXT_PUBLIC_APP_DOMAIN=
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
NEXT_PUBLIC_CLOUD_RUN_ID=
NEXT_PUBLIC_CLOUD_RUN_REGION=
STARTUPSHELL_ADMIN_IDS=
```

### Development frontend variables

These are read by `common/src/envs/dev.ts`:

```bash
NEXT_PUBLIC_DEV_APP_DOMAIN=
NEXT_PUBLIC_DEV_API_ENDPOINT=
NEXT_PUBLIC_DEV_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_DEV_FIREBASE_API_KEY=
NEXT_PUBLIC_DEV_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_DEV_FIREBASE_APP_ID=
NEXT_PUBLIC_DEV_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_DEV_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_DEV_FIREBASE_PRIVATE_BUCKET=
NEXT_PUBLIC_DEV_FIREBASE_REGION=
NEXT_PUBLIC_DEV_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_DEV_SUPABASE_INSTANCE_ID=
NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEV_AMPLITUDE_API_KEY=
NEXT_PUBLIC_DEV_CLOUD_RUN_ID=
NEXT_PUBLIC_DEV_CLOUD_RUN_REGION=
STARTUPSHELL_DEV_ADMIN_IDS=
```

### Email safety variables

For a private internal deployment, keep email restricted:

```bash
MINIMAL_EMAIL_MODE=true
ESSENTIAL_EMAIL_TEMPLATES=
ESSENTIAL_EMAIL_SUBJECT_KEYWORDS=account,security,verification,password,sign-in,signin,login,otp,2fa
EMAIL_RECIPIENT_ALLOWLIST_DOMAINS=@startupshell.org
MAILGUN_KEY=
MAILGUN_DOMAIN=
```

Recommended default posture:

- keep `MINIMAL_EMAIL_MODE=true`
- keep outbound recipients allowlisted to `@startupshell.org`
- only configure Mailgun if you actually need outbound mail

## Authentication and access control expectations

This fork is intended to be private. Before production rollout, verify:

- non-Google auth providers are disabled in Firebase
- StartupShell-only sign-in is enforced in backend and frontend behavior
- admin IDs are set via `STARTUPSHELL_ADMIN_IDS` and `STARTUPSHELL_DEV_ADMIN_IDS`
- production and dev Firebase projects are not accidentally swapped

## Local pre-deploy checks

Run these from the repo root before deploying anything:

```bash
bun install
bun --cwd backend/api run compile
npx tsc --project web/tsconfig.json --noEmit
```

Recommended additional checks:

```bash
bun --cwd web run build
bun --cwd backend/api run build
bun --cwd backend/scheduler run build
```

If you changed schema-sensitive backend code, also validate your Supabase connectivity and expected tables/views/functions before deployment.

## GCP authentication setup

Before running the deploy scripts:

```bash
gcloud auth login
gcloud auth application-default login
gcloud auth configure-docker us-east4-docker.pkg.dev
```

Then verify project access:

```bash
gcloud projects list
```

If you are deploying to a new StartupShell-owned GCP project rather than the hardcoded legacy Manifold project IDs, update the deploy scripts first.

## Web deployment

The web app is the simplest part operationally if Vercel is configured correctly.

### Manual Vercel deployment path

1. Ensure the Vercel project points at `web/`.
2. Add all required production or preview environment variables in Vercel.
3. Trigger a deployment through Git integration or the Vercel dashboard.
4. Confirm the deployment uses the expected environment values.

### What to verify after web deploy

- homepage loads
- Firebase config initializes successfully
- login page only offers the intended auth path
- API requests point to the correct domain
- assets and favicon load correctly

## API deployment

The API deploy is handled by `backend/api/deploy-api.sh`.

### What the script does

At a high level it:

1. Builds the API package with `bun run build`.
2. Builds and pushes a Docker image.
3. Creates a new Compute Engine instance template.
4. Attaches an available reserved static IP.
5. Rolls the managed instance group to the new template.
6. Waits for the group to become stable.

### Standard deploy command

From `backend/api/`:

```bash
./deploy-api.sh dev
./deploy-api.sh prod
```

### Notes about the API deploy

- Local Docker is required unless you explicitly set `MANIFOLD_CLOUD_BUILD=1`.
- The script assumes the backend service already exists.
- It uses `NEXT_PUBLIC_FIREBASE_ENV` and `GOOGLE_CLOUD_PROJECT` as container env vars.
- It assumes load-balancer and instance-group infrastructure already exists.
- It does not update the URL map by default; that section is commented out in the script.

### API post-deploy checks

After deployment, verify:

- the managed instance group is stable
- the health check passes
- the API domain resolves to the expected load balancer
- authenticated requests work
- market creation and trading endpoints behave normally

If you need to inspect the running API host, the repo includes `backend/api/debug.sh` for SSH access to the active instance.

## Scheduler deployment

The scheduler deploy is handled by `backend/scheduler/deploy-scheduler.sh`.

### Standard deploy command

From `backend/scheduler/`:

```bash
./deploy-scheduler.sh dev
./deploy-scheduler.sh prod
```

### What the script does

1. Builds the scheduler package.
2. Prunes old Docker images on the target VM.
3. Builds and pushes a new container image.
4. Updates the existing Compute Engine instance to use that image.

### Scheduler caveats

- `INITIALIZE=false` by default, so this script expects the scheduler VM to already exist.
- If you need to create the VM from scratch, edit the script carefully and understand the `INITIALIZE=true` path before using it.
- Machine type changes are noted in the script as something that may also need console-side changes.

### Scheduler post-deploy checks

- instance update succeeds
- scheduled jobs start normally
- outbound notifications and emails remain within expected limits
- no crash loop appears on the VM

## Supabase deployment and schema changes

This repo does not present a single one-command production migration flow. The schema is represented as SQL files under `backend/supabase/`.

Because of that, production DB changes should follow a conservative process:

1. Back up the target database.
2. Apply SQL in staging or dev first.
3. Regenerate shared types if needed:

```bash
bun --cwd common run regen-types
```

For the dev schema target:

```bash
bun --cwd common run regen-types-dev
```

4. Run backend and web typechecks again.
5. Only then apply the production SQL changes.

If you are making destructive schema changes, write a separate rollback plan before you touch production.

## Recommended deployment order

For most releases, use this order:

1. Prepare and validate env vars, secrets, and access.
2. Apply any Supabase schema changes.
3. Deploy the API.
4. Deploy the scheduler if the release affects jobs, notifications, emails, or scheduled processing.
5. Deploy the web frontend.
6. Run smoke tests.

Reasoning:

- web should generally deploy after the backend it depends on
- schema changes should land before code that requires them
- scheduler only needs deployment when its code or dependent shared logic changed

## Smoke test checklist

Run this after any production deployment:

1. Visit the main app domain and verify the page loads.
2. Sign in with a valid `@startupshell.org` Google account.
3. Confirm a non-StartupShell account cannot proceed where it should be blocked.
4. Create a test market.
5. Place a test trade.
6. Resolve the market.
7. Confirm market page, portfolio, and notifications still render.
8. Confirm the frontend is talking to the intended API environment.
9. If email is enabled, verify only essential and allowlisted email sends occur.
10. Check API and scheduler logs for startup or secret-loading failures.

## Rollback

Rollback depends on which layer failed.

### Web rollback

- Redeploy the previous Vercel production deployment.
- Confirm the web app points to a compatible API.

### API rollback

The API deploy script creates a new instance template per release. The safest rollback is usually to point the managed instance group back to the previously known-good template from the GCP console or by using `gcloud`.

Before you deploy, record:

- current instance template name
- current git SHA
- current image tag

If the new rollout is bad:

1. switch the managed instance group back to the previous template
2. wait until the group is stable
3. rerun smoke tests

### Scheduler rollback

Rollback means updating the scheduler instance back to the previously known-good image.

Before deploying, record the current image tag. If the scheduler misbehaves after release, update the container back to the prior image and verify scheduled jobs resume normally.

### Database rollback

Database rollback is the highest-risk part.

- if the change was additive, prefer a forward fix
- if the change was destructive, restore from backup or execute a prewritten rollback migration
- do not guess at reversal SQL on live production data

## Operational cautions

- The repo still contains legacy references to original Manifold infra names. Review shell scripts before using new project IDs.
- `firebase.json` references `backend/functions/dist`, but this workspace does not currently contain `backend/functions/`. Do not assume Cloud Functions deployment is part of the active deployment path unless that package is restored separately.
- The web README mentions Vercel functions under `pages/api/`; verify whether those routes are still in active use for your deployment model before changing API architecture.

## Minimal release runbook

If you only need the shortest safe sequence:

```bash
bun install
bun --cwd backend/api run compile
npx tsc --project web/tsconfig.json --noEmit
```

Then:

1. apply any required Supabase changes
2. deploy `backend/api`
3. deploy `backend/scheduler` if needed
4. deploy `web`
5. run the smoke test checklist

## Related files

- `plan.md`
- `.env.example`
- `README.md`
- `backend/api/deploy-api.sh`
- `backend/scheduler/deploy-scheduler.sh`
- `common/src/envs/prod.ts`
- `common/src/envs/dev.ts`
- `firebase.json`