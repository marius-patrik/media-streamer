# Packet 0012 Metadata TMDB Baseline

## Spec

- `specs/011-metadata-tmdb.md`
- `specs/006-full-scope-implementation-plan.md` P06

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/integrations/src/tmdb.ts`
- `packages/integrations/src/index.ts`
- `packages/integrations/tests/tmdb.test.ts`
- `apps/api/package.json`
- `apps/api/src/env.ts`
- `apps/api/src/settings.ts`
- `apps/api/src/tmdbCatalog.ts`
- `apps/api/src/routers/metadata.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/src/routers/titles.ts`
- `apps/api/src/validation.ts`
- `apps/api/tests/settings.test.ts`
- `apps/api/tests/tmdbCatalog.test.ts`
- `apps/api/tests/validation.test.ts`
- `specs/packets/0012-metadata-tmdb-baseline.md`

## Files Out Of Scope

- Browser admin settings UI for editing the TMDB key.
- Poster/backdrop image proxy endpoint.
- Live TMDB calls with a real key.
- Episode-level TMDB detail expansion.
- Prowlarr/qBittorrent matching.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- TMDB API key is read server-side from `TMDB_API_KEY` or `AppSetting` key `tmdb.apiKey`.
- `metadata.tmdbStatus` reports configured/unconfigured without returning the secret.
- `metadata.tmdbSearch`, `metadata.tmdbDetails`, and `metadata.trendingRemote` call the server-side TMDB client.
- Missing TMDB key returns a typed precondition failure.
- TMDB remote failures surface as typed integration errors at the integration boundary.
- `metadata.openTitleFromTmdb` persists a matched title with `TMDB` external ID data.
- `metadata.rematchTitleFromTmdb` reuses catalog rematch/external-ID conflict rules.
- Mocked TMDB tests cover movie search, show search, detail fetch, remote failures, and image path validation.
