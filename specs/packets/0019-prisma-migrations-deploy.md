# Packet 0019 Prisma Migrations Deploy

## Spec

- `specs/003-data-model.md`
- `specs/006-full-scope-implementation-plan.md` P03 and P17

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/db/prisma/migrations/migration_lock.toml`
- `packages/db/prisma/migrations/0001_initial/migration.sql`
- `ops/scripts/deploy-s001.sh`
- `specs/packets/0019-prisma-migrations-deploy.md`

## Files Out Of Scope

- Live `s001` cutover.
- Existing production data migration from any archived Python app.
- Rollback automation beyond the existing backup-before-migration deploy flow.
- Future incremental migrations after schema changes.

## Dependency Changes

None.

## Commands

```sh
DATABASE_URL=postgresql://tailstreamer:tailstreamer@localhost:5432/tailstreamer bun --cwd packages/db prisma validate --schema prisma/schema.prisma
DATABASE_URL=postgresql://tailstreamer:tailstreamer@127.0.0.1:32768/tailstreamer bun --cwd packages/db prisma migrate deploy --schema prisma/schema.prisma
bash -n ops/scripts/deploy-s001.sh ops/scripts/backup-db.sh ops/scripts/smoke-s001.sh
bun run check
bun run build
```

## Expected Evidence

- Prisma has an initial Postgres migration artifact for all current schema models and enums.
- Migration lock identifies the Postgres provider.
- Disposable Postgres migration proof applies `0001_initial` successfully.
- Disposable Postgres proof includes `public."Subtitle"` and `_prisma_migrations` contains `0001_initial`.
- `deploy-s001.sh` starts Postgres before backup, builds the app image, runs `prisma migrate deploy`, starts the full Compose stack, and then runs smoke checks.
- Deploy path keeps the app host port on 8090 through Compose configuration.
