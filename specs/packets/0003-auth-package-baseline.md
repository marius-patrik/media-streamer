# Packet 0003 Auth Package Baseline

## Spec

- `specs/005-auth-sessions.md`

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/auth/**`
- `specs/005-auth-sessions.md`
- `specs/dependencies.md`
- `specs/README.md`
- `AGENTS.md`
- `tsconfig.json`
- `scripts/spec-check.ts`

## Files Out Of Scope

- API auth endpoints.
- Bootstrap admin mutation.
- Session database repository.
- Runtime request validation library.
- Frontend auth screens.

## Dependency Changes

- `argon2`: approved by user for Argon2id password hashing.

## Commands

```sh
node scripts/spec-check.ts
grep -RIn '"zod"\|"eslint"\|from "zod"\|from "eslint"\|8080:8080\|localhost:8080' package.json apps packages ops .github AGENTS.md specs/*.md || true
bun --filter @tailstreamer/auth test
```

## Expected Evidence

- Spec checker passes.
- Auth package tests pass where Bun is available.
- No validation library is introduced.
- No API mutation accepts request bodies yet.
