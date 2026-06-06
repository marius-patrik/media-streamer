import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "./context";
import { readEnv } from "./env";
import { startAutomaticLibraryScan } from "./libraryScan";
import { appRouter } from "./routers";
import { createPrismaStreamAssetRepository } from "./streamRepository";
import { handleLocalAssetStream, handleRemuxAssetStream, handleSubtitleStream } from "./streaming";

const env = readEnv();
const streamRepository = createPrismaStreamAssetRepository();
startAutomaticLibraryScan(env);

Bun.serve({
  port: env.port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "tailstreamer-api" });
    }
    if (url.pathname.startsWith("/trpc")) {
      return fetchRequestHandler({
        endpoint: "/trpc",
        req: request,
        router: appRouter,
        createContext,
        responseMeta({ ctx }) {
          return { headers: ctx ? Object.fromEntries(ctx.responseHeaders.entries()) : undefined };
        },
      });
    }
    const localStreamMatch = /^\/stream\/local\/([^/]+)$/.exec(url.pathname);
    if (localStreamMatch) {
      return handleLocalAssetStream({
        request,
        assetId: decodeURIComponent(localStreamMatch[1]),
        mediaRoot: env.mediaRoot,
        repository: streamRepository,
      });
    }
    const remuxStreamMatch = /^\/stream\/remux\/([^/]+)$/.exec(url.pathname);
    if (remuxStreamMatch) {
      return handleRemuxAssetStream({
        request,
        assetId: decodeURIComponent(remuxStreamMatch[1]),
        mediaRoot: env.mediaRoot,
        repository: streamRepository,
      });
    }
    const subtitleMatch = /^\/subtitle\/([^/]+)$/.exec(url.pathname);
    if (subtitleMatch) {
      return handleSubtitleStream({
        request,
        assetId: decodeURIComponent(subtitleMatch[1]),
        mediaRoot: env.mediaRoot,
        repository: streamRepository,
      });
    }
    return serveStatic(url.pathname, env.webDist);
  },
});

console.log(`TailStreamer API listening on :${env.port}`);

function serveStatic(pathname: string, webDist: string) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const relative = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const candidate = join(process.cwd(), webDist, relative);
  if (existsSync(candidate)) return new Response(Bun.file(candidate));
  const fallback = join(process.cwd(), webDist, "index.html");
  if (existsSync(fallback)) return new Response(Bun.file(fallback));
  return new Response("TailStreamer", { status: 200 });
}
