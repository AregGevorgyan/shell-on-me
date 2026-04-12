#!/bin/bash
set -euo pipefail

# Oracle Cloud VM deploy script for shell-scheduler
# Prerequisites:
#   - OCI VM provisioned (see deploy.md for setup)
#   - SSH key added to the VM
#   - Docker installed on the VM
#   - ORACLE_VM_HOST set below or exported in your shell

ORACLE_VM_HOST="${ORACLE_VM_HOST:-}"   # e.g. ubuntu@<public-ip>
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"    # path to your SSH private key
ENV=${1:-prod}
CONTAINER_NAME="shell-scheduler-${ENV}"

if [[ -z "$ORACLE_VM_HOST" ]]; then
  echo "Error: ORACLE_VM_HOST is not set. Export it or edit this script."
  echo "  export ORACLE_VM_HOST=ubuntu@<your-vm-public-ip>"
  exit 1
fi

cd "$(dirname "$0")/../.."

echo "Building scheduler..."
bun --cwd backend/scheduler run build

echo "Building Docker image..."
docker build -t "$CONTAINER_NAME" ./backend/scheduler

echo "Saving image to tar..."
docker save "$CONTAINER_NAME:latest" | gzip > "/tmp/${CONTAINER_NAME}.tar.gz"

echo "Copying image to Oracle VM..."
scp -i "$SSH_KEY" "/tmp/${CONTAINER_NAME}.tar.gz" "${ORACLE_VM_HOST}:/tmp/"

echo "Loading and restarting container on VM..."
ssh -i "$SSH_KEY" "$ORACLE_VM_HOST" bash <<REMOTE
  set -e
  docker load < /tmp/${CONTAINER_NAME}.tar.gz
  docker stop ${CONTAINER_NAME} 2>/dev/null || true
  docker rm   ${CONTAINER_NAME} 2>/dev/null || true
  docker run -d \
    --name ${CONTAINER_NAME} \
    --restart always \
    --env-file /home/ubuntu/shell-scheduler.env \
    -p 80:80 \
    ${CONTAINER_NAME}:latest
  rm -f /tmp/${CONTAINER_NAME}.tar.gz
  echo "Container started:"
  docker ps --filter name=${CONTAINER_NAME}
REMOTE

rm -f "/tmp/${CONTAINER_NAME}.tar.gz"
echo "Deploy complete. Check logs: ssh -i $SSH_KEY $ORACLE_VM_HOST 'docker logs -f ${CONTAINER_NAME}'"
