import { prisma } from "@tailstreamer/db";
import { probeMediaFile, scanMediaLibrary } from "@tailstreamer/media";
import type { ApiEnv } from "./env";
import { createPrismaMediaScanRepository } from "./mediaScanRepository";

let runningScan: Promise<Awaited<ReturnType<typeof scanMediaLibrary>>> | null = null;

export function runLibraryScan(env: Pick<ApiEnv, "mediaRoot" | "downloadIncomplete" | "downloadComplete">) {
  if (runningScan) return runningScan;
  runningScan = scanMediaLibrary({
    roots: {
      mediaRoot: env.mediaRoot,
      downloadIncomplete: env.downloadIncomplete,
      downloadComplete: env.downloadComplete,
    },
    repository: createPrismaMediaScanRepository(prisma),
    probe: probeMediaFile,
  }).finally(() => {
    runningScan = null;
  });
  return runningScan;
}

export function startAutomaticLibraryScan(env: ApiEnv) {
  if (!env.autoScanOnStart) return;
  runLibraryScan(env)
    .then((result) => {
      console.log(
        `TailStreamer media scan complete: videos=${result.scannedVideoCount} assets=${result.assetIds.length} skippedIncomplete=${result.skippedIncompleteCount}`,
      );
    })
    .catch((error) => {
      console.error("TailStreamer media scan failed", error);
    });
}
