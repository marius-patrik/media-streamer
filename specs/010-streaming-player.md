# 010 Streaming And Player

## Status

Planned.

## Scope

Local streaming, Range support, remux endpoint, subtitle endpoint, source ranking, playback progress, and unified player UX.

## Non-Goals

- No provider scraping.
- No cloud video proxying.

## Contracts

- `GET /stream/local/:assetId` supports Range and returns `206` for valid byte ranges.
- `GET /stream/remux/:assetId` starts ffmpeg with safe argument construction.
- `GET /subtitle/:assetId` serves known subtitle files.
- Source ranking order: explicit last source, local asset, completed download, preferred cloud provider, any enabled cloud provider.
- Player uses a single UX for local, download, and cloud sources.

## Security

- Streaming endpoints never accept raw filesystem paths.
- Asset IDs must resolve to DB assets under allowed roots.

## Failure Modes

- Invalid ranges return `416`.
- Missing assets return `404`.
- Unsafe remux command construction blocks merge.

## Acceptance Criteria

- Range streaming tests cover `206`, `416`, and missing asset.
- Source ranking unit tests cover all ranking tiers.
- Player UI has source switcher, context, subtitle controls, and progress controls.

## Dependency Changes

None.
