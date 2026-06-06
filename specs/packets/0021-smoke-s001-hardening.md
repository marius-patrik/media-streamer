# Packet 0021 Smoke S001 Hardening

## Spec

- `specs/004-operations-deployment.md`
- `specs/015-ops-live-deploy.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `ops/scripts/smoke-s001.sh`
- `specs/packets/0021-smoke-s001-hardening.md`

## Files Out Of Scope

- Live `s001` smoke execution.
- Auth bootstrap/login smoke.
- Range streaming fixture smoke.
- Runner registration proof.

## Dependency Changes

None.

## Commands

```sh
bash -n ops/scripts/smoke-s001.sh ops/scripts/deploy-s001.sh
bun run check
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Smoke checks app `/health` on `${APP_HOST_PORT:-8090}`.
- Smoke checks Postgres readiness through Compose.
- Smoke checks qBittorrent and Prowlarr are reachable from the app container over the internal Compose network.
- Smoke fails if any service other than app has a published host port.
- Smoke allows only the configured app host port mapped to container `8080`.
