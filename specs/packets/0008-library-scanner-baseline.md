# Packet 0008 Library Scanner Baseline

## Spec

- `specs/009-library-scanner-import.md`
- `specs/006-full-scope-implementation-plan.md` P05

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/media/src/scanner.ts`
- `packages/media/src/index.ts`
- `packages/media/tests/scanner.test.ts`
- `apps/api/src/env.ts`
- `apps/api/src/mediaScanRepository.ts`
- `apps/api/src/routers/library.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/package.json`
- `apps/web/src/main.tsx`
- `specs/packets/0008-library-scanner-baseline.md`

## Files Out Of Scope

- Import file movement.
- ffprobe subprocess implementation.
- Subtitle persistence schema.
- Download completed-job import.
- Live `/mnt/HDD1/media` scan.

## Dependency Changes

None.

## Commands

```sh
bun --filter @tailstreamer/media test
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Scanner fixture creates provisional movie and show titles via repository boundary.
- Scanner fixture creates episode and local asset records via repository boundary.
- Scanner discovers sibling subtitles.
- Scanner skips incomplete download directories inside scanned roots.
- API exposes admin-only `library.scan` mutation using configured roots.
- Admin UI exposes a library scan action.
