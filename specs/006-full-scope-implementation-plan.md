# 006 Full Scope Implementation Plan

## Status

Accepted execution plan.

## Scope

Deliver TailStreamer as a full Docker Compose deployment on `s001` with Bun API, Rsbuild React web, tRPC, Prisma/Postgres, local auth, media scanning/import, streaming, TMDB metadata, cloud source templates, Prowlarr search, qBittorrent downloads, a dedicated official GitHub Actions runner, backups, smoke tests, and live cutover proof.

## Non-Goals

- No k3s.
- No Python backend.
- No direct CI access to `/mnt/HDD1/media`.
- No browser-stored API keys.
- No untrusted fork execution on the self-hosted runner.
- No third-party GitHub runner image.

## Contracts

- Product name is TailStreamer.
- Repo is `marius-patrik/media-streamer`; production checkout is `/home/patrik/media-streamer`.
- Production host is `s001`.
- Host app port is `8090`; host `8080` remains reserved for existing services.
- Single published Compose service: `app`.
- Internal services: `postgres`, `qbittorrent`, `prowlarr`, `ci-runner`.
- Official runner image: `ghcr.io/actions/actions-runner:latest`.
- State root: `/mnt/HDD1/media-streamer`.
- Media root: `/mnt/HDD1/media`.
- Download root: `/mnt/HDD1/downloads`.
- Backup root: `/mnt/HDD1/backups/media-streamer`.
- Archive any pre-existing production tree before replacement as `/home/patrik/media-streamer.archive.<timestamp>.tar.gz`.

## Security

- Import pipeline is the only application path allowed to write into `/media`.
- Scanner never scans `/downloads/incomplete`.
- Downloads complete under `/downloads/complete` and are imported explicitly.
- qBittorrent must not mount `/mnt/HDD1/media`.
- Runner mounts Docker socket but not media or downloads.
- Secrets remain in `.env`, host config, or GitHub secrets; no secrets in Git.
- API input validation uses Valibot.
- Auth uses Argon2id and HTTP-only cookies.

## Failure Modes

- Any exposed host port other than `${APP_HOST_PORT:-8090}` blocks release.
- Missing DB backup before migration blocks deployment.
- Runner registration to a repo other than `marius-patrik/media-streamer` blocks release.
- API mutation without Valibot input validation blocks merge.
- Media write outside import pipeline blocks merge.
- Live cutover cannot stop existing services until new app smoke passes on `8090`.

## Acceptance Criteria

- Every packet links to specs and includes scope, out-of-scope files, commands, and evidence.
- `bun run check`, `bun run build`, Prisma validation, and Compose config pass before deploy.
- Browser build uses Rsbuild, Tailwind, shadcn helper deps, Radix, Lucide, Dagre, Framer Motion, TanStack Query, tRPC React Query, and wouter.
- API serves `/health`, `/trpc`, built web assets, and streaming endpoints from the single `app` service.
- Full feature acceptance is covered by the packet plan below.
- Live `s001` deploy evidence includes archive, backup, migration, service health, smoke output, and port audit.

## Orchestrator Role

Codex/operator owns integration, packet sequencing, dependency gates, final verification, and live deploy approval gates.

- Use tmux as worker supervisor.
- Use `kimi` for spec review, UX critique, stale-reference audit, and broad consistency checks.
- Use `agy` for mechanical implementation slices, tests, and repetitive verification loops.
- Worker outputs are claims until verified by Codex/operator through file inspection, tests, Compose config, smoke output, or live proof.
- Workers may not touch `/mnt/HDD1/media`, existing `agents` runners, secrets, or live services unless an explicit host-mutation packet says so.

## Packet Plan

### P00 Prep Lock

- Owner: Codex/operator with `kimi`/`agy` read-only audits.
- Mutation boundary: repo-only.
- Scope: specs, dependency policy, app architecture, official runner contract, TailStreamer naming.
- Evidence: `bun run check`, `bun run build`, Compose config, worker audit summaries.

### P01 Auth End To End

- Owner: Codex with `agy` tests.
- Scope: Valibot auth inputs, Prisma sessions, bootstrap, login, logout, `me`, web bootstrap/login/logout screens.
- Evidence: Bun unit tests, API integration test with temporary Postgres, browser-free web build.

### P02 App Shell And Route Guards

- Owner: Codex; `kimi` UX critique.
- Scope: wouter routes, authenticated layout, responsive shell, Library/Downloads/Player/Admin route skeletons, query error states.
- Evidence: Rsbuild build, screenshot review when browser tooling is approved later.

### P03 Admin Settings And Users

