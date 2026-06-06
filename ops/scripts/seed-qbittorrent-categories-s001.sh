#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "qBittorrent category seed must run on s001" >&2
  exit 1
fi

categories_file="/mnt/HDD1/media-streamer/qbittorrent/qBittorrent/categories.json"
mkdir -p "$(dirname "${categories_file}")"
if [[ ! -f "${categories_file}" ]]; then
  printf '{}\n' >"${categories_file}"
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

cat >"${categories_file}" <<'JSON'
{
  "tailstreamer": {
    "name": "tailstreamer",
    "save_path": "/downloads/complete"
  },
  "tailstreamer-review": {
    "name": "tailstreamer-review",
    "save_path": "/downloads/complete"
  }
}
JSON

echo "qbittorrent_categories=seeded"
