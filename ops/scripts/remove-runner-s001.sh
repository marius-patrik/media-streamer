#!/usr/bin/env bash
set -euo pipefail

repo="marius-patrik/media-streamer"
cd /home/patrik/media-streamer
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
docker compose --profile runner -f ops/docker/compose.yml stop ci-runner || true
token="$(gh api -X POST "repos/${repo}/actions/runners/remove-token" --jq .token)"
docker run --rm \
  -v /mnt/HDD1/media-streamer/runner:/home/runner \
  ghcr.io/actions/actions-runner:latest \
  ./config.sh remove --token "${token}"
