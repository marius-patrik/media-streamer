# 012 Cloud Providers

## Status

Planned.

## Scope

Configurable cloud provider templates for movie and episode embed URLs.

## Non-Goals

- No scraping streaming providers.
- No proxying cloud video.

## Contracts

- Provider templates support movie URL by external ID.
- Provider templates support TV URL by external ID, season, and episode.
- Admin can edit, enable, and disable templates.
- Cloud playback resolves to iframe/embed URLs.

## Security

- Template rendering only substitutes approved placeholders.
- Invalid URL templates reject.

## Failure Modes

- Missing external ID makes a cloud source unavailable.
- Disabled providers are excluded from source ranking.

## Acceptance Criteria

- Template rendering tests cover movie and episode URLs.
- Admin settings can update provider templates.
- Player source list includes enabled cloud sources only.

## Dependency Changes

None.
