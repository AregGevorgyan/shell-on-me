# GCP to Render + AWS Migration Design

**Date:** 2026-03-16
**Status:** Approved

## Overview

Migrate the backend infrastructure from Google Cloud Platform (GCP) to Render (API) and AWS ECS Fargate (Scheduler), eliminating the GCP dependency entirely. Keep Vercel (web), Firebase (auth), and Supabase (database) unchanged.

## Architecture

```
Web (Vercel)
    ↓
API (Render Web Service, free tier)
    - Docker, single Node process
    - Secrets via Render environment variables
    - Structured JSON logging to stdout
    ↓
Supabase (Postgres)   Firebase (Auth)

Scheduler (AWS ECS Fargate, using AWS credits)
    - Long-running Docker container
    - Croner-based jobs (trimmed to StartupShell-relevant ones)
    - Secrets via ECS task definition environment variables
    - HTTP management interface retained
    ↓
Supabase (Postgres)   Firebase (Auth)
```

Both services share the same Docker build process. No shared runtime dependency between API and Scheduler.

## Code Changes

### 1. `common/src/secrets.ts`

Remove `@google-cloud/secret-manager` SDK entirely. Rewrite `getSecrets()` to read from `process.env`. All 31 secret names remain the same — they become environment variable names set in Render's dashboard and the ECS task definition.

### 2. `backend/shared/src/monitoring/metric-writer.ts` + `instance-info.ts`

Replace the `@google-cloud/monitoring` `MetricServiceClient` with structured `console.log` calls (JSON format). Render and ECS both capture stdout logs natively in their dashboards. Delete `instance-info.ts` entirely — it only exists to supply GCP instance metadata to `metric-writer.ts` and has no use after this change.

### 3. `backend/shared/src/monitoring/log.ts`

