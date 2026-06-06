#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "env provision must run on s001" >&2
  exit 1
fi

cd /home/patrik/media-streamer

if [[ -f .env ]]; then
  echo ".env already exists; refusing to overwrite" >&2
  exit 0
fi

random_hex() {
  od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
}

postgres_password="$(random_hex)"
session_secret="$(random_hex)"
bootstrap_secret="$(random_hex)"

umask 077
{
  echo "DATABASE_URL=postgresql://tailstreamer:${postgres_password}@postgres:5432/tailstreamer"
  echo "POSTGRES_USER=tailstreamer"
  echo "POSTGRES_PASSWORD=${postgres_password}"
  echo "POSTGRES_DB=tailstreamer"
  echo "SESSION_SECRET=${session_secret}"
  echo "BOOTSTRAP_SECRET=${bootstrap_secret}"
  echo "MEDIA_ROOT=/media"
  echo "DOWNLOAD_INCOMPLETE=/downloads/incomplete"
  echo "DOWNLOAD_COMPLETE=/downloads/complete"
  echo "QB_URL=http://qbittorrent:8080"
  echo "QB_USERNAME="
  echo "QB_PASSWORD="
  echo "PROWLARR_URL=http://prowlarr:9696"
  echo "PROWLARR_API_KEY="
  echo "TMDB_API_KEY="
  echo "APP_HOST_PORT=8090"
  echo "PORT=8080"
  echo "WEB_DIST=dist/web"
} > .env

echo "env_path=/home/patrik/media-streamer/.env"
echo "bootstrap_secret=${bootstrap_secret}"
