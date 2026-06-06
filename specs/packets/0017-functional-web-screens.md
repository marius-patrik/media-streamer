# Packet 0017 Functional Web Screens

## Spec

- `specs/002-frontend-platform.md`
- `specs/010-streaming-player.md`
- `specs/006-full-scope-implementation-plan.md` P09 and P14

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/web/src/main.tsx`
- `specs/packets/0017-functional-web-screens.md`

## Files Out Of Scope

- Browser automation screenshots.
- Subtitle controls and subtitle endpoint.
- Full provider template editor.
- Drag/drop torrent upload.
- Live media playback proof.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Web app remains Rsbuild, React, Tailwind, tRPC React Query, wouter, Framer Motion, and Lucide.
- Library screen searches local titles and opens title detail.
- Library screen searches TMDB and opens matched titles server-side.
- Title detail screen shows metadata, episodes, source list, Prowlarr candidates, candidate queue action, and cloud source resolution.
- Player screen supports source switching, local video playback URL, cloud iframe URL, download status source display, last-source save, and progress save.
- Downloads screen supports manual magnet queueing, queue sync, pause, resume, delete, and import actions.
- Admin screen shows user management, library scan, and TMDB/Prowlarr/qBittorrent/cloud status panels.
