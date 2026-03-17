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

Remove `@google-cloud/secret-manager` SDK entirely. Rewrite `getSecrets()` to read from `process.env`. All 41 secret names remain the same — they become environment variable names set in Render's dashboard and the ECS task definition.

### 2. `backend/shared/src/monitoring/metric-writer.ts`

Replace the `@google-cloud/monitoring` `MetricServiceClient` with structured `console.log` calls (JSON format). Render and ECS both capture stdout logs natively in their dashboards.

### 3. `backend/shared/src/utils.ts`

Replace `GOOGLE_CLOUD_PROJECT === null` check for `LOCAL_DEV` detection. Use `IS_PROD=true` as an explicit flag set in both Render and ECS environments. Local dev has this unset.

### 4. `backend/api/Dockerfile`

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

### 5. `backend/scheduler/Dockerfile`

Reduce `--max-old-space-size` from 14GB to 1GB to fit a 2GB Fargate task. No other changes needed.

### 6. Dependencies

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
      # remaining 41 secrets set manually in Render dashboard
```

### Deployment workflow

Deploys trigger automatically on Git push to main, or manually from the Render dashboard. No deploy script needed.

### Rollback

Render retains previous deploys. Roll back by selecting a prior deployment in the Render dashboard.

## Scheduler Deployment — AWS ECS Fargate

### Infrastructure

- **ECR** — stores the scheduler Docker image (free tier)
- **ECS Fargate service** — runs 1 always-on task in the default cluster
- **Secrets** — set as environment variables in the ECS task definition (plain env vars, no AWS Secrets Manager needed for simplicity)

### `backend/scheduler/deploy-scheduler-aws.sh`

Replaces the old GCP deploy script:

```bash
#!/bin/bash
set -euo pipefail

ENV=${1:-dev}
ECR_URI="<account-id>.dkr.ecr.<region>.amazonaws.com/shell-scheduler-${ENV}"
CLUSTER="shell"
SERVICE="shell-scheduler-${ENV}"

cd "$(dirname "$0")/../.."

bun --cwd backend/scheduler run build

aws ecr get-login-password --region <region> \
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
- All 41 secrets set in Render dashboard and ECS task definition

## Out of Scope

- Firebase Auth → Supabase Auth migration (future task)
- Scheduler job logic changes beyond removing irrelevant jobs
- Supabase schema changes
- Vercel configuration changes
