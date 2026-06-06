import { prisma } from "@tailstreamer/db";
import { TmdbIntegrationError, createTmdbClient } from "@tailstreamer/integrations";
import { TRPCError } from "@trpc/server";
import { readStringSetting } from "../settings";
import { tmdbDetailToTitleData } from "../tmdbCatalog";
import { authedProcedure, roleProcedure, router } from "../trpc";
import {
  tmdbDetailsInputParser,
  tmdbOpenTitleInputParser,
  tmdbRematchTitleInputParser,
  tmdbSearchInputParser,
  tmdbTrendingInputParser,
} from "../validation";
import { openOrCreateTitle, rematchTitle } from "./titles";

const tmdbApiKeySetting = "tmdb.apiKey";

export const metadataRouter = router({
  tmdbStatus: roleProcedure("ADMIN").query(async ({ ctx }) => ({
    configured: Boolean(await resolveTmdbApiKey(ctx.env.tmdbApiKey)),
  })),

  tmdbSearch: authedProcedure
    .input(tmdbSearchInputParser)
    .query(async ({ ctx, input }) => withTmdb(ctx.env.tmdbApiKey, (client) => client.search(input))),

  tmdbDetails: authedProcedure
    .input(tmdbDetailsInputParser)
    .query(async ({ ctx, input }) => withTmdb(ctx.env.tmdbApiKey, (client) => client.details(input))),

  trendingRemote: authedProcedure
    .input(tmdbTrendingInputParser)
    .query(async ({ ctx, input }) => withTmdb(ctx.env.tmdbApiKey, (client) => client.trending(input))),

  openTitleFromTmdb: roleProcedure("ADMIN", "DOWNLOADER")
    .input(tmdbOpenTitleInputParser)
    .mutation(async ({ ctx, input }) => {
      const detail = await withTmdb(ctx.env.tmdbApiKey, (client) => client.details(input));
      return openOrCreateTitle(tmdbDetailToTitleData(detail));
    }),

  rematchTitleFromTmdb: roleProcedure("ADMIN", "DOWNLOADER")
    .input(tmdbRematchTitleInputParser)
    .mutation(async ({ ctx, input }) => {
      const detail = await withTmdb(ctx.env.tmdbApiKey, (client) =>
        client.details({ kind: input.kind, tmdbId: input.tmdbId }),
      );
      const titleData = tmdbDetailToTitleData(detail);
      return rematchTitle({
        titleId: input.titleId,
        matchStatus: "MATCHED",
        name: titleData.name,
        year: titleData.year,
        overview: titleData.overview,
        posterPath: titleData.posterPath,
        backdropPath: titleData.backdropPath,
        externalId: titleData.externalId,
      });
    }),
});

async function withTmdb<TResult>(
  envApiKey: string | null,
  callback: (client: ReturnType<typeof createTmdbClient>) => Promise<TResult>,
) {
  const apiKey = await resolveTmdbApiKey(envApiKey);
  if (!apiKey) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "TMDB API key is not configured" });
  }
  try {
    return await callback(createTmdbClient({ apiKey }));
  } catch (error) {
    if (error instanceof TmdbIntegrationError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
    throw error;
  }
}

async function resolveTmdbApiKey(envApiKey: string | null) {
  return envApiKey ?? (await readStringSetting(prisma, tmdbApiKeySetting));
}
