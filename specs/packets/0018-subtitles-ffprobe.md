# Packet 0018 Subtitles And Ffprobe

## Spec

- `specs/006-full-scope-implementation-plan.md` P06 and P10
- `specs/010-streaming-player.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/db/prisma/schema.prisma`
- `packages/db/src/index.ts`
- `packages/media/src/ffprobe.ts`
- `packages/media/src/subtitles.ts`
- `packages/media/src/scanner.ts`
- `packages/media/src/index.ts`
- `apps/api/src/mediaScanRepository.ts`
- `apps/api/src/streamRepository.ts`
- `apps/api/src/streaming.ts`
- `apps/api/src/main.ts`
- `apps/api/src/routers/library.ts`
- `apps/api/tests/streaming.test.ts`
- `packages/media/tests/ffprobe.test.ts`
- `packages/media/tests/subtitles.test.ts`
- `packages/media/tests/scanner.test.ts`
- `specs/packets/0018-subtitles-ffprobe.md`

## Files Out Of Scope

- Browser subtitle selector controls.
- Subtitle conversion or OCR.
- Multiple subtitle selection in the player UI.
- Prisma migration files for live deployment.
- Full ffmpeg transcoding policy beyond safe remux argv.

## Dependency Changes

None.

## Commands

```sh
bun --filter @tailstreamer/db generate
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Scanner discovers sibling `.srt` and `.vtt` files and stores structured subtitle metadata.
- Scanner probes video files with `ffprobe` during admin library scans and stores duration/container/video/audio metadata when available.
- Subtitle records are tied to `LocalAsset` and cascade when assets are deleted.
- `GET /subtitle/:assetId` serves the first stored subtitle only when the path remains under `MEDIA_ROOT`.
- Subtitle responses include content type, content length, and safe inline filename headers.
- Local/remux stream safety remains intact for missing assets and traversal attempts.
- `ffprobe` and `ffmpeg` invocations use argv arrays, not shell command strings.
