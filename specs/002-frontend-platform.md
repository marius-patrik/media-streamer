# 002 Frontend Platform

## Status

Accepted baseline.

## Scope

Establish the frontend stack before feature work.

## Non-Goals

- No landing page.
- No Vite.
- No full UX implementation in this baseline.

## Contracts

- Build tool: Rsbuild.
- Routing: `wouter`.
- Styling: Tailwind CSS with shadcn/ui conventions.
- UI primitives: Radix.
- Icons: Lucide.
- Motion: Framer Motion.
- Graph layout: Dagre.
- The first authenticated screen is the operational library/search shell.
- No nested-card clutter and no one-note purple/glass UI.

## Security

- Browser never stores TMDB, Prowlarr, qBittorrent, database, or bootstrap secrets.
- Admin-only settings are fetched from the API with session auth.

## Failure Modes

- Adding React Router, TanStack Router, or Next.js violates this spec.
- Adding helper dependencies outside `specs/dependencies.md` requires explicit user approval first.

## Acceptance Criteria

- `apps/web` uses `@rsbuild/core` and `@rsbuild/plugin-react`.
- `apps/web` imports routes from `wouter`.
- Tailwind config and shadcn component registry config exist.
- A minimal shell renders Library, Downloads, Admin, and Player route placeholders.

## Dependency Changes

Allowed for this spec: React, React DOM, Rsbuild, Rsbuild React plugin, Tailwind CSS, wouter, Radix primitives, Lucide React, Dagre, Framer Motion, TanStack Query, tRPC client/react-query, shadcn helper libraries, and tailwindcss-animate.
