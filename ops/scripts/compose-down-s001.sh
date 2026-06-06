#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "compose-down must run on s001" >&2
  exit 1
fi

cd /home/patrik/media-streamer
test -f .env

docker_bin="${DOCKER_BIN:-/run/current-system/sw/bin/docker}"
if [[ ! -x "${docker_bin}" ]]; then
  docker_bin="$(command -v docker)"
fi

sudo -n "${docker_bin}" compose \
  --env-file /home/patrik/media-streamer/.env \
  -f /home/patrik/media-streamer/ops/docker/compose.yml \
  --profile runner \
  down
