#!/bin/sh
# Run the Linux hardening tests inside a container with the same restrictions as the service in compose.yaml.
#
# Usage: deploy/qualify-docker.sh [production-image]
# Build the production image first, for example:
#   docker build -t fastly-mcp:prod .
set -eu

BASE="${1:-fastly-mcp:prod}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

docker build -t fastly-mcp:qualify --build-arg "BASE=$BASE" \
    -f "$REPO/deploy/Dockerfile.qualify" "$REPO/deploy"

exec docker run --rm \
    --user 10001:10001 \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --read-only \
    --init \
    --tmpfs /tmp:size=64m,mode=1777 \
    --memory 3g --memory-swap 3g \
    --cpus 4 \
    --pids-limit 256 \
    --volume "$REPO/test:/app/test:ro" \
    fastly-mcp:qualify test/linux-hardening.test.js
