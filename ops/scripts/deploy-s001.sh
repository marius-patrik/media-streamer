#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "deploy must run on s001" >&2
  exit 1
fi

cd /home/patrik/media-streamer
test -f .env
set -a
# shellcheck disable=SC1091
source .env
set +a
ops/scripts/preflight-s001.sh
mkdir -p /mnt/HDD1/media-streamer /mnt/HDD1/downloads/incomplete /mnt/HDD1/downloads/complete /mnt/HDD1/backups/media-streamer

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="/home/patrik/media-streamer.archive.${stamp}.tar.gz"
tar --exclude='./node_modules' --exclude='./dist' --exclude='./.env' --exclude='./.git' -czf "${archive}" -C /home/patrik media-streamer
test -s "${archive}"
echo "archive_path=${archive}"

git pull --ff-only origin main
docker compose -f ops/docker/compose.yml up -d --wait postgres
ops/scripts/backup-db.sh
docker compose -f ops/docker/compose.yml build app
docker compose -f ops/docker/compose.yml run --rm --no-deps app bun --cwd packages/db prisma migrate deploy
echo "migration_result=applied"
docker compose -f ops/docker/compose.yml up -d --remove-orphans
ops/scripts/smoke-s001.sh
echo "smoke_result=passed"
