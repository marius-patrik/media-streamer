# Dependency Policy

User-approved dependency families for the clean baseline:

- Bun
- TypeScript
- React
- React DOM
- Rsbuild
- Tailwind CSS
- shadcn/ui conventions and generated local components
- Radix primitives
- Lucide React
- Dagre
- Framer Motion
- wouter
- tRPC
- Prisma
- Biome
- Valibot
- TanStack Query
- shadcn helper libraries

Anything else is allowed only after explicit user confirmation of the exact package name and why the packet needs it. This includes React Router, Vite, Next.js, Zustand, date libraries, browser test runners, chart/table/form libraries, or CSS tooling beyond Tailwind/Rsbuild.

## Exact Allowlist

The spec checker enforces this list against every `package.json`.

- `@biomejs/biome`
- `@prisma/client`
- `@radix-ui/react-slot`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-label`
- `@radix-ui/react-progress`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `@rsbuild/core`
- `@rsbuild/plugin-react`
- `@tanstack/react-query`
- `@tailstreamer/domain`
- `@tailstreamer/ui`
- `@trpc/client`
- `@trpc/react-query`
- `@trpc/server`
- `@types/bun`
- `@types/react`
- `@types/react-dom`
- `argon2`
- `class-variance-authority`
- `clsx`
- `dagre`
- `framer-motion`
- `lucide-react`
- `prisma`
- `react`
- `react-dom`
- `tailwindcss`
- `tailwindcss-animate`
- `tailwind-merge`
- `typescript`
- `valibot`
- `wouter`
