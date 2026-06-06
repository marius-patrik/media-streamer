# 004 Operations And Deployment

## Status

Accepted baseline.

## Scope

Define Docker Compose, systemd, deploy, backup, smoke, and GitHub Actions runner expectations for `s001`.

## Non-Goals

- No live cutover in this baseline.
- No mutation of existing `agents` runners.

## Contracts

- Only app publishes one host port. Baseline host port is `8090`; container port remains `8080`.
- `apps/web` and `apps/api` remain separate workspace apps, but production publishes one `app` service.
- The production `app` service serves `/health`, `/trpc`, stream/subtitle/assets endpoints, and built Rsbuild web assets.
- Postgres, qBittorrent, Prowlarr, and `ci-runner` are internal only.
- `ci-runner` uses the official GitHub runner image `ghcr.io/actions/actions-runner:latest`; do not replace it with a third-party runner image.
- Production state root is `/mnt/HDD1/media-streamer`.
- Media root is `/mnt/HDD1/media`.
- Downloads root is `/mnt/HDD1/downloads`.
- Backup root is `/mnt/HDD1/backups/media-streamer`.

## Security

- Runner is registered only to `marius-patrik/media-streamer`.
- Runner mounts Docker socket but not media or downloads.
- Workflows must not run untrusted fork code on the self-hosted runner.

## Failure Modes

- Any exposed host port other than the configured app host port blocks release.
- Missing backup before migration blocks deploy.

## Acceptance Criteria

- Compose config declares app, postgres, qbittorrent, prowlarr, and ci-runner.
- Compose maps `${APP_HOST_PORT:-8090}:8080` for the app.
- Systemd unit points at `/home/patrik/media-streamer/ops/docker`.
- Deploy, backup, smoke, register-runner, and remove-runner scripts exist.

## Dependency Changes

No application dependency required by this spec.
