# Packet 0022 CI Container Smoke Hardening

## Spec

- `specs/004-operations-deployment.md`
- `specs/015-ops-live-deploy.md`
- `specs/006-full-scope-implementation-plan.md` P15 and P17

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `.github/workflows/ci.yml`
- `.github/workflows/container.yml`
- `ops/docker/Dockerfile`
- `ops/docker/compose.yml`
- `ops/scripts/container-smoke.sh`
- `ops/scripts/smoke-s001.sh`
- `specs/packets/0022-ci-container-smoke-hardening.md`

## Files Out Of Scope

- Live GitHub Actions run proof.
- Live `s001` deploy.
- Runner registration proof.
- Browser automation proof.

## Dependency Changes

None.

## Commands

```sh
bash -n ops/scripts/container-smoke.sh ops/scripts/smoke-s001.sh
POSTGRES_PASSWORD=check SESSION_SECRET=tailstreamer-compose-session-secret-32-bytes BOOTSTRAP_SECRET=tailstreamer-compose-bootstrap-secret docker compose -f ops/docker/compose.yml config
ops/scripts/container-smoke.sh
bun run check
bun run build
```

## Expected Evidence

- CI still uses the self-hosted `s001/media-streamer/docker` runner labels.
- CI does not run forked PR code on the self-hosted runner.
- Container workflow runs the fixture smoke script instead of only rendering Compose config.
- Docker image copies root TypeScript/Biome config and the Bun lockfile.
- Docker image generates Prisma Client before bundling the app.
- Compose host paths are overridable for smoke while production defaults stay under `/mnt/HDD1`.
- Compose network name is overridable for isolated smoke projects while production defaults to `tailstreamer`.
- Container smoke builds the app image, starts Postgres/qBittorrent/Prowlarr/app with temporary mounts, verifies `/health`, verifies Postgres readiness, rejects unexpected published ports, and cleans up container-owned temporary files.
