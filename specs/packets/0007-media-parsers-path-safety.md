# Packet 0007 Media Parsers Path Safety

## Spec

- `specs/009-library-scanner-import.md`
- `specs/010-streaming-player.md`
- `specs/006-full-scope-implementation-plan.md` P04

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/media/src/extensions.ts`
- `packages/media/src/parse.ts`
- `packages/media/src/paths.ts`
- `packages/media/src/sourceRank.ts`
- `packages/media/src/index.ts`
- `packages/media/tests/**`
- `packages/media/package.json`
- `specs/packets/0007-media-parsers-path-safety.md`

## Files Out Of Scope

- Scanner implementation.
- Import pipeline file movement.
- Streaming HTTP endpoints.
- Prisma media mutations.
- Live media roots.

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

- Movie parser handles year and release-token cleanup.
- TV parser handles `SxxEyy` and `1x02` forms.
- Video/subtitle extension detection is case-insensitive.
- Path helpers reject traversal and sibling-prefix confusion.
- Scanner path guard rejects incomplete downloads.