- Owner: Codex + `agy`.
- Scope: user create/disable/role update/password change, app settings store, TMDB/Prowlarr/qBit config status, health panels.
- Evidence: role permission tests, Valibot input tests, admin route smoke.

### P04 Domain Parsers And Path Safety

- Owner: `agy` implementation, Codex review.
- Scope: media filename parser, TV `SxxEyy`, extension allowlist, subtitle detection, path traversal rejection, safe relative paths.
- Evidence: Bun regression triplet for traversal, movie parse, TV parse.

### P05 Scanner

- Owner: Codex + `agy`.
- Scope: recursive `/media` scan, ffprobe metadata, provisional titles, episodes, local assets, subtitles.
- Evidence: fixture scan integration test; proof scanner excludes downloads.

### P06 Metadata And Title Matching

- Owner: Codex.
- Scope: TMDB client, title search/details, external IDs, rematch, poster/backdrop asset proxy.
- Evidence: mocked TMDB tests and no browser-stored API key.

### P07 Source Model And Player Ranking

- Owner: `agy` implementation, Codex review.
- Scope: local/download/cloud source ranking, user progress, last source, subtitles, source switcher API.
- Evidence: ranking tests and progress persistence tests.

### P08 Local Streaming

- Owner: Codex.
- Scope: `/stream/local/:assetId`, Range `206`, subtitle endpoint, safe path checks, `/stream/remux/:assetId` ffmpeg command construction.
- Evidence: Range tests, traversal tests, remux command unit test.

### P09 Player UX

- Owner: Codex; `kimi` UX review.
- Scope: unified player UI, source switcher, title/episode context, local/remux mode, subtitle controls, progress controls.
- Evidence: build plus UX review report.

### P10 Cloud Providers

- Owner: Codex.
- Scope: provider template defaults, admin edit/disable, movie/episode URL rendering, iframe playback source.
- Evidence: template rendering tests and provider settings tests.

### P11 Prowlarr Search

- Owner: `agy` implementation, Codex review.
- Scope: Prowlarr API client, result normalization, candidate persistence, admin indexer/config status.
- Evidence: mocked Prowlarr tests, candidate normalization tests.

### P12 qBittorrent Downloads

- Owner: Codex + `agy`.
- Scope: qBit login, add magnet, upload torrent, categories `tailstreamer` and `tailstreamer-review`, job status mapping, pause/resume/delete.
- Evidence: mocked qBit tests, status mapping tests, compose mount audit showing no media mount.

### P13 Import Pipeline

- Owner: Codex.
- Scope: completed download import, largest relevant file selection, junk/sample filtering, normalized media paths, ambiguous review queue.
- Evidence: fixture import test, media write path audit, job status transitions.

### P14 Downloads And Import Review UX

- Owner: Codex; `kimi` UX review.
- Scope: search candidates, add magnet/upload torrent, queue operations, import review, manual mapping.
- Evidence: build, state transition tests, UX critique.

### P15 Ops And CI Runner

- Owner: Codex/operator.
- Scope: official GitHub runner registration/removal scripts, workflows, Compose, systemd, backup, smoke, no untrusted fork runner execution.
- Evidence: Compose config, workflow lint by inspection, runner token script dry-run where possible.

### P16 Container Smoke

- Owner: Codex + `agy`.
- Scope: fixture Compose stack, build app image, Postgres health, API health, internal-only service audit.
- Evidence: container workflow output and port audit.

### P17 s001 Preflight

- Owner: Codex/operator.
- Mutation boundary: read-only host inspection.
- Scope: current `/home/patrik/media-streamer`, existing services on `8090`, `/mnt/HDD1` directory state, Docker/systemd status, old Python service on `8080`.
- Evidence: SSH transcript, no mutation.

### P18 s001 Deploy

- Owner: Codex/operator.
- Mutation boundary: host mutation after approval.
- Scope: archive old tree, pull/copy repo, create dirs, write `.env` out of band, build image, start Compose, migrate DB, seed defaults.
- Evidence: archive path, backup path, migration output, Compose health.

### P19 Live Smoke And Release Proof

- Owner: Codex/operator; `kimi` final consistency audit.
- Scope: `/health`, auth bootstrap/login, DB connection, qBit API, Prowlarr API, local stream Range fixture, port exposure audit, runner repo registration.
- Evidence: smoke log, `docker compose ps`, no host ports except `8090`, runner labels.

### P20 Post-Deploy Handoff

- Owner: Codex/operator.
- Scope: update specs with actual deployment evidence, known gaps, commands, rollback path, next feature backlog.
- Evidence: handoff/report file and clean verification.

## Dependency Changes

Approved prep dependencies: Valibot, TanStack Query, tRPC client/react-query, shadcn helper dependencies, selected Radix primitives, tailwindcss-animate.
