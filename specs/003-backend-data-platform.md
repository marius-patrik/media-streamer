# 003 Backend And Data Platform

## Status

Accepted baseline.

## Scope

Define the API, auth, Prisma, media, and integration package boundaries.

## Non-Goals

- No endpoint implementation until data contracts and tests are approved.
- No Python backend.

## Contracts

- `apps/api` owns HTTP server wiring only.
- tRPC routers live in API modules but depend on domain package contracts.
- Prisma schema lives in `packages/db/prisma/schema.prisma`.
- Media scanner and import planner live in `packages/media`.
- Provider clients live in `packages/integrations`.
- `UserTitleState` uses a required `subjectKey` for uniqueness because SQL nullable composite keys do not enforce one movie-level row when `episodeId` is null.
- Runtime request validation uses Valibot for external/API inputs.

## Security

- Sessions are HTTP-only cookies.
- Password hashing must use Argon2id or approved bcrypt parameters.
- Path traversal tests are mandatory before streaming/import endpoints ship.

## Failure Modes

- API code writing directly to `/media` is blocked.
- Provider keys leaking into web payloads are blocked.

## Acceptance Criteria

- Prisma package validates independently.
- API package exposes `/health` only in the baseline.
- Domain package owns shared TypeScript contracts.
- Prisma schema contains user/session/title/episode/external ID/local asset/cloud source/download/search candidate/user state/app setting models.
- Prisma schema contains enum contracts for roles, title kind, match status, download status, source type, and provider identifiers.
- API router mutations use Valibot schemas at the tRPC input boundary.

## Dependency Changes

Allowed for this spec: Bun, tRPC, Prisma, Valibot, and Argon2id through the approved `argon2` package.
