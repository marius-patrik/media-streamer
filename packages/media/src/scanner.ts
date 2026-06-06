import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isSubtitlePath, isVideoPath } from "./extensions";
import { parseMediaName } from "./parse";
import { type MediaRootContract, assertScannableMediaPath, isInsideRoot, relativeFromRoot } from "./paths";
import { type SubtitleDescriptor, describeSubtitle } from "./subtitles";

export type ProbeResult = {
  container?: string;
  videoCodec?: string;
  audioCodec?: string;
  durationSeconds?: number;
};

export type MediaScanRepository = {
  findOrCreateTitle(input: {
    kind: "MOVIE" | "SHOW";
    name: string;
    year?: number;
    createdFrom: "LOCAL_SCAN";
    matchStatus: "UNMATCHED";
  }): Promise<{ id: string }>;
  findOrCreateEpisode(input: {
    titleId: string;
    seasonNumber: number;
    episodeNumber: number;
  }): Promise<{ id: string }>;
  upsertLocalAsset(input: {
    titleId: string;
    episodeId?: string;
    relativePath: string;
    absolutePath: string;
    sizeBytes: bigint;
    subtitles: SubtitleDescriptor[];
    container?: string;
    videoCodec?: string;
    audioCodec?: string;
    durationSeconds?: number;
  }): Promise<{ id: string }>;
};

export type ScanMediaLibraryOptions = {
  roots: MediaRootContract;
  repository: MediaScanRepository;
  probe?: (path: string) => Promise<ProbeResult>;
};

export type ScanMediaLibraryResult = {
  scannedVideoCount: number;
  skippedIncompleteCount: number;
  assetIds: string[];
};

export async function scanMediaLibrary(options: ScanMediaLibraryOptions): Promise<ScanMediaLibraryResult> {
  const files = await collectMediaFiles(options.roots);
  const assetIds: string[] = [];

  for (const file of files.videoPaths) {
    assertScannableMediaPath(options.roots, file);
    const parsed = parseMediaName(file);
    const title = await options.repository.findOrCreateTitle({
      kind: parsed.kind,
      name: parsed.name,
      year: parsed.year,
      createdFrom: "LOCAL_SCAN",
      matchStatus: "UNMATCHED",
    });
    const episode =
      parsed.kind === "SHOW"
        ? await options.repository.findOrCreateEpisode({
            titleId: title.id,
            seasonNumber: parsed.seasonNumber,
            episodeNumber: parsed.episodeNumber,
          })
        : undefined;
    const fileStat = await stat(file);
    const probe = options.probe ? await options.probe(file) : {};
    const asset = await options.repository.upsertLocalAsset({
      titleId: title.id,
      episodeId: episode?.id,
      relativePath: relativeFromRoot(options.roots.mediaRoot, file),
      absolutePath: file,
      sizeBytes: BigInt(fileStat.size),
      subtitles: subtitleSiblings(file, files.subtitlePaths).map((subtitle) =>
        describeSubtitle({
          relativePath: relativeFromRoot(options.roots.mediaRoot, subtitle),
          absolutePath: subtitle,
        }),
      ),
      ...probe,
    });
    assetIds.push(asset.id);
  }

  return {
    scannedVideoCount: files.videoPaths.length,
    skippedIncompleteCount: files.skippedIncompleteCount,
    assetIds,
  };
}

async function collectMediaFiles(roots: MediaRootContract) {
  const videoPaths: string[] = [];
  const subtitlePaths: string[] = [];
  let skippedIncompleteCount = 0;

  async function walk(directory: string) {
    if (isInsideRoot(roots.downloadIncomplete, directory)) {
      skippedIncompleteCount += 1;
      return;
    }

    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (isVideoPath(fullPath)) videoPaths.push(fullPath);
      if (isSubtitlePath(fullPath)) subtitlePaths.push(fullPath);
    }
  }

  await walk(roots.mediaRoot);
  return { videoPaths, subtitlePaths, skippedIncompleteCount };
}

function subtitleSiblings(videoPath: string, subtitlePaths: string[]) {
  const directory = dirname(videoPath);
  const videoBase = basenameWithoutExtension(videoPath);
  return subtitlePaths.filter(
    (subtitle) => dirname(subtitle) === directory && basenameWithoutExtension(subtitle).startsWith(videoBase),
  );
}

function basenameWithoutExtension(path: string) {
  const filename = path.split(/[\\/]/).at(-1) ?? path;
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(0, index) : filename;
}
