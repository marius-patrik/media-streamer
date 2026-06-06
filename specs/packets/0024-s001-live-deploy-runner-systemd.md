# Packet 0024 s001 Live Deploy Runner Systemd

## Spec

- `specs/004-operations-deployment.md`
- `specs/006-full-scope-implementation-plan.md` P17
- `specs/015-ops-live-deploy.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `ops/scripts/compose-up-s001.sh`
- `ops/scripts/compose-down-s001.sh`
- `ops/scripts/sync-to-s001.sh`
- `ops/scripts/provision-env-s001.sh`
- `ops/scripts/deploy-s001.sh`
- `ops/scripts/smoke-s001.sh`
- `ops/scripts/register-runner-s001.sh`
- `ops/scripts/remove-runner-s001.sh`
- `ops/systemd/media-streamer-compose.service`
- `ops/systemd/media-streamer-compose.user.service`
- `ops/docker/compose.yml`
- `specs/packets/0024-s001-live-deploy-runner-systemd.md`

## Files Out Of Scope

- Stopping the old Python app on port `8080`.
- Mounting real media into CI jobs.
- Altering existing `agents` runners on `s001`.
- Replacing the host's system-level Docker or systemd configuration.

## Dependency Changes

None.

## Commands

```sh
ops/scripts/sync-to-s001.sh --apply
ssh s001 'cd /home/patrik/media-streamer && ops/scripts/deploy-s001.sh'
ssh s001 'mkdir -p ~/.config/systemd/user && cp /home/patrik/media-streamer/ops/systemd/media-streamer-compose.user.service ~/.config/systemd/user/media-streamer-compose.service && systemctl --user daemon-reload && systemctl --user enable --now media-streamer-compose.service'
ssh s001 'cd /home/patrik/media-streamer && ops/scripts/smoke-s001.sh'
gh api repos/marius-patrik/media-streamer/actions/runners
bun run check
bun run build
ops/scripts/container-smoke.sh
```

## Expected Evidence

- Remote sync archives the previous `/home/patrik/media-streamer` tree before replacement.
- Live deploy applies Prisma migrations and writes a compressed backup under `/mnt/HDD1/backups/media-streamer`.
- TailStreamer app is healthy on host port `8090`.
- Existing Python service on host port `8080` remains untouched.
- Postgres, qBittorrent, Prowlarr, and the CI runner publish no host ports.
- qBittorrent mounts downloads and config only, not `/mnt/HDD1/media`.
- GitHub Actions runner uses `ghcr.io/actions/actions-runner:latest`, is registered only to `marius-patrik/media-streamer`, and has labels `self-hosted`, `s001`, `media-streamer`, `docker`.
- Runner container mounts only `/mnt/HDD1/media-streamer/runner:/home/runner` and `/var/run/docker.sock:/var/run/docker.sock`.
- User systemd service is enabled and active under `patrik`; it uses Compose's `--env-file` path instead of putting secrets on the sudo command line.
- User journal for `media-streamer-compose.service` has no `BOOTSTRAP_SECRET=`, `POSTGRES_PASSWORD=`, `SESSION_SECRET=`, or Postgres `DATABASE_URL=` entries after cleanup.
- `ops/scripts/smoke-s001.sh` passes on `s001`.
- `bun run check` passes with Biome, typecheck, spec check, and unit tests.
- `bun run build` passes for all packages/apps.
- `ops/scripts/container-smoke.sh` passes against a temporary Compose stack.
