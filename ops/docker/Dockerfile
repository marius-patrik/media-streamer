FROM oven/bun:1.3.11 AS deps
WORKDIR /app
COPY package.json bun.lock* tsconfig.json biome.json ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile || bun install

FROM deps AS build
RUN bun --filter @tailstreamer/db generate
RUN bun run build

FROM oven/bun:1.3.11
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
ENV PORT=8080
ENV WEB_DIST=dist/web
EXPOSE 8080
CMD ["bun", "dist/api/main.js"]
