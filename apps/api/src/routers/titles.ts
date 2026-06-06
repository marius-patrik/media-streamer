import { prisma } from "@tailstreamer/db";
import { TRPCError } from "@trpc/server";
import { serializeEpisode, serializeTitleDetail, serializeTitleSummary } from "../catalogSerialization";
import { authedProcedure, roleProcedure, router } from "../trpc";
import {
  type CreateEpisodeInput,
  type OpenOrCreateTitleInput,
  type RematchTitleInput,
  createEpisodeInputParser,
  openOrCreateTitleInputParser,
  rematchTitleInputParser,
  titleIdInputParser,
  titleSearchInputParser,
} from "../validation";

const titleSummarySelect = {
  id: true,
  kind: true,
  name: true,
  year: true,
  overview: true,
  posterPath: true,
  backdropPath: true,
  createdFrom: true,
  matchStatus: true,
} as const;

const episodeOrder = [{ seasonNumber: "asc" as const }, { episodeNumber: "asc" as const }];

export const titlesRouter = router({
  search: authedProcedure.input(titleSearchInputParser).query(async ({ input }) => {
    const titles = await prisma.title.findMany({
      where: {
        kind: input.kind,
        name: input.query ? { contains: input.query, mode: "insensitive" } : undefined,
      },
      select: titleSummarySelect,
      orderBy: [{ name: "asc" }, { year: "asc" }],
      take: input.limit ?? 25,
    });
    return titles.map(serializeTitleSummary);
  }),

  openOrCreate: roleProcedure("ADMIN", "DOWNLOADER")
    .input(openOrCreateTitleInputParser)
    .mutation(async ({ input }) => serializeTitleSummary(await openOrCreateTitle(input))),

  detail: authedProcedure.input(titleIdInputParser).query(async ({ input }) => {
    const title = await prisma.title.findUnique({
      where: { id: input.titleId },
      select: {
        ...titleSummarySelect,
        episodes: { select: episodeSelect, orderBy: episodeOrder },
        externalIds: {
          select: { id: true, provider: true, value: true, episodeId: true },
          orderBy: { provider: "asc" },
        },
        localAssets: {
          select: {
            id: true,
            episodeId: true,
            relativePath: true,
            sizeBytes: true,
            container: true,
            videoCodec: true,
            audioCodec: true,
            durationSeconds: true,
            scanStatus: true,
          },
          orderBy: { importedAt: "desc" },
        },
        cloudSources: {
          select: { id: true, episodeId: true, provider: true, url: true, enabled: true },
          orderBy: { createdAt: "asc" },
        },
        downloads: {
          select: { id: true, episodeId: true, name: true, status: true, progress: true },
          orderBy: { updatedAt: "desc" },
        },
        candidates: {
          select: {
            id: true,
            episodeId: true,
            source: true,
            name: true,
            sizeBytes: true,
            seeders: true,
            leechers: true,
            quality: true,
            trusted: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });
    return serializeTitleDetail(title);
  }),

  listEpisodes: authedProcedure.input(titleIdInputParser).query(async ({ input }) => {
    const title = await prisma.title.findUnique({
      where: { id: input.titleId },
      select: { id: true, kind: true },
    });
    if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });
    if (title.kind !== "SHOW") return [];
    const episodes = await prisma.episode.findMany({
      where: { titleId: input.titleId },
      select: episodeSelect,
      orderBy: episodeOrder,
    });
    return episodes.map(serializeEpisode);
  }),

  createEpisode: roleProcedure("ADMIN", "DOWNLOADER")
    .input(createEpisodeInputParser)
    .mutation(async ({ input }) => serializeEpisode(await createEpisode(input))),

  rematch: roleProcedure("ADMIN", "DOWNLOADER")
    .input(rematchTitleInputParser)
    .mutation(async ({ input }) => serializeTitleSummary(await rematchTitle(input))),
});

const episodeSelect = {
  id: true,
  titleId: true,
  seasonNumber: true,
  episodeNumber: true,
  name: true,
  overview: true,
} as const;

export async function openOrCreateTitle(input: OpenOrCreateTitleInput) {
  if (input.externalId) {
    const existingExternal = await prisma.externalId.findUnique({
      where: { provider_value: input.externalId },
      select: { title: { select: titleSummarySelect } },
    });
    if (existingExternal) return existingExternal.title;
  }

  const existingTitle = await prisma.title.findFirst({
    where: {
      kind: input.kind,
      name: input.name,
      year: input.year ?? null,
    },
    select: titleSummarySelect,
  });
  if (existingTitle) {
    if (input.externalId) await attachTitleExternalId(existingTitle.id, input.externalId);
    return existingTitle;
  }

  return prisma.title.create({
    data: {
      kind: input.kind,
      name: input.name,
      year: input.year ?? null,
      overview: input.overview ?? null,
      posterPath: input.posterPath ?? null,
      backdropPath: input.backdropPath ?? null,
      createdFrom: input.createdFrom ?? "MANUAL",
      matchStatus: input.externalId ? "MATCHED" : "UNMATCHED",
      externalIds: input.externalId ? { create: input.externalId } : undefined,
    },
    select: titleSummarySelect,
  });
}

async function createEpisode(input: CreateEpisodeInput) {
  const title = await prisma.title.findUnique({
    where: { id: input.titleId },
    select: { id: true, kind: true },
  });
  if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });
  if (title.kind !== "SHOW") throw new TRPCError({ code: "BAD_REQUEST", message: "Episodes require a show title" });

  return prisma.episode.upsert({
    where: {
      titleId_seasonNumber_episodeNumber: {
        titleId: input.titleId,
        seasonNumber: input.seasonNumber,
        episodeNumber: input.episodeNumber,
      },
    },
    create: {
      titleId: input.titleId,
      seasonNumber: input.seasonNumber,
      episodeNumber: input.episodeNumber,
      name: input.name ?? null,
      overview: input.overview ?? null,
    },
    update: {
      name: input.name ?? null,
      overview: input.overview ?? null,
    },
    select: episodeSelect,
  });
}

export async function rematchTitle(input: RematchTitleInput) {
  const existing = await prisma.title.findUnique({ where: { id: input.titleId }, select: { id: true } });
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });

  if (input.externalId) await attachTitleExternalId(input.titleId, input.externalId);

  return prisma.title.update({
    where: { id: input.titleId },
    data: {
      matchStatus: input.matchStatus,
      name: input.name,
      year: input.year,
      overview: input.overview,
      posterPath: input.posterPath,
      backdropPath: input.backdropPath,
    },
    select: titleSummarySelect,
  });
}

async function attachTitleExternalId(
  titleId: string,
  externalId: NonNullable<OpenOrCreateTitleInput["externalId"] | RematchTitleInput["externalId"]>,
) {
  const existing = await prisma.externalId.findUnique({
    where: { provider_value: externalId },
    select: { titleId: true },
  });
  if (existing && existing.titleId !== titleId) {
    throw new TRPCError({ code: "CONFLICT", message: "External ID already belongs to another title" });
  }
  await prisma.externalId.upsert({
    where: { provider_value: externalId },
    create: { ...externalId, titleId },
    update: { episodeId: null },
  });
}
