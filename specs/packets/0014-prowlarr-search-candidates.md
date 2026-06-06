# Packet 0014 Prowlarr Search Candidates

## Spec

- `specs/013-prowlarr-search.md`
- `specs/006-full-scope-implementation-plan.md` P11

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/integrations/src/prowlarr.ts`
- `packages/integrations/src/index.ts`
- `packages/integrations/tests/prowlarr.test.ts`
- `apps/api/src/env.ts`
- `apps/api/src/downloadSerialization.ts`
- `apps/api/src/routers/downloads.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/src/validation.ts`
- `apps/api/tests/downloadSerialization.test.ts`
- `apps/api/tests/validation.test.ts`
- `specs/packets/0014-prowlarr-search-candidates.md`

## Files Out Of Scope

- qBittorrent add/start/pause/resume/delete.
- Torrent upload forwarding.
- Download job status polling.
- React downloads/search UI.
- Live Prowlarr calls with a real key.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Prowlarr API key is read server-side from `PROWLARR_API_KEY` or `AppSetting` key `prowlarr.apiKey`.
- `downloads.prowlarrStatus` reports configured/reachable/version without returning the secret.
- Prowlarr search inputs are Valibot-validated.
- Prowlarr results normalize into candidate name, magnet URI, torrent URL, size, seeders, leechers, quality, trusted flag, and indexer.
- `downloads.searchProwlarr` persists normalized results as `SearchCandidate` rows.
- `downloads.listCandidates` returns JSON-safe persisted candidates.
- Missing Prowlarr key returns a typed precondition failure and does not create jobs.
- Empty or failed searches do not create `DownloadJob` rows.
