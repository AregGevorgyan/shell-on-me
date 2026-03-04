#!/bin/bash

# Parse arguments
DEBUG=false
PORT_ARG=""
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            DEBUG=true
            shift
            ;;
        --port|-p)
            if [[ -z "${2:-}" || "$2" == --* ]]; then
                echo "Error: --port requires a numeric value."
                exit 1
            fi
            PORT_ARG="$2"
            shift 2
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

ENV=${POSITIONAL_ARGS[0]:-dev}
API_PORT=${PORT_ARG:-${POSITIONAL_ARGS[1]:-8088}}

if ! [[ "$API_PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: Invalid port '$API_PORT'. Use a numeric port (e.g. 8088)."
    exit 1
fi

# Set environment based on whether "prod" is in the ENV string
if [[ "$ENV" == *"prod"* ]]; then
    FIREBASE_PROJECT=prod
    NEXT_ENV=PROD
else
    FIREBASE_PROJECT=dev
    NEXT_ENV=DEV
fi

if [[ "$ENV" == native:* ]]; then
    echo "Error: native dev mode is no longer supported in this repo."
    exit 1
fi

LOCAL_IP="localhost"

firebase use $FIREBASE_PROJECT

API_COMMAND="dev"
if [ "$DEBUG" = "true" ]; then
    API_COMMAND="debug"
fi

npx concurrently \
    -n API,NEXT,TS \
    -c white,magenta,cyan \
    "cross-env PORT=${API_PORT} \
              NEXT_PUBLIC_FIREBASE_ENV=${NEXT_ENV} \
              yarn --cwd=backend/api $API_COMMAND" \
    "cross-env NEXT_PUBLIC_API_URL=${LOCAL_IP}:${API_PORT} \
              NEXT_PUBLIC_FIREBASE_ENV=${NEXT_ENV} \
              yarn --cwd=web serve" \
    "cross-env yarn --cwd=web ts-watch"