`log.ts` has `const IS_GCP = process.env.GOOGLE_CLOUD_PROJECT != null` which gates structured JSON output. On Render/ECS, `GOOGLE_CLOUD_PROJECT` will not be set, causing logs to silently fall back to human-readable output. Replace the `IS_GCP` check with `IS_PROD` (same variable as #4 below) so structured JSON logging is active in both Render and ECS environments.

### 4. `backend/shared/src/utils.ts` (**must be done before #5**)

`LOCAL_DEV` is currently `process.env.GOOGLE_CLOUD_PROJECT == null`. On Render and ECS, `GOOGLE_CLOUD_PROJECT` is not set, so `LOCAL_DEV` evaluates to `true` — this causes `serve.ts` to take the local code path and never reach the production Firebase initialization. Fix first: replace with `const LOCAL_DEV = process.env.IS_PROD !== 'true'`. Set `IS_PROD=true` in both Render and ECS environments.

### 5. `backend/api/src/serve.ts` (**depends on #4**)

Once `LOCAL_DEV` is fixed, the production branch in `serve.ts` will be reached on Render. Firebase Admin currently initializes with `projectId: process.env.GOOGLE_CLOUD_PROJECT` in that branch. Update to use `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_KEY`:

```ts
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
})
```

`FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON-encoded service account) must be added to Render's env vars.

### 6. `backend/scheduler/src/utils.ts`

`initSecrets()` has a try/catch that swallows errors and falls back to local credentials — this was designed for GCP credential auto-discovery. After migration, `loadSecretsToEnv()` simply reads `process.env`, so the try/catch always succeeds silently even when secrets are missing. Simplify `initSecrets()` to a direct call without the fallback, so missing env vars surface as startup failures rather than silent undefined secrets. Also update Firebase Admin initialization here to use `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_KEY` (same as API).

Also clean up `getServiceAccountCredentials` and any GCP credential fallback paths in `secrets.ts` that are dead code after the migration — leave no misleading GCP credential logic behind.

### 7. `backend/api/src/health.ts` + `GET /health` route

The `GET /health` route exists but is currently wrapped in `authEndpoint`, which requires Firebase authentication. Render's health check probe sends an unauthenticated GET — it will receive a 401 and mark the service unhealthy. Remove auth from the health endpoint so it returns 200 publicly. No logic change needed, just remove the auth wrapper.

### 8. `backend/api/Dockerfile`

Remove PM2 and the multi-process setup. Replace with a single Node process. Reduce `--max-old-space-size` from 12GB to 400MB to fit Render's free tier (512MB RAM).

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY dist/package.json dist/bun.lock ./
RUN npm install --omit=dev
COPY dist ./
EXPOSE 80
CMD ["node", "--max-old-space-size=400", "backend/api/lib/serve.js"]
```

### 9. `backend/scheduler/Dockerfile`

Remove the `--inspect` debug flag (opens port 9229, inappropriate for production). Reduce `--max-old-space-size` from 14GB to 1GB to fit a 2GB Fargate task.

### 10. Dependencies

Remove from `backend/api/package.json`, `backend/scheduler/package.json`, and `backend/shared/package.json`:
- `@google-cloud/secret-manager`
- `@google-cloud/monitoring`
- `gcp-metadata`

## API Deployment — Render

### `render.yaml` (repo root)

Defines the API service so deployments are reproducible:

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
        value: startupshell  # set to actual Firebase project ID
      # FIREBASE_SERVICE_ACCOUNT_KEY and remaining 31 secrets set manually in Render dashboard
```

### Deployment workflow

Deploys trigger automatically on Git push to main, or manually from the Render dashboard. No deploy script needed.

### Rollback

Render retains previous deploys. Roll back by selecting a prior deployment in the Render dashboard.

## Scheduler Deployment — AWS ECS Fargate

### Infrastructure

- **ECR** — stores the scheduler Docker image (free tier)
- **ECS Fargate service** — runs 1 always-on task in the default cluster
- **Secrets** — set as environment variables in the ECS task definition (plain env vars, no AWS Secrets Manager needed for simplicity). Must include `IS_PROD=true`, `NEXT_PUBLIC_FIREBASE_ENV=PROD`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`, and all 31 secrets from `common/src/secrets.ts`

### `backend/scheduler/deploy-scheduler-aws.sh`

Replaces the old GCP deploy script:

The script uses variables at the top that must be set before first use. These are NOT committed with placeholder values — configure them before running.

```bash
#!/bin/bash
set -euo pipefail

# Configure these before running
AWS_ACCOUNT_ID="123456789012"   # your AWS account ID
AWS_REGION="us-east-1"         # your preferred region

ENV=${1:-prod}
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/shell-scheduler-${ENV}"
CLUSTER="shell"
SERVICE="shell-scheduler-${ENV}"

cd "$(dirname "$0")/../.."

bun --cwd backend/scheduler run build

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_URI"

docker build -t "shell-scheduler-${ENV}" ./backend/scheduler
docker tag "shell-scheduler-${ENV}:latest" "$ECR_URI:latest"
docker push "$ECR_URI:latest"

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment
```

### Rollback

ECS retains previous task definition revisions. Roll back by updating the service to use a prior task definition revision via the AWS console or CLI.

## Scheduler Job Trimming

During implementation, audit `backend/scheduler/src/jobs/index.ts` and remove jobs that are Manifold-specific and irrelevant to StartupShell. Jobs to evaluate for removal include prediction market scoring, Manifold-specific league mechanics, and any jobs referencing removed features. Jobs to retain include notifications, emails (within allowlist), market lifecycle management, and league cycling if used.

## Files Added

- `render.yaml`
- `backend/scheduler/deploy-scheduler-aws.sh`
- `docs/superpowers/specs/2026-03-16-render-aws-migration-design.md`

## Files Deleted

- `backend/api/deploy-api.sh`
- `backend/scheduler/deploy-scheduler.sh`
- `backend/api/ecosystem.config.js`
- `backend/shared/src/monitoring/instance-info.ts`

## Documentation Updates

### `deploy.md`

- Remove all GCP Compute Engine, Artifact Registry, and Secret Manager sections
- Add Render setup: connect repo, configure env vars in dashboard, `render.yaml` overview
- Add AWS ECS Fargate setup: ECR repo creation, ECS cluster/service, task definition, env var configuration
- Update prerequisites: remove `gcloud`, add `aws` CLI
- Update rollback instructions for Render and ECS
- Keep Supabase, Firebase, and Vercel sections unchanged

### `plan.md`

- Update deployment section to reference Render + AWS instead of GCP

## Cost

| Service | Platform | Cost |
|---|---|---|
| API | Render free tier | $0/month |
| Scheduler | AWS ECS Fargate (credits) | ~$5–10/month (covered by credits) |
| Web | Vercel | $0/month |
| Auth | Firebase Spark | $0/month |
| Database | Supabase free tier | $0/month |

## Prerequisites for Deployment

- Render account connected to this repository
- AWS account with credits and CLI configured
- ECR repository created for scheduler image
- ECS cluster and service created
- Firebase service account key (JSON) obtained from Firebase console
- All 31 secrets set in Render dashboard (plus `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `IS_PROD`, `NEXT_PUBLIC_FIREBASE_ENV=PROD`)
- All 31 secrets set in ECS task definition (plus `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `IS_PROD`, `NEXT_PUBLIC_FIREBASE_ENV=PROD`)
- `AWS_ACCOUNT_ID` and `AWS_REGION` configured in `deploy-scheduler-aws.sh` before first deploy

## Out of Scope

- Firebase Auth → Supabase Auth migration (future task)
- Scheduler job logic changes beyond removing irrelevant jobs
- Supabase schema changes
- Vercel configuration changes
