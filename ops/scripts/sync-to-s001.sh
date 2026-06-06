#!/usr/bin/env bash
set -euo pipefail

mode="${1:---dry-run}"
if [[ "${mode}" != "--dry-run" && "${mode}" != "--apply" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi

cd "$(dirname "$0")/../.."

remote="s001"
remote_path="/home/patrik/media-streamer"
rsync_args=(
  -az
  --delete
  --exclude .env
  --exclude .env.local
  --exclude .git
  --exclude node_modules
  --exclude dist
  --exclude coverage
  --exclude '*.log'
)

if [[ "${mode}" == "--dry-run" ]]; then
  rsync_args+=(--dry-run --itemize-changes)
fi

ssh "${remote}" "mkdir -p '${remote_path}'"

if [[ "${mode}" == "--apply" ]]; then
  ssh "${remote}" "set -euo pipefail
    if [[ -d '${remote_path}' ]]; then
      stamp=\"\$(date -u +%Y%m%dT%H%M%SZ)\"
      archive=\"/home/patrik/media-streamer.archive.\${stamp}.tar.gz\"
      tar --exclude='media-streamer/.env' --exclude='media-streamer/node_modules' --exclude='media-streamer/dist' -czf \"\${archive}\" -C /home/patrik media-streamer
      test -s \"\${archive}\"
      echo \"archive_path=\${archive}\"
    fi
  "
fi

rsync "${rsync_args[@]}" ./ "${remote}:${remote_path}/"

if [[ "${mode}" == "--dry-run" ]]; then
  echo "sync_dry_run=complete"
else
  echo "sync_apply=complete"
fi
