# Packet 0009 Local Streaming And Remux Safety

## Spec

- `specs/010-streaming-player.md`
- `specs/006-full-scope-implementation-plan.md` P08

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/api/src/main.ts`
- `apps/api/src/streaming.ts`
- `apps/api/src/streamRepository.ts`
- `apps/api/tests/streaming.test.ts`
- `specs/packets/0009-local-streaming-range.md`

## Files Out Of Scope

- Subtitle persistence and serving.
- Player UI source switcher.
- Playback progress APIs.
- Download and cloud source playback.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
```

## Expected Evidence

- `GET /stream/local/:assetId` resolves only a stored local asset ID.
- Streamed assets must be under configured `MEDIA_ROOT`.
- Valid byte ranges return `206` with `Content-Range`.
- Invalid byte ranges return `416`.
- Missing or unsafe assets return `404`.
- The API build includes the streaming route.
- `GET /stream/remux/:assetId` resolves only a stored local asset ID.
- Remux starts ffmpeg with an argv array, not a shell command string.
- Remux refuses missing or unsafe assets before starting ffmpeg.
