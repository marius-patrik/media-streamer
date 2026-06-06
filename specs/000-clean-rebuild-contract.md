# 000 Clean Rebuild Contract

## Status

Accepted baseline.

## Scope

Create a clean start point for TailStreamer as a Docker Compose deploy package for `s001`.

## Non-Goals

- No implementation copied from the archived Python app.
- No k3s.
- No one-container or one-layer monolith.
- No hidden dependency additions.

## Contracts

- The app is split into `apps/*` and `packages/*`.
- Specs precede implementation.
- Each implementation packet must name its spec, paths in scope, paths out of scope, commands to run, and expected evidence.
- Production checkout remains `/home/patrik/media-streamer`.

## Security

- Secrets live in `.env`, GitHub secrets, or host config only.
- CI runner is repo-specific and does not mount media or downloads.
- Media writes occur only through the import package contract.

## Failure Modes

- If a spec and code disagree, stop and update the spec or code before continuing.
- If a dependency is not already approved in `specs/dependencies.md`, ask for explicit confirmation of the exact package before adding it.

## Acceptance Criteria

- `AGENTS.md` defines repo rules and architecture boundaries.
- `specs/README.md` indexes active specs.
- `scripts/spec-check.ts` fails when required spec sections or dependency policy are missing.

## Dependency Changes

No runtime dependency required by this spec.
