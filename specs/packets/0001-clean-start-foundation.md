# Packet 0001 Clean Start Foundation

## Spec

- `specs/000-clean-rebuild-contract.md`
- `specs/001-repository-architecture.md`
- `specs/002-frontend-platform.md`
- `specs/004-operations-deployment.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `AGENTS.md`
- `specs/**`
- `scripts/spec-check.ts`
- root workspace config
- `apps/web` baseline
- `apps/api` health baseline
- `packages/*` package boundaries
- `ops/**` skeleton
- `.github/workflows/**`

## Files Out Of Scope

- Feature implementations for auth, scanner, imports, downloads, TMDB, Prowlarr, qBittorrent, and player persistence.
- Live deployment and cutover.
- Runtime validation library selection.

## Dependency Changes

Only packages in `specs/dependencies.md` exact allowlist.

## Commands

```sh
node scripts/spec-check.ts
node -e "for (const f of ['package.json','biome.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"
grep -RIn "zod\|Zod\|eslint\|ESLint\|8080:8080\|localhost:8080" . || true
```

## Expected Evidence

- Spec checker passes.
- JSON manifests parse.
- Forbidden dependency and host-port strings are absent.
