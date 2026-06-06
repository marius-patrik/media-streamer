# 009 Library Scanner And Import

## Status

Planned.

## Scope

Recursive media scanning, subtitle discovery, ffprobe metadata, completed download import, review queue, and normalized media placement.

## Non-Goals

- No direct scan of `/downloads/incomplete`.
- No CI access to real `/mnt/HDD1/media`.

## Contracts

- Scanner scans only `MEDIA_ROOT`.
- Video extensions: `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`.
- Subtitle extensions: `.srt`, `.vtt`.
- Import pipeline is the only code path allowed to write into `/media`.
- Completed downloads import from `/downloads/complete` only.
- Ambiguous imports become `NEEDS_REVIEW`.

## Security

- All paths are resolved under configured roots.
- Path traversal tests are mandatory.
- Samples/junk are ignored during import selection.

## Failure Modes

- Any path escaping configured roots rejects.
- No relevant video file marks job `NEEDS_REVIEW`.

## Acceptance Criteria

- Scanner fixture creates provisional titles, episodes, and local assets.
- Import fixture chooses largest relevant file and creates a local asset.
- Tests prove incomplete downloads are ignored and traversal is rejected.

## Dependency Changes

No new dependency without approval. ffprobe/ffmpeg use host/container binaries.
