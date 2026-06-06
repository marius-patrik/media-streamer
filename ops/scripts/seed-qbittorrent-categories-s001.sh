#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "qBittorrent category seed must run on s001" >&2
  exit 1
fi

categories_file="/mnt/HDD1/media-streamer/qbittorrent/qBittorrent/categories.json"

write_categories() {
  local payload="${1}"
  if [[ -w "${categories_file}" ]]; then
    printf '%s\n' "${payload}" >"${categories_file}"
    return
  fi
  printf '%s\n' "${payload}" | sudo tee "${categories_file}" >/dev/null
}

mkdir -p "$(dirname "${categories_file}")"
if [[ ! -f "${categories_file}" ]]; then
  write_categories '{}'
fi

if grep -q '"tailstreamer"' "${categories_file}"; then
  echo "qbittorrent_categories=already_seeded"
  exit 0
fi

compact="$(tr -d '[:space:]' <"${categories_file}")"
if [[ "${compact}" != "{}" && -n "${compact}" ]]; then
  echo "qbittorrent_categories=skipped_existing_nonempty"
  exit 0
fi

write_categories '{
  "tailstreamer": {
    "name": "tailstreamer",
    "save_path": "/downloads/complete"
  },
  "tailstreamer-review": {
    "name": "tailstreamer-review",
    "save_path": "/downloads/complete"
  }
}'

echo "qbittorrent_categories=seeded"
