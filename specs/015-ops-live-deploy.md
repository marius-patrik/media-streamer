# 015 Operations Live Deploy

## Status

Planned.

## Scope

Live `s001` deployment, archive, backup, migration, systemd, official GitHub runner registration, workflow proof, smoke tests, and rollback notes.

## Non-Goals

- No stopping existing services before TailStreamer smoke passes on `8090`.
- No mutation of existing `agents` runners.
- No host `8080` binding.

## Contracts

- Preflight is read-only.
- Deploy archives any existing production checkout before replacement.
- DB backup runs before migrations.
- Runner is registered only to `marius-patrik/media-streamer`.
- Runner labels: `self-hosted`, `s001`, `media-streamer`, `docker`.

## Security

- Runner does not mount media or downloads.
- Workflows do not run untrusted fork code on the self-hosted runner.
- Secrets are provisioned out of band.

## Failure Modes

- Missing backup blocks migrations.
- Unexpected published port blocks release.
- Runner registered to wrong repo blocks release.

## Acceptance Criteria

- Preflight report records existing port/service state.
- Deploy output records archive path, backup path, migration result, Compose health, and smoke result.
- Smoke proves `/health`, DB, qBit, Prowlarr, auth bootstrap/login, Range streaming fixture, runner labels, and port audit.

## Dependency Changes

None.
