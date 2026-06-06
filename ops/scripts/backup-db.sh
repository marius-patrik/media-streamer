#!/usr/bin/env bash
set -euo pipefail

cd /home/patrik/media-streamer
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
mkdir -p /mnt/HDD1/backups/media-streamer
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="/mnt/HDD1/backups/media-streamer/${stamp}.sql.gz"
docker compose -f ops/docker/compose.yml exec -T postgres pg_dump -U "${POSTGRES_USER:-tailstreamer}" "${POSTGRES_DB:-tailstreamer}" | gzip > "${backup}"
test -s "${backup}"
echo "backup_path=${backup}"
