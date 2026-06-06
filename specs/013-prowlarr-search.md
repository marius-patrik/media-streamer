# 013 Prowlarr Search

## Status

Planned.

## Scope

Prowlarr API client, candidate search, normalization, indexer/config status, and search candidate persistence.

## Non-Goals

- No direct indexer scraping outside Prowlarr.
- No untrusted provider keys in browser.

## Contracts

- API queries Prowlarr over internal Compose network.
- Search results normalize into `SearchCandidate`.
- Candidates store name, magnet URI, size, seeders, leechers, quality, and trusted status.

## Security

- Prowlarr API key is server-side only.
- Search inputs validate with Valibot.

## Failure Modes

- Missing Prowlarr key returns config-required status.
- Empty or failed searches do not create jobs.

## Acceptance Criteria

- Mocked Prowlarr tests cover result normalization and candidate persistence.
- Admin health reports Prowlarr configured and reachable status.

## Dependency Changes

None.
