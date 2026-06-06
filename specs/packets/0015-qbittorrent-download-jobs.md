# Packet 0015 qBittorrent Download Jobs

## Spec

- `specs/014-qbittorrent-downloads.md`
- `specs/006-full-scope-implementation-plan.md` P12

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/integrations/src/qbittorrent.ts`
- `packages/integrations/src/index.ts`
- `packages/integrations/tests/qbittorrent.test.ts`
- `apps/api/src/env.ts`
- `apps/api/src/downloadSerialization.ts`
- `apps/api/src/routers/downloads.ts`
- `apps/api/src/validation.ts`
- `apps/api/tests/downloadSerialization.test.ts`
- `apps/api/tests/validation.test.ts`
- `specs/packets/0015-qbittorrent-download-jobs.md`

## Files Out Of Scope

- Completed-download import pipeline.
- Torrent file upload forwarding.
- Hash reconciliation after magnet add.
- React downloads queue UI.
- Live qBittorrent calls with real credentials.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- qBittorrent URL defaults to `http://qbittorrent:8080`.
- qBittorrent credentials are read server-side from env or `AppSetting`.
- Mocked qBit tests cover login, add magnet, list torrents, pause, resume, delete, raw torrent normalization, and status mapping.
- `downloads.qbittorrentStatus` reports configured/reachable without returning credentials.
- `downloads.addMagnet` sends magnets to qBit category `tailstreamer` or `tailstreamer-review` and then creates a queued `DownloadJob`.
- `downloads.startFromCandidate` starts only candidates with magnet URIs.
- `downloads.listJobs`, `downloads.syncJobs`, `downloads.pauseJob`, `downloads.resumeJob`, and `downloads.deleteJob` are wired.
- Compose audit proves qBittorrent has no `/mnt/HDD1/media` mount and no published host port.
