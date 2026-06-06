import { prisma } from "@tailstreamer/db";
import {
  ProwlarrIntegrationError,
  QbittorrentIntegrationError,
  createProwlarrClient,
  createQbittorrentClient,
  mapQbittorrentStatus,
} from "@tailstreamer/integrations";
import { moveImportPlan, planCompletedDownloadImport } from "@tailstreamer/media";
import { TRPCError } from "@trpc/server";
import { serializeDownloadJob, serializeSearchCandidate } from "../downloadSerialization";
import { readStringSetting } from "../settings";
import { authedProcedure, roleProcedure, router } from "../trpc";
import {
  type AddMagnetDownloadInput,
  type ProwlarrSearchInput,
  addMagnetDownloadInputParser,
  deleteDownloadJobInputParser,
  downloadJobIdInputParser,
  prowlarrSearchInputParser,
  startCandidateDownloadInputParser,
  titleCandidateListInputParser,
} from "../validation";

const prowlarrApiKeySetting = "prowlarr.apiKey";
const qbittorrentUsernameSetting = "qbittorrent.username";
const qbittorrentPasswordSetting = "qbittorrent.password";
const downloadCategory = "tailstreamer";
const reviewDownloadCategory = "tailstreamer-review";

export const downloadsRouter = router({
  prowlarrStatus: roleProcedure("ADMIN").query(async ({ ctx }) => {
    const apiKey = await resolveProwlarrApiKey(ctx.env.prowlarrApiKey);
    if (!apiKey) return { configured: false, reachable: false, version: null };
    try {
      const health = await createProwlarrClient({ baseUrl: ctx.env.prowlarrUrl, apiKey }).health();
      return { configured: true, reachable: health.ok, version: health.version };
    } catch {
      return { configured: true, reachable: false, version: null };
    }
  }),

  qbittorrentStatus: roleProcedure("ADMIN").query(async ({ ctx }) => {
    const config = await resolveQbittorrentConfig(ctx.env);
    if (!config.username || !config.password) return { configured: false, reachable: false };
    try {
      await createConfiguredQbittorrentClient(config).login();
      return { configured: true, reachable: true };
    } catch {
      return { configured: true, reachable: false };
    }
  }),

  listCandidates: authedProcedure.input(titleCandidateListInputParser).query(async ({ input }) => {
    const candidates = await prisma.searchCandidate.findMany({
      where: { titleId: input.titleId, episodeId: input.episodeId ?? null },
      orderBy: [{ trusted: "desc" }, { seeders: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return candidates.map(serializeSearchCandidate);
  }),

  searchProwlarr: roleProcedure("ADMIN", "DOWNLOADER")
    .input(prowlarrSearchInputParser)
    .mutation(async ({ ctx, input }) => {
      await assertSearchSubjectExists(input);
      const apiKey = await resolveProwlarrApiKey(ctx.env.prowlarrApiKey);
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Prowlarr API key is not configured" });

      const results = await searchProwlarr(ctx.env.prowlarrUrl, apiKey, input);
      const candidates = await Promise.all(
        results.map((result) =>
          prisma.searchCandidate.create({
            data: {
              titleId: input.titleId,
              episodeId: input.episodeId ?? null,
              source: "PROWLARR",
              name: result.name,
              magnetUri: result.magnetUri,
              sizeBytes: result.sizeBytes == null ? null : BigInt(result.sizeBytes),
              seeders: result.seeders,
              leechers: result.leechers,
              quality: result.quality,
              trusted: result.trusted,
            },
          }),
        ),
      );
      return candidates.map(serializeSearchCandidate);
    }),

  addMagnet: roleProcedure("ADMIN", "DOWNLOADER")
    .input(addMagnetDownloadInputParser)
    .mutation(async ({ ctx, input }) => {
      await assertDownloadSubjectExists(input);
      await addMagnetToQbittorrent(ctx.env, input.magnetUri, input.review ? reviewDownloadCategory : downloadCategory);
      const job = await prisma.downloadJob.create({
        data: {
          titleId: input.titleId,
          episodeId: input.episodeId ?? null,
          name: input.name,
          magnetUri: input.magnetUri,
          status: "QUEUED",
          progress: 0,
          createdByUserId: ctx.user.id,
        },
      });
      return serializeDownloadJob(job);
    }),

  startFromCandidate: roleProcedure("ADMIN", "DOWNLOADER")
    .input(startCandidateDownloadInputParser)
    .mutation(async ({ ctx, input }) => {
      const candidate = await prisma.searchCandidate.findUnique({ where: { id: input.candidateId } });
      if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      if (!candidate.magnetUri) throw new TRPCError({ code: "BAD_REQUEST", message: "Candidate has no magnet URI" });
      await addMagnetToQbittorrent(
        ctx.env,
        candidate.magnetUri,
        input.review ? reviewDownloadCategory : downloadCategory,
      );
      const job = await prisma.downloadJob.create({
        data: {
          titleId: candidate.titleId,
          episodeId: candidate.episodeId,
          name: candidate.name,
          magnetUri: candidate.magnetUri,
          status: "QUEUED",
          progress: 0,
          createdByUserId: ctx.user.id,
        },
      });
      return serializeDownloadJob(job);
    }),

  listJobs: authedProcedure.query(async () => {
    const jobs = await prisma.downloadJob.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
    return jobs.map(serializeDownloadJob);
  }),

  syncJobs: roleProcedure("ADMIN", "DOWNLOADER").mutation(async ({ ctx }) => {
    const config = await resolveQbittorrentConfig(ctx.env);
    const client = createConfiguredQbittorrentClient(config);
    const torrents = await client.listTorrents();
    const jobs = await Promise.all(
      torrents.map((torrent) =>
        prisma.downloadJob.updateMany({
          where: { clientHash: torrent.hash },
          data: {
            name: torrent.name,
            status: mapQbittorrentStatus(torrent.state, torrent.progress),
            progress: torrent.progress,
            downloadPath: torrent.contentPath ?? torrent.savePath,
          },
        }),
      ),
    );
    return { updated: jobs.reduce((total, result) => total + result.count, 0) };
  }),

  pauseJob: roleProcedure("ADMIN", "DOWNLOADER")
    .input(downloadJobIdInputParser)
    .mutation(async ({ ctx, input }) => controlQbittorrentJob(ctx.env, input.jobId, "pause")),

  resumeJob: roleProcedure("ADMIN", "DOWNLOADER")
    .input(downloadJobIdInputParser)
    .mutation(async ({ ctx, input }) => controlQbittorrentJob(ctx.env, input.jobId, "resume")),

  deleteJob: roleProcedure("ADMIN", "DOWNLOADER")
    .input(deleteDownloadJobInputParser)
    .mutation(async ({ ctx, input }) => {
      const job = await prisma.downloadJob.findUnique({ where: { id: input.jobId } });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Download job not found" });
      if (job.clientHash) {
        const client = createConfiguredQbittorrentClient(await resolveQbittorrentConfig(ctx.env));
        await mapQbittorrentError(() => client.delete(job.clientHash as string, input.deleteFiles ?? false));
      }
      await prisma.downloadJob.delete({ where: { id: job.id } });
      return true;
    }),

  importCompletedJob: roleProcedure("ADMIN", "DOWNLOADER")
    .input(downloadJobIdInputParser)
    .mutation(async ({ ctx, input }) => {
      const job = await prisma.downloadJob.findUnique({
        where: { id: input.jobId },
        include: { title: true, episode: true },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Download job not found" });
      if (!job.downloadPath) {
        await prisma.downloadJob.update({ where: { id: job.id }, data: { status: "NEEDS_REVIEW" } });
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Download job has no completed path" });
      }
      if (job.status !== "COMPLETED" && job.status !== "NEEDS_REVIEW") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Download job is not completed" });
      }

      const plan = await planCompletedDownloadImport({
        roots: {
          mediaRoot: ctx.env.mediaRoot,
          downloadIncomplete: ctx.env.downloadIncomplete,
          downloadComplete: ctx.env.downloadComplete,
        },
        downloadPath: job.downloadPath,
        subject: {
          kind: job.title.kind,
          titleName: job.title.name,
          year: job.title.year,
          seasonNumber: job.episode?.seasonNumber,
          episodeNumber: job.episode?.episodeNumber,
        },
      });

      if (!plan) {
        const updated = await prisma.downloadJob.update({
          where: { id: job.id },
          data: { status: "NEEDS_REVIEW" },
        });
        return serializeDownloadJob(updated);
      }

      await prisma.downloadJob.update({ where: { id: job.id }, data: { status: "IMPORTING" } });
      await moveImportPlan(plan);
      const asset = await prisma.localAsset.create({
        data: {
          titleId: job.titleId,
          episodeId: job.episodeId,
          relativePath: plan.relativePath,
          absolutePath: plan.destinationPath,
          sizeBytes: plan.sizeBytes,
          container: plan.container,
          scanStatus: "IMPORTED",
        },
      });
      const imported = await prisma.downloadJob.update({
        where: { id: job.id },
        data: {
          status: "IMPORTED",
          importedAssetId: asset.id,
          downloadPath: plan.destinationPath,
        },
      });
      return serializeDownloadJob(imported);
    }),
});

async function searchProwlarr(baseUrl: string, apiKey: string, input: ProwlarrSearchInput) {
  try {
    return await createProwlarrClient({ baseUrl, apiKey }).search({
      query: input.query,
      limit: input.limit ?? 50,
    });
  } catch (error) {
    if (error instanceof ProwlarrIntegrationError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
    throw error;
  }
}

async function resolveProwlarrApiKey(envApiKey: string | null) {
  return envApiKey ?? (await readStringSetting(prisma, prowlarrApiKeySetting));
}

async function resolveQbittorrentConfig(env: {
  qbittorrentUrl: string;
  qbittorrentUsername: string | null;
  qbittorrentPassword: string | null;
}) {
  return {
    baseUrl: env.qbittorrentUrl,
    username: env.qbittorrentUsername ?? (await readStringSetting(prisma, qbittorrentUsernameSetting)),
    password: env.qbittorrentPassword ?? (await readStringSetting(prisma, qbittorrentPasswordSetting)),
  };
}

async function addMagnetToQbittorrent(
  env: {
    qbittorrentUrl: string;
    qbittorrentUsername: string | null;
    qbittorrentPassword: string | null;
    downloadIncomplete: string;
  },
  magnetUri: string,
  category: string,
) {
  const config = await resolveQbittorrentConfig(env);
  const client = createConfiguredQbittorrentClient(config);
  await mapQbittorrentError(() =>
    client.addMagnet({
      magnetUri,
      category,
      savePath: env.downloadIncomplete,
    }),
  );
}

function createConfiguredQbittorrentClient(config: {
  baseUrl: string;
  username: string | null;
  password: string | null;
}) {
  if (!config.username || !config.password) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "qBittorrent credentials are not configured" });
  }
  return createQbittorrentClient({
    baseUrl: config.baseUrl,
    username: config.username,
    password: config.password,
  });
}

async function controlQbittorrentJob(
  env: { qbittorrentUrl: string; qbittorrentUsername: string | null; qbittorrentPassword: string | null },
  jobId: string,
  action: "pause" | "resume",
) {
  const job = await prisma.downloadJob.findUnique({ where: { id: jobId } });
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Download job not found" });
  if (!job.clientHash)
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Download job is not linked to qBittorrent yet" });
  const client = createConfiguredQbittorrentClient(await resolveQbittorrentConfig(env));
  await mapQbittorrentError(() =>
    action === "pause" ? client.pause(job.clientHash as string) : client.resume(job.clientHash as string),
  );
  return serializeDownloadJob(job);
}

async function mapQbittorrentError<TResult>(callback: () => Promise<TResult>) {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof QbittorrentIntegrationError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
    throw error;
  }
}

async function assertSearchSubjectExists(input: ProwlarrSearchInput) {
  return assertDownloadSubjectExists(input);
}

async function assertDownloadSubjectExists(input: { titleId: string; episodeId?: string | null }) {
  if (!input.episodeId) {
    const title = await prisma.title.findUnique({ where: { id: input.titleId }, select: { id: true } });
    if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });
    return;
  }

  const episode = await prisma.episode.findFirst({
    where: { id: input.episodeId, titleId: input.titleId },
    select: { id: true },
  });
  if (!episode) throw new TRPCError({ code: "NOT_FOUND", message: "Episode not found" });
}
