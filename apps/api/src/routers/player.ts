import { type DownloadStatus, prisma } from "@tailstreamer/db";
import { type LastSource, type RankedSource, rankSources } from "@tailstreamer/media";
import { TRPCError } from "@trpc/server";
import { authedProcedure, router } from "../trpc";
import {
  type PlayerSubjectInput,
  type SaveLastSourceInput,
  type SaveProgressInput,
  playerSubjectInputParser,
  saveLastSourceInputParser,
  saveProgressInputParser,
} from "../validation";

const playableDownloadStatuses: DownloadStatus[] = ["COMPLETED", "IMPORTED"];

type LocalSourceRow = {
  id: string;
  relativePath: string;
  durationSeconds: number | null;
  container: string | null;
  subtitles: Array<{
    id: string;
    language: string | null;
    format: string;
  }>;
};

type DownloadSourceRow = {
  id: string;
  name: string;
  progress: number;
  status: string;
};

type CloudSourceRow = {
  id: string;
  provider: string;
  url: string;
};

export const playerRouter = router({
  getPlayableSources: authedProcedure.input(playerSubjectInputParser).query(async ({ ctx, input }) => {
    await assertSubjectExists(input);
    const subjectKey = subjectKeyFor(input);
    const episodeId = normalizeEpisodeId(input);
    const state = await prisma.userTitleState.findUnique({
      where: { userId_subjectKey: { userId: ctx.user.id, subjectKey } },
      select: {
        progressSeconds: true,
        durationSeconds: true,
        lastSourceType: true,
        lastSourceId: true,
      },
    });

    const [localAssets, downloads, cloudSources] = await Promise.all([
      prisma.localAsset.findMany({
        where: { titleId: input.titleId, episodeId, scanStatus: "IMPORTED" },
        select: {
          id: true,
          relativePath: true,
          durationSeconds: true,
          container: true,
          subtitles: {
            select: { id: true, language: true, format: true },
            orderBy: { relativePath: "asc" },
            take: 1,
          },
        },
        orderBy: { importedAt: "desc" },
      }),
      prisma.downloadJob.findMany({
        where: {
          titleId: input.titleId,
          episodeId,
          status: { in: playableDownloadStatuses },
          downloadPath: { not: null },
        },
        select: { id: true, name: true, progress: true, status: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.cloudSource.findMany({
        where: { titleId: input.titleId, episodeId, enabled: true },
        select: { id: true, provider: true, url: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const sources = serializePlayableSources({
      cloudSources,
      downloads,
      localAssets,
    });

    return {
      subjectKey,
      progress: {
        progressSeconds: state?.progressSeconds ?? 0,
        durationSeconds: state?.durationSeconds ?? null,
      },
      lastSource: lastSourceFromState(state),
      sources: rankSources(sources, lastSourceFromState(state)),
    };
  }),

  saveProgress: authedProcedure.input(saveProgressInputParser).mutation(async ({ ctx, input }) => {
    await assertSubjectExists(input);
    const subjectKey = subjectKeyFor(input);
    return prisma.userTitleState.upsert({
      where: { userId_subjectKey: { userId: ctx.user.id, subjectKey } },
      create: {
        userId: ctx.user.id,
        titleId: input.titleId,
        episodeId: normalizeEpisodeId(input),
        subjectKey,
        progressSeconds: input.progressSeconds,
        durationSeconds: input.durationSeconds ?? null,
      },
      update: {
        progressSeconds: input.progressSeconds,
        durationSeconds: input.durationSeconds ?? null,
      },
      select: {
        subjectKey: true,
        progressSeconds: true,
        durationSeconds: true,
      },
    });
  }),

  saveLastSource: authedProcedure.input(saveLastSourceInputParser).mutation(async ({ ctx, input }) => {
    await assertSubjectExists(input);
    const subjectKey = subjectKeyFor(input);
    await assertSourceExists(input);
    return prisma.userTitleState.upsert({
      where: { userId_subjectKey: { userId: ctx.user.id, subjectKey } },
      create: {
        userId: ctx.user.id,
        titleId: input.titleId,
        episodeId: normalizeEpisodeId(input),
        subjectKey,
        lastSourceType: input.sourceType,
        lastSourceId: input.sourceId,
      },
      update: {
        lastSourceType: input.sourceType,
        lastSourceId: input.sourceId,
      },
      select: {
        subjectKey: true,
        lastSourceType: true,
        lastSourceId: true,
      },
    });
  }),
});

export function serializePlayableSources(input: {
  localAssets: LocalSourceRow[];
  downloads: DownloadSourceRow[];
  cloudSources: CloudSourceRow[];
}) {
  return [
    ...input.localAssets.map((asset) => {
      const subtitle = asset.subtitles[0];
      return {
        type: "LOCAL" as const,
        id: asset.id,
        label: asset.relativePath,
        streamUrl: `/stream/local/${encodeURIComponent(asset.id)}`,
        remuxUrl: `/stream/remux/${encodeURIComponent(asset.id)}`,
        subtitle: subtitle
          ? {
              id: subtitle.id,
              language: subtitle.language,
              format: subtitle.format,
              url: `/subtitle/${encodeURIComponent(asset.id)}`,
            }
          : null,
        durationSeconds: asset.durationSeconds,
        container: asset.container,
      };
    }),
    ...input.downloads.map((job) => ({
      type: "DOWNLOAD" as const,
      id: job.id,
      label: job.name,
      status: job.status,
      progress: job.progress,
    })),
    ...input.cloudSources.map((source, index) => ({
      type: "CLOUD" as const,
      id: source.id,
      label: source.provider,
      provider: source.provider,
      url: source.url,
      rank: index,
    })),
  ];
}

function normalizeEpisodeId(input: PlayerSubjectInput) {
  return input.episodeId ?? null;
}

function subjectKeyFor(input: PlayerSubjectInput) {
  return input.episodeId ? `episode:${input.episodeId}` : `title:${input.titleId}`;
}

async function assertSubjectExists(input: PlayerSubjectInput) {
  if (input.episodeId) {
    const episode = await prisma.episode.findFirst({ where: { id: input.episodeId, titleId: input.titleId } });
    if (!episode) throw new TRPCError({ code: "NOT_FOUND", message: "Episode not found" });
    return;
  }

  const title = await prisma.title.findUnique({ where: { id: input.titleId } });
  if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });
}

async function assertSourceExists(input: SaveLastSourceInput) {
  const episodeId = normalizeEpisodeId(input);
  const where = { titleId: input.titleId, episodeId, id: input.sourceId };
  const source =
    input.sourceType === "LOCAL"
      ? await prisma.localAsset.findFirst({ where })
      : input.sourceType === "DOWNLOAD"
        ? await prisma.downloadJob.findFirst({ where })
        : await prisma.cloudSource.findFirst({ where });
  if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
}

function lastSourceFromState(state: { lastSourceType: string | null; lastSourceId: string | null } | null): LastSource {
  return {
    type: state?.lastSourceType as RankedSource["type"] | null | undefined,
    id: state?.lastSourceId,
  };
}
