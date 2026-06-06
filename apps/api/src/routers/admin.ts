import { prisma } from "@tailstreamer/db";
import { createQbittorrentClient } from "@tailstreamer/integrations";
import { TRPCError } from "@trpc/server";
import { readStringSetting, writeStringSetting } from "../settings";
import { roleProcedure, router } from "../trpc";
import { apiKeySettingInputParser, qbittorrentCredentialsInputParser } from "../validation";

const tmdbApiKeySetting = "tmdb.apiKey";
const prowlarrApiKeySetting = "prowlarr.apiKey";
const qbittorrentUsernameSetting = "qbittorrent.username";
const qbittorrentPasswordSetting = "qbittorrent.password";

export const adminRouter = router({
  updateTmdbApiKey: roleProcedure("ADMIN")
    .input(apiKeySettingInputParser)
    .mutation(async ({ input }) => {
      await writeStringSetting(prisma, tmdbApiKeySetting, input.apiKey);
      return { configured: Boolean(input.apiKey) };
    }),

  updateProwlarrApiKey: roleProcedure("ADMIN")
    .input(apiKeySettingInputParser)
    .mutation(async ({ input }) => {
      await writeStringSetting(prisma, prowlarrApiKeySetting, input.apiKey);
      return { configured: Boolean(input.apiKey) };
    }),

  updateQbittorrentCredentials: roleProcedure("ADMIN")
    .input(qbittorrentCredentialsInputParser)
    .mutation(async ({ input }) => {
      await writeStringSetting(prisma, qbittorrentUsernameSetting, input.username);
      await writeStringSetting(prisma, qbittorrentPasswordSetting, input.password);
      return { configured: Boolean(input.username && input.password) };
    }),

  ensureQbittorrentCategories: roleProcedure("ADMIN").mutation(async ({ ctx }) => {
    const username = ctx.env.qbittorrentUsername ?? (await readStringSetting(prisma, qbittorrentUsernameSetting));
    const password = ctx.env.qbittorrentPassword ?? (await readStringSetting(prisma, qbittorrentPasswordSetting));
    if (!username || !password) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "qBittorrent credentials are not configured" });
    }

    const client = createQbittorrentClient({
      baseUrl: ctx.env.qbittorrentUrl,
      username,
      password,
    });
    await client.createCategory({ name: "tailstreamer", savePath: ctx.env.downloadComplete });
    await client.createCategory({ name: "tailstreamer-review", savePath: ctx.env.downloadComplete });
    return { categories: ["tailstreamer", "tailstreamer-review"] };
  }),
});
