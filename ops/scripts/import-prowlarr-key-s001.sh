#!/usr/bin/env bash
set -euo pipefail

if [[ "$(hostname)" != "s001" ]]; then
  echo "prowlarr key import must run on s001" >&2
  exit 1
fi

env_file="/home/patrik/media-streamer/.env"
config_file="/mnt/HDD1/media-streamer/prowlarr/config.xml"

test -f "${env_file}"

current="$(sed -n 's/^PROWLARR_API_KEY=//p' "${env_file}" | tail -n 1)"
if [[ -n "${current}" ]]; then
  echo "prowlarr_key=already_configured"
  exit 0
fi

if [[ ! -f "${config_file}" ]]; then
  echo "prowlarr_key=config_missing"
  exit 0
fi

api_key="$(sed -n 's:.*<ApiKey>\([^<]*\)</ApiKey>.*:\1:p' "${config_file}" | head -n 1)"
if [[ -z "${api_key}" ]]; then
  echo "prowlarr_key=missing"
  exit 0
fi

if grep -q '^PROWLARR_API_KEY=' "${env_file}"; then
  sed -i "s/^PROWLARR_API_KEY=.*/PROWLARR_API_KEY=${api_key}/" "${env_file}"
else
  printf '\nPROWLARR_API_KEY=%s\n' "${api_key}" >>"${env_file}"
fi

echo "prowlarr_key=imported"
