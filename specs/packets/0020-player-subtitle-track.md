# Packet 0020 Player Subtitle Track

## Spec

- `specs/010-streaming-player.md`
- `specs/006-full-scope-implementation-plan.md` P10 and P14

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/api/src/routers/player.ts`
- `apps/api/tests/playerSources.test.ts`
- `apps/web/src/main.tsx`
- `specs/packets/0020-player-subtitle-track.md`

## Files Out Of Scope

- Manual multi-subtitle selector UI.
- Subtitle upload.
- Subtitle format conversion.
- Browser automation proof for media track rendering.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- `player.getPlayableSources` includes first stored subtitle metadata for each local asset.
- Local subtitle URLs use `/subtitle/:assetId`, keeping path resolution server-side.
- Local sources remain playable when no subtitle exists.
- React player renders a default `<track>` for local sources with subtitle metadata.
- Download and cloud source serialization remain unchanged.
