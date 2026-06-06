# 014 qBittorrent Downloads

## Status

Planned.

## Scope

qBittorrent Web API client, magnet add, torrent upload, status polling, pause/resume/delete, categories, and completed-download handoff.

## Non-Goals

- qBittorrent must not mount `/mnt/HDD1/media`.
- No direct torrent client exposed host port.

## Contracts

- qBittorrent URL defaults to `http://qbittorrent:8080`.
- Categories: `tailstreamer`, `tailstreamer-review`.
- Downloads write to `/downloads/incomplete` and complete under `/downloads/complete`.
- Download jobs map qBit statuses into TailStreamer statuses.

## Security

- qBit credentials are server-side only.
- Torrent uploads validate file type/size before forwarding.

## Failure Modes

- qBit login failure marks integration unhealthy.
- Ambiguous completed downloads move to import review.

## Acceptance Criteria

- Mocked qBit tests cover login, add magnet, list jobs, pause/resume/delete, and status mapping.
- Compose audit proves qBit has no media mount and no published port.

## Dependency Changes

None.
