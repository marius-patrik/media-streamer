# Packet 0023 Live Deploy Preflight Smoke

## Spec

- `specs/015-ops-live-deploy.md`
- `specs/004-operations-deployment.md`
- `specs/006-full-scope-implementation-plan.md` P17

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `ops/scripts/preflight-s001.sh`
- `ops/scripts/deploy-s001.sh`
- `ops/scripts/backup-db.sh`
- `ops/scripts/smoke-s001.sh`
- `ops/scripts/container-smoke.sh`
- `specs/packets/0023-live-deploy-preflight-smoke.md`

## Files Out Of Scope

- Actual live execution on `s001`.
- Stopping the old Python app after live smoke proof.
- Real GitHub runner registration proof.
- Browser screenshot proof.

## Dependency Changes

None.

## Commands

```sh
bash -n ops/scripts/preflight-s001.sh ops/scripts/deploy-s001.sh ops/scripts/backup-db.sh ops/scripts/smoke-s001.sh ops/scripts/container-smoke.sh
ops/scripts/container-smoke.sh
bun run check
bun run build
POSTGRES_PASSWORD=check SESSION_SECRET=tailstreamer-compose-session-secret-32-bytes BOOTSTRAP_SECRET=tailstreamer-compose-bootstrap-secret docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- `preflight-s001.sh` is read-only and records host, git, env, listening ports, Compose config, Compose status, and systemd status.
- `deploy-s001.sh` refuses non-`s001` hosts.
- Deploy creates `/home/patrik/media-streamer.archive.<timestamp>.tar.gz` before migration.
- Deploy starts Postgres with health waiting before backup.
- Backup failure blocks migration and prints `backup_path=...`.
- Deploy prints archive, migration, and smoke result evidence.
- Production smoke checks `/health`, DB readiness, internal qBittorrent, internal Prowlarr, optional bootstrap/login, optional runner labels, and host port audit.
- Fixture container smoke applies migrations, starts the full Compose stack with temporary mounts, verifies `/health`, DB, internal qBittorrent, internal Prowlarr, auth bootstrap/login, local Range `206`, published port audit, and cleanup.
