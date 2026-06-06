# Packet 0004 API Auth Baseline

## Spec

- `specs/005-auth-sessions.md`
- `specs/003-backend-data-platform.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/api/**`
- `packages/db/src/**`
- `packages/db/package.json`
- `specs/packets/0004-api-auth-baseline.md`

## Files Out Of Scope

- Frontend auth screens.
- User management admin UI.
- Runtime validation dependency selection.
- Media scanner/import/download routes.

## Dependency Changes

- `valibot`: approved runtime validation library.

## Commands

```sh
bun --filter @tailstreamer/db generate
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- tRPC auth router exposes `me`, `bootstrapAdmin`, `login`, and `logout`.
- Request bodies are validated with Valibot schemas.
- Session cookies are HTTP-only.
- No validation library is added.
