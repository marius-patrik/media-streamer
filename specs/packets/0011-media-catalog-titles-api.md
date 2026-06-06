# Packet 0011 Media Catalog Titles API

## Spec

- `specs/008-media-catalog.md`
- `specs/006-full-scope-implementation-plan.md` P06

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/api/src/catalogSerialization.ts`
- `apps/api/src/routers/titles.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/src/validation.ts`
- `apps/api/tests/catalogSerialization.test.ts`
- `apps/api/tests/validation.test.ts`
- `specs/packets/0011-media-catalog-titles-api.md`

## Files Out Of Scope

- TMDB HTTP client and poster proxy.
- React title detail UX.
- Scanner/import changes.
- Search candidate/Prowlarr implementation.
- Browser tests.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- `titles.search` returns display-safe title summaries.
- `titles.openOrCreate` creates or opens titles and attaches external IDs without silently moving duplicate provider/value IDs.
- `titles.detail` returns title metadata, episodes, external IDs, local assets, cloud sources, downloads, and candidates with JSON-safe sizes.
- `titles.listEpisodes` returns ordered show episodes and no movie episodes.
- `titles.createEpisode` rejects episode creation under non-show titles.
- `titles.rematch` updates explicit `matchStatus` and optional metadata.
- Mutating title routes require `ADMIN` or `DOWNLOADER`.
