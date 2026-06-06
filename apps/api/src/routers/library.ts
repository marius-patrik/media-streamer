import { prisma } from "@tailstreamer/db";
import { probeMediaFile, scanMediaLibrary } from "@tailstreamer/media";
import { createPrismaMediaScanRepository } from "../mediaScanRepository";
import { roleProcedure, router } from "../trpc";

export const libraryRouter = router({
  scan: roleProcedure("ADMIN").mutation(({ ctx }) =>
    scanMediaLibrary({
      roots: {
        mediaRoot: ctx.env.mediaRoot,
        downloadIncomplete: ctx.env.downloadIncomplete,
        downloadComplete: ctx.env.downloadComplete,
      },
      repository: createPrismaMediaScanRepository(prisma),
      probe: probeMediaFile,
    }),
  ),
});
