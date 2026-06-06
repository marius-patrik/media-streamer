# Packet 0005 Auth Web Flow

## Spec

- `specs/005-auth-sessions.md`
- `specs/002-frontend-platform.md`
- `specs/006-full-scope-implementation-plan.md` P01

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/web/src/main.tsx`
- `apps/api/tests/validation.test.ts`
- `specs/packets/0005-auth-web-flow.md`

## Files Out Of Scope

- User management admin screens.
- Library, player, download, scanner, metadata, and provider feature implementation.
- Live deployment.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Web app calls `auth.me` to choose bootstrap/login vs authenticated shell.
- Bootstrap and login forms call tRPC mutations and invalidate `auth.me`.
- Authenticated shell shows role-aware Admin navigation and logout.
- Valibot auth input tests pass.
- Root checks and workspace build pass.
