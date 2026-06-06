import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { isVideoPath } from "./extensions";
import { parseMediaName } from "./parse";
import { type MediaRootContract, isInsideRoot, relativeFromRoot, safeResolve } from "./paths";

export type ImportSubject = {
  titleName: string;
  kind: "MOVIE" | "SHOW";
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

export type ImportPlan = {
  sourcePath: string;
  destinationPath: string;
  relativePath: string;
  sizeBytes: bigint;
  container?: string;
};

export type ImportPlanOptions = {
  roots: MediaRootContract;
  downloadPath: string;
  subject: ImportSubject;
};

const junkPatterns = [/\bsample\b/i, /\btrailer\b/i, /\bproof\b/i, /\bextras?\b/i];

export async function planCompletedDownloadImport(options: ImportPlanOptions): Promise<ImportPlan | null> {
  const downloadPath = safeResolve(
    options.roots.downloadComplete,
    relativeFromRoot(options.roots.downloadComplete, options.downloadPath),
  );
  if (!isInsideRoot(options.roots.downloadComplete, downloadPath))
    throw new Error("Import source must be under completed downloads");

  const videos = await collectImportVideos(downloadPath);
  const selected = videos
    .filter((video) => !isJunkVideo(video.path, video.sizeBytes))
    .sort((left, right) => Number(right.sizeBytes - left.sizeBytes))[0];
  if (!selected) return null;

  const relativePath = normalizedMediaPath(options.subject, selected.path);
  const destinationPath = safeResolve(options.roots.mediaRoot, relativePath);
  return {
    sourcePath: selected.path,
    destinationPath,
    relativePath,
    sizeBytes: selected.sizeBytes,
    container: extensionWithoutDot(selected.path),
  };
}

export async function moveImportPlan(plan: ImportPlan) {
  await mkdir(dirname(plan.destinationPath), { recursive: true });
  await rename(plan.sourcePath, plan.destinationPath);
}

async function collectImportVideos(path: string) {
  const pathStat = await stat(path);
  if (pathStat.isFile()) {
    return isVideoPath(path) ? [{ path, sizeBytes: BigInt(pathStat.size) }] : [];
  }

  const videos: Array<{ path: string; sizeBytes: bigint }> = [];
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !isVideoPath(fullPath)) continue;
      const fileStat = await stat(fullPath);
      videos.push({ path: fullPath, sizeBytes: BigInt(fileStat.size) });
    }
  }
  await walk(path);
  return videos;
}

function normalizedMediaPath(subject: ImportSubject, sourcePath: string) {
  const extension = extensionWithDot(sourcePath);
  const year = subject.year ? ` (${subject.year})` : "";
  const titleDir = sanitizeSegment(`${subject.titleName}${year}`);
  if (subject.kind === "SHOW" && subject.seasonNumber != null && subject.episodeNumber != null) {
    const season = `Season ${String(subject.seasonNumber).padStart(2, "0")}`;
    const filename = `${sanitizeSegment(subject.titleName)} - S${String(subject.seasonNumber).padStart(2, "0")}E${String(subject.episodeNumber).padStart(2, "0")}${extension}`;
    return join(titleDir, season, filename);
  }

  const parsed = parseMediaName(sourcePath);
  const name = sanitizeSegment(subject.titleName || parsed.name);
  return join(titleDir, `${name}${year}${extension}`);
}

function isJunkVideo(path: string, sizeBytes: bigint) {
  const filename = basename(path);
  if (junkPatterns.some((pattern) => pattern.test(filename))) return true;
  return sizeBytes < 50n * 1024n * 1024n;
}

function sanitizeSegment(input: string) {
  return input
    .split("")
    .map((character) => (isUnsafePathCharacter(character) ? " " : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function isUnsafePathCharacter(character: string) {
  return character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character);
}

function extensionWithDot(path: string) {
  const index = basename(path).lastIndexOf(".");
  return index >= 0 ? basename(path).slice(index).toLowerCase() : "";
}

function extensionWithoutDot(path: string) {
  const extension = extensionWithDot(path);
  return extension.startsWith(".") ? extension.slice(1) : extension;
}
