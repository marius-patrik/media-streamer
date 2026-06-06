# Packet 0006 Users Admin Baseline

## Spec

- `specs/007-users-admin.md`
- `specs/006-full-scope-implementation-plan.md` P03

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `apps/api/src/trpc.ts`
- `apps/api/src/validation.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/src/routers/users.ts`
- `apps/api/tests/validation.test.ts`
- `apps/web/src/main.tsx`
- `specs/packets/0006-users-admin-baseline.md`

## Files Out Of Scope

- Provider settings health.
- TMDB/Prowlarr/qBittorrent configuration UI.
- Library scan/import review.
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

- Users router exposes list, create, update role, disable, and change password procedures.
- Admin-only procedures use role middleware.
- Last enabled admin cannot be disabled or demoted.
- Admin UI lists users and supports create, role update, and disable actions.
- Valibot tests cover user create, role validation, and user ID parsing.
