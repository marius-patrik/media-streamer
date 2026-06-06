#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "preflight must run on s001" >&2
  exit 1
fi

cd /home/patrik/media-streamer
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

app_port="${APP_HOST_PORT:-8090}"
report_dir="/mnt/HDD1/backups/media-streamer/preflight"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
report="${report_dir}/${stamp}.txt"
mkdir -p "${report_dir}"

{
  echo "TailStreamer s001 preflight ${stamp}"
  echo
  echo "host=$(hostname)"
  echo "pwd=$(pwd)"
  echo "app_port=${app_port}"
  echo
  echo "[git]"
  if [[ -d .git ]]; then
    git rev-parse --show-toplevel
    git rev-parse HEAD
    git status --short
  else
    echo "missing .git"
  fi
  echo
  echo "[env]"
  test -f .env && echo ".env present" || echo ".env missing"
  echo
  echo "[listening ports]"
  ss -ltnp || true
  echo
  echo "[compose config]"
  if [[ -f .env ]]; then
    docker compose -f ops/docker/compose.yml config |
      sed -E '
        s/(DATABASE_URL:).*/\1 <redacted>/
        s/((PASSWORD|SECRET|API_KEY):).*/\1 <redacted>/
      '
  else
    echo "compose config skipped: .env missing"
  fi
  echo
  echo "[compose ps]"
  docker compose -f ops/docker/compose.yml ps || true
  echo
  echo "[systemd]"
  systemctl is-enabled media-streamer-compose.service || true
  systemctl is-active media-streamer-compose.service || true
} | tee "${report}"

echo "preflight_report=${report}"
