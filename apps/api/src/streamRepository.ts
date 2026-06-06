import { prisma } from "@tailstreamer/db";
import type { StreamAssetRepository } from "./streaming";

export function createPrismaStreamAssetRepository(): StreamAssetRepository {
  return {
    findLocalAsset(assetId) {
      return prisma.localAsset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          absolutePath: true,
          relativePath: true,
          container: true,
        },
      });
    },
    findFirstSubtitleForAsset(assetId) {
      return prisma.subtitle.findFirst({
        where: { assetId },
        select: {
          id: true,
          assetId: true,
          absolutePath: true,
          relativePath: true,
          format: true,
        },
        orderBy: { relativePath: "asc" },
      });
    },
  };
}
