# Packet 0002 Data Model Baseline

## Spec

- `specs/003-backend-data-platform.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/db/prisma/schema.prisma`
- `specs/003-backend-data-platform.md`
- `specs/packets/0002-data-model-baseline.md`

## Files Out Of Scope

- API routers and mutations.
- Runtime request validation package selection.
- Media scanner/import implementation.
- Docker deployment behavior.

## Dependency Changes

None.

## Commands

```sh
node scripts/spec-check.ts
grep -RIn '"zod"\|"eslint"\|from "zod"\|from "eslint"\|8080:8080\|localhost:8080' package.json apps packages ops .github AGENTS.md specs/*.md || true
```

## Expected Evidence

- Spec checker passes.
- Schema contains all planned persistent model names.
- No runtime validation dependency was introduced by this data-model packet.
