#!/usr/bin/env bash
set -euo pipefail

cd /home/patrik/media-streamer
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
app_port="${APP_HOST_PORT:-8090}"
compose=(docker compose -f ops/docker/compose.yml)

for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${app_port}/health"; then
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:${app_port}/health"
"${compose[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER:-tailstreamer}" -d "${POSTGRES_DB:-tailstreamer}"
"${compose[@]}" exec -T app bun -e 'const url = `${process.env.QB_URL}/api/v2/app/version`; const response = await fetch(url); if (response.status >= 500) process.exit(1);'
"${compose[@]}" exec -T app bun -e 'const url = `${process.env.PROWLARR_URL}/ping`; const response = await fetch(url); if (response.status >= 500) process.exit(1);'

if [[ -n "${SMOKE_ADMIN_EMAIL:-}" && -n "${SMOKE_ADMIN_PASSWORD:-}" ]]; then
  SMOKE_APP_BASE_URL="http://localhost:${app_port}" bun -e '
const baseUrl = process.env.SMOKE_APP_BASE_URL;
const email = process.env.SMOKE_ADMIN_EMAIL;
const password = process.env.SMOKE_ADMIN_PASSWORD;
const displayName = process.env.SMOKE_ADMIN_DISPLAY_NAME || "TailStreamer Smoke";
const bootstrapSecret = process.env.BOOTSTRAP_SECRET;

async function trpc(path, input) {
  const response = await fetch(`${baseUrl}/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${path} failed: ${response.status} ${text}`);
    error.status = response.status;
    throw error;
  }
  return { response, payload: text ? JSON.parse(text) : null };
}

try {
  await trpc("auth.login", { email, password });
  process.exit(0);
} catch (error) {
  if (error.status !== 401 && error.status !== 404) throw error;
}

if (!bootstrapSecret) throw new Error("BOOTSTRAP_SECRET is required for bootstrap smoke");
await trpc("auth.bootstrapAdmin", {
  bootstrapSecret,
  displayName,
  email,
  password,
});
await trpc("auth.login", { email, password });
'
fi

if command -v gh >/dev/null 2>&1 && gh auth status -h github.com >/dev/null 2>&1; then
  gh api repos/marius-patrik/media-streamer/actions/runners --jq '
    .runners[]
    | select(.labels[].name == "media-streamer")
    | select(.labels[].name == "s001")
    | select(.labels[].name == "docker")
    | .name
  ' | grep -q .
else
  echo "gh unavailable or unauthenticated; runner label smoke skipped" >&2
fi

published="$("${compose[@]}" ps --format '{{.Service}} {{.Publishers}}' | grep -E '0\.0\.0\.0|:::' || true)"
unexpected="$(
  echo "$published" |
    awk -v app_port="${app_port}" 'NF && !($1 == "app" && ($0 ~ app_port "->8080" || $0 ~ "8080 " app_port " tcp")) { print }'
)"
if [[ -n "$unexpected" ]]; then
  echo "$unexpected" >&2
  echo "unexpected published port" >&2
  exit 1
fi
exit 0
