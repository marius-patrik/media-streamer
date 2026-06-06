# Packet 0010 Player API Progress And Sources

## Spec

- `specs/010-streaming-player.md`
- `specs/006-full-scope-implementation-plan.md` P08

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/api/src/routers/player.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/src/validation.ts`
- `apps/api/tests/validation.test.ts`
- `packages/media/tests/sourceRank.test.ts`
- `specs/packets/0010-player-api-progress-sources.md`

## Files Out Of Scope

- React player UI.
- Subtitle persistence and serving.
- Download playback URL implementation.
- Cloud iframe UI.
- Browser playback tests.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
```

## Expected Evidence

- `player.getPlayableSources` returns ranked local, completed download, and cloud source records.
- `player.saveProgress` persists per-user title or episode progress.
- `player.saveLastSource` persists the explicit last source after verifying the source belongs to the subject.
- Source ranking tests cover explicit source, local, completed download, preferred cloud, and fallback cloud ordering.
- Player validation rejects invalid source types and negative progress.
