# 008 Media Catalog And Titles

## Status

Planned.

## Scope

Title search, title detail, episode listing, metadata fields, external IDs, and match/rematch workflow.

## Non-Goals

- No scanner implementation.
- No TMDB client implementation.

## Contracts

- `Title` is the catalog root for movies and shows.
- `Episode` exists only under show titles.
- `ExternalId` stores provider IDs and supports title or episode mapping.
- `matchStatus` transitions are explicit: `UNMATCHED`, `NEEDS_REVIEW`, `MATCHED`.

## Security

- Web receives only display-safe metadata.
- Admin/rematch operations require admin or downloader role.

## Failure Modes

- Duplicate provider/value IDs reject.
- Episode creation without a show title rejects.

## Acceptance Criteria

- Titles router supports search, create/open, detail, rematch, and list episodes.
- Tests cover movie title, show episode, external ID uniqueness, and rematch transition.

## Dependency Changes

None.
