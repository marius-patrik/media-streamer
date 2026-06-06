# Packet 0013 Cloud Provider Templates

## Spec

- `specs/012-cloud-providers.md`
- `specs/006-full-scope-implementation-plan.md` P10

## Repo Path

`/home/patrik/media-streamer`

## Branch Or Worktree

Current fresh workspace.

## Files In Scope

- `packages/integrations/src/cloud.ts`
- `packages/integrations/src/index.ts`
- `packages/integrations/tests/cloud.test.ts`
- `apps/api/src/settings.ts`
- `apps/api/src/routers/cloud.ts`
- `apps/api/src/routers/index.ts`
- `apps/api/src/validation.ts`
- `apps/api/tests/settings.test.ts`
- `apps/api/tests/validation.test.ts`
- `specs/packets/0013-cloud-provider-templates.md`

## Files Out Of Scope

- React admin provider template editor.
- React iframe player surface.
- Provider scraping or proxying.
- External provider-specific presets beyond the shipped generic disabled template.
- Browser tests.

## Dependency Changes

None.

## Commands

```sh
bun run check
bun run build
POSTGRES_PASSWORD=check docker compose -f ops/docker/compose.yml config
```

## Expected Evidence

- Cloud template rendering supports movie URLs by external ID.
- Cloud template rendering supports episode URLs by external ID, season, and episode.
- Unsupported placeholders reject.
- Templates must render to `http` or `https` URLs.
- Admin can update provider templates through `cloud.updateProviderTemplates`.
- `cloud.resolveCloudSource` resolves enabled templates only, requires an external ID, and upserts a `CloudSource` for player ranking.
- Disabled providers are not resolved into player sources.
