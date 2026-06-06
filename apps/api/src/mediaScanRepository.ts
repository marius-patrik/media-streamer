import type { PrismaClient } from "@tailstreamer/db";
import type { MediaScanRepository } from "@tailstreamer/media";

export function createPrismaMediaScanRepository(prisma: PrismaClient): MediaScanRepository {
  return {
    async findOrCreateTitle(input) {
      const existing = await prisma.title.findFirst({
        where: {
          kind: input.kind,
          name: input.name,
          year: input.year ?? null,
        },
        select: { id: true },
      });
      if (existing) return existing;
      return prisma.title.create({
        data: {
          kind: input.kind,
          name: input.name,
          year: input.year,
          createdFrom: input.createdFrom,
          matchStatus: input.matchStatus,
        },
        select: { id: true },
      });
    },

    findOrCreateEpisode(input) {
      return prisma.episode.upsert({
        where: {
          titleId_seasonNumber_episodeNumber: {
            titleId: input.titleId,
            seasonNumber: input.seasonNumber,
            episodeNumber: input.episodeNumber,
          },
        },
        create: input,
        update: {},
        select: { id: true },
      });
    },

    async upsertLocalAsset(input) {
      const asset = await prisma.localAsset.upsert({
        where: { absolutePath: input.absolutePath },
        create: {
          titleId: input.titleId,
          episodeId: input.episodeId,
          relativePath: input.relativePath,
          absolutePath: input.absolutePath,
          sizeBytes: input.sizeBytes,
          container: input.container,
          videoCodec: input.videoCodec,
          audioCodec: input.audioCodec,
          durationSeconds: input.durationSeconds,
          scanStatus: "IMPORTED",
        },
        update: {
          titleId: input.titleId,
          episodeId: input.episodeId,
          relativePath: input.relativePath,
          sizeBytes: input.sizeBytes,
          container: input.container,
          videoCodec: input.videoCodec,
          audioCodec: input.audioCodec,
          durationSeconds: input.durationSeconds,
          scanStatus: "IMPORTED",
        },
        select: { id: true },
      });
      await prisma.subtitle.deleteMany({ where: { assetId: asset.id } });
      if (input.subtitles.length > 0) {
        await prisma.subtitle.createMany({
          data: input.subtitles.map((subtitle) => ({
            assetId: asset.id,
            relativePath: subtitle.relativePath,
            absolutePath: subtitle.absolutePath,
            language: subtitle.language,
            format: subtitle.format,
          })),
          skipDuplicates: true,
        });
      }
      return asset;
    },
  };
}
