#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="pm-mvp"
CONTAINER_NAME="pm-mvp"
PORT="8000"

docker build -t "$IMAGE_NAME" .
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker_args=(
  --detach
  --name "$CONTAINER_NAME"
  --publish "$PORT:8000"
)

if [[ -f .env ]]; then
  docker_args+=(--env-file .env)
fi

docker run "${docker_args[@]}" "$IMAGE_NAME"

printf 'App started at http://localhost:%s\n' "$PORT"
