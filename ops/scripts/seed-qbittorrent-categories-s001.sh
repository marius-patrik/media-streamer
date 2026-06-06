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

bun -e '
const file = process.argv[2];
const fs = await import("node:fs/promises");
const raw = await fs.readFile(file, "utf8").catch(() => "{}");
const data = raw.trim() ? JSON.parse(raw) : {};
data.tailstreamer = { name: "tailstreamer", save_path: "/downloads/complete" };
data["tailstreamer-review"] = { name: "tailstreamer-review", save_path: "/downloads/complete" };
await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
' "${categories_file}"

echo "qbittorrent_categories=seeded"
