#!/bin/bash
set -euo pipefail

# Configure these before running
AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"   # e.g. 123456789012
AWS_REGION="us-east-1"             # your preferred region

ENV=${1:-prod}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${ECR_REGISTRY}/shell-scheduler-${ENV}"
CLUSTER="shell"
SERVICE="shell-scheduler-${ENV}"

cd "$(dirname "$0")/../.."

echo "Building scheduler..."
bun --cwd backend/scheduler run build

echo "Logging in to ECR..."
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
