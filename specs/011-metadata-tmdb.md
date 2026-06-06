# 011 Metadata And TMDB

## Status

Planned.

## Scope

TMDB search, detail fetch, external ID mapping, trending remote results, poster/backdrop proxying, and rematch workflow.

## Non-Goals

- No browser-stored TMDB key.
- No scraping.

## Contracts

- TMDB API key is read only by the API.
- TMDB search results can create or rematch local titles.
- Posters/backdrops are proxied or cached server-side.

## Security

- TMDB key never leaves the server.
- Remote image paths are validated before proxying.

## Failure Modes

- Missing TMDB key returns config-required status.
- Remote failures surface typed integration errors.

## Acceptance Criteria

- Mocked TMDB tests cover movie search, show search, detail fetch, and external ID persistence.
- Admin settings show TMDB configured/unconfigured without revealing the key.

## Dependency Changes

None.
