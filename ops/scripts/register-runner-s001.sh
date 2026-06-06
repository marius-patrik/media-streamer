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
token="${RUNNER_TOKEN:-}"
if [[ -z "${token}" ]]; then
  token="$(gh api -X POST "repos/${repo}/actions/runners/registration-token" --jq .token)"
fi
mkdir -p /mnt/HDD1/media-streamer/runner
if [[ ! -x /mnt/HDD1/media-streamer/runner/config.sh ]]; then
  docker run --rm \
    -v /mnt/HDD1/media-streamer/runner:/runner-data \
    --entrypoint sh \
    ghcr.io/actions/actions-runner:latest \
    -lc 'cp -a /home/runner/. /runner-data/'
fi
docker run --rm \
  -v /mnt/HDD1/media-streamer/runner:/home/runner \
  ghcr.io/actions/actions-runner:latest \
  ./config.sh --url "https://github.com/${repo}" --token "${token}" --labels "self-hosted,s001,media-streamer,docker" --unattended
docker compose --profile runner -f ops/docker/compose.yml up -d ci-runner
