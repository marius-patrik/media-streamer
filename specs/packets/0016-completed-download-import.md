# Packet 0016 Completed Download Import

## Spec

- `specs/009-library-scanner-import.md`
- `specs/006-full-scope-implementation-plan.md` P13

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/media/src/importPlanner.ts`
- `packages/media/src/index.ts`
- `packages/media/tests/importPlanner.test.ts`
- `apps/api/src/routers/downloads.ts`
- `specs/packets/0016-completed-download-import.md`

## Files Out Of Scope

- Subtitle persistence.
- ffprobe metadata during import.
- Manual import mapping UI.
- Browser import review UI.
- Live `/mnt/HDD1/media` writes.

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

- Import plans resolve only paths under `DOWNLOAD_COMPLETE`.
- Import plans write destinations only under `MEDIA_ROOT`.
- Import planner ignores samples, trailers, extras, and tiny junk videos.
- Import planner selects the largest relevant video file.
- Movie imports normalize to `Title (Year)/Title (Year).ext`.
- Episode imports normalize to `Show/Season NN/Show - SNNENN.ext`.
- `downloads.importCompletedJob` marks jobs without importable video as `NEEDS_REVIEW`.
- `downloads.importCompletedJob` moves selected video into media, creates `LocalAsset`, and marks job `IMPORTED`.
