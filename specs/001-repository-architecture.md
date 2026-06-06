# 001 Repository Architecture

## Status

Accepted baseline.

## Scope

Define the workspace layout and prevent another tangled implementation.

## Non-Goals

- No feature implementation beyond package entry points.
- No deployment cutover.

## Contracts

- `apps/web`: Rsbuild React app and routing.
- `apps/api`: Bun HTTP/tRPC boundary.
- `packages/domain`: TypeScript contracts and approved runtime validation contracts.
- `packages/db`: Prisma schema, migrations, and seed/bootstrap data.
- `packages/media`: scanner/import/streaming domain logic.
- `packages/integrations`: qBittorrent, Prowlarr, TMDB, and cloud-provider clients.
- `packages/ui`: shadcn-style primitives, Tailwind preset, tokens.
- `ops`: Docker Compose, systemd, deploy, backup, smoke, runner scripts.
- `specs`: architecture and behavior contracts.

## Security

Package boundaries must not leak filesystem paths, secrets, or provider API keys into `apps/web`.

## Failure Modes

- Shared logic appearing directly inside `apps/web` or `apps/api` must be extracted into a package.
- A package import cycle blocks the packet.

## Acceptance Criteria

- Workspace package manifests exist for every app/package.
- TypeScript path aliases point at package source boundaries.
- Root scripts run checks across workspaces.

## Dependency Changes

No additional dependency beyond the approved stack.
