#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

project="tailstreamer-smoke-${GITHUB_RUN_ID:-local}-$$"
root="$(mktemp -d)"
port="${APP_HOST_PORT:-18090}"
compose=(docker compose -p "${project}" -f ops/docker/compose.yml)

cleanup() {
  "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  docker run --rm -v "${root}:/cleanup" postgres:16-alpine sh -c 'rm -rf /cleanup/*' >/dev/null 2>&1 || true
  rmdir "${root}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

mkdir -p \
  "${root}/media" \
  "${root}/downloads/incomplete" \
  "${root}/downloads/complete" \
  "${root}/state"

export APP_HOST_PORT="${port}"
export COMPOSE_NETWORK_NAME="${project}"
export MEDIA_ROOT_HOST="${root}/media"
export DOWNLOADS_ROOT_HOST="${root}/downloads"
export STATE_ROOT_HOST="${root}/state"
export POSTGRES_USER="${POSTGRES_USER:-tailstreamer}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-tailstreamer-smoke}"
export POSTGRES_DB="${POSTGRES_DB:-tailstreamer}"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
export SESSION_SECRET="${SESSION_SECRET:-tailstreamer-smoke-session-secret-32-bytes}"
export BOOTSTRAP_SECRET="${BOOTSTRAP_SECRET:-tailstreamer-smoke-bootstrap-secret}"
export SMOKE_ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-smoke-admin@tailstreamer.local}"
export SMOKE_ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-tailstreamer-smoke-password}"
export SMOKE_ADMIN_DISPLAY_NAME="${SMOKE_ADMIN_DISPLAY_NAME:-TailStreamer Smoke}"

"${compose[@]}" config >/dev/null
"${compose[@]}" build app
"${compose[@]}" up -d --wait postgres
"${compose[@]}" run --rm --no-deps app bun --cwd packages/db prisma migrate deploy
"${compose[@]}" up -d qbittorrent prowlarr app

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://127.0.0.1:${port}/health"
"${compose[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
"${compose[@]}" exec -T app bun -e 'const url = `${process.env.QB_URL}/api/v2/app/version`; const response = await fetch(url); if (response.status >= 500) process.exit(1);'
"${compose[@]}" exec -T app bun -e 'const url = `${process.env.PROWLARR_URL}/ping`; const response = await fetch(url); if (response.status >= 500) process.exit(1);'
asset_id="$(
  "${compose[@]}" exec -T app bun --cwd packages/db -e '
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await Bun.write("/media/Smoke.Range.mp4", "0123456789");
    const title = await prisma.title.create({
      data: {
        kind: "MOVIE",
        name: "Smoke Range",
        createdFrom: "MANUAL",
        matchStatus: "MATCHED",
      },
    });
    const asset = await prisma.localAsset.create({
      data: {
        titleId: title.id,
        relativePath: "Smoke.Range.mp4",
        absolutePath: "/media/Smoke.Range.mp4",
        sizeBytes: 10n,
        container: "mp4",
        scanStatus: "IMPORTED",
      },
    });
    await prisma.$disconnect();
    console.log(asset.id);
  ' | tr -d '\r\n'
)"
range_status="$(curl -fsS -o /tmp/tailstreamer-range-smoke.bin -w '%{http_code}' -H 'Range: bytes=2-5' "http://127.0.0.1:${port}/stream/local/${asset_id}")"
test "${range_status}" = "206"
test "$(cat /tmp/tailstreamer-range-smoke.bin)" = "2345"
rm -f /tmp/tailstreamer-range-smoke.bin

SMOKE_APP_BASE_URL="http://127.0.0.1:${port}" \
SMOKE_ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL}" \
SMOKE_ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD}" \
SMOKE_ADMIN_DISPLAY_NAME="${SMOKE_ADMIN_DISPLAY_NAME}" \
BOOTSTRAP_SECRET="${BOOTSTRAP_SECRET}" \
bun -e '
  const baseUrl = process.env.SMOKE_APP_BASE_URL;
  const email = process.env.SMOKE_ADMIN_EMAIL;
  const password = process.env.SMOKE_ADMIN_PASSWORD;
  const displayName = process.env.SMOKE_ADMIN_DISPLAY_NAME;
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;

  async function trpc(path, input) {
    const response = await fetch(`${baseUrl}/trpc/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path} failed: ${response.status} ${text}`);
    return text ? JSON.parse(text) : null;
  }

  await trpc("auth.bootstrapAdmin", { bootstrapSecret, displayName, email, password });
  await trpc("auth.login", { email, password });
'

published="$("${compose[@]}" ps --format '{{.Service}} {{.Publishers}}' | grep -E '0\.0\.0\.0|:::' || true)"
unexpected="$(
  echo "$published" |
    awk -v app_port="${port}" 'NF && !($1 == "app" && ($0 ~ app_port "->8080" || $0 ~ "8080 " app_port " tcp")) { print }'
)"
if [[ -n "$unexpected" ]]; then
  echo "$unexpected" >&2
  echo "unexpected published port" >&2
  exit 1
fi
