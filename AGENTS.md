# TailStreamer Repo Rules

This rebuild is spec-driven. Implementation starts only after the relevant spec is accepted and linked from `specs/README.md`.

## Non-Negotiables

- Docker Compose deploy package for `s001`; no k3s.
- Bun/TypeScript backend; no Python backend.
- Frontend uses Rsbuild, React, Tailwind CSS, shadcn/ui conventions, Radix primitives, Lucide icons, Dagre for graph layout, and Framer Motion for motion.
- Routing uses `wouter`.
- Linting and formatting use Biome.
- Do not build the product as one monolithic file or one tangled app layer. Keep deployable apps and domain packages separate.
- Production checkout is `/home/patrik/media-streamer`.
- Media root is `/mnt/HDD1/media`; implementation code must not write there except through the import pipeline.
- qBittorrent, Prowlarr, Postgres, and the repo runner expose no host ports.
- App host port defaults to `8090`; do not bind host `8080` because it is already used on `s001`.
- Never commit secrets, `.env`, media files, downloaded torrents, or runner tokens.
- Dependencies outside `specs/dependencies.md` require explicit user confirmation of the exact package before they are added.

## Architecture Boundaries

- `apps/web`: Rsbuild React client only.
- `apps/api`: Bun HTTP/tRPC server only.
- `packages/domain`: TypeScript contracts and approved runtime validation contracts.
- `packages/auth`: password hashing, session token, cookie, and role helpers.
- `packages/db`: Prisma schema, migrations, seed/bootstrap data.
- `packages/integrations`: qBittorrent, Prowlarr, TMDB, cloud-provider adapters.
- `packages/media`: scanner, import planner, stream source selection, filesystem-safe utilities.
- `packages/ui`: shared shadcn-style primitives and Tailwind tokens.
- `ops`: Docker, systemd, deployment, backup, smoke, runner scripts.
- `specs`: source of truth for behavior and acceptance criteria.

## Spec Workflow

1. Create or update a spec before code.
2. Include scope, non-goals, data contracts, failure modes, security constraints, and acceptance tests.
3. Link implementation PRs to spec sections.
4. Add tests named after spec acceptance criteria.
5. Update the spec if implementation discovers a better contract; do not silently drift.

## Verification

Run before claiming a packet is complete:

```sh
bun install
bun run spec:check
bun run typecheck
bun run lint
bun test
docker compose -f ops/docker/compose.yml config
```
