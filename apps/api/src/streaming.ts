import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { isInsideRoot, subtitleMimeType } from "@tailstreamer/media";

export type StreamAsset = {
  id: string;
  absolutePath: string;
  relativePath: string;
  container?: string | null;
};

export type StreamSubtitle = {
  id: string;
  assetId: string;
  absolutePath: string;
  relativePath: string;
  format: string;
};

export type StreamAssetRepository = {
  findLocalAsset(assetId: string): Promise<StreamAsset | null>;
  findFirstSubtitleForAsset(assetId: string): Promise<StreamSubtitle | null>;
};

export type LocalStreamOptions = {
  request: Request;
  assetId: string;
  mediaRoot: string;
  repository: StreamAssetRepository;
};

export type RemuxProcess = {
  stdout: ReadableStream<Uint8Array>;
  kill(): void;
};

export type RemuxProcessFactory = (args: string[]) => RemuxProcess;

export type RemuxStreamOptions = LocalStreamOptions & {
  createProcess?: RemuxProcessFactory;
};

export async function handleLocalAssetStream(options: LocalStreamOptions) {
  const asset = await options.repository.findLocalAsset(options.assetId);
  if (!asset || !isInsideRoot(options.mediaRoot, asset.absolutePath)) {
    return new Response("Asset not found", { status: 404 });
  }

  const fileStat = await stat(asset.absolutePath).catch(() => null);
  if (!fileStat?.isFile()) return new Response("Asset not found", { status: 404 });

  const size = fileStat.size;
  const mimeType = mimeTypeFor(asset);
  const rangeHeader = options.request.headers.get("range");
  const filename = basename(asset.relativePath || asset.absolutePath);
  const commonHeaders = {
    "accept-ranges": "bytes",
    "content-disposition": contentDisposition(filename),
    "content-type": mimeType,
  };

  if (!rangeHeader) {
    return new Response(Bun.file(asset.absolutePath), {
      status: 200,
      headers: { ...commonHeaders, "content-length": String(size) },
    });
  }

  const range = parseByteRange(rangeHeader, size);
  if (!range) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { ...commonHeaders, "content-range": `bytes */${size}` },
    });
  }

  const length = range.end - range.start + 1;
  return new Response(Bun.file(asset.absolutePath).slice(range.start, range.end + 1), {
    status: 206,
    headers: {
      ...commonHeaders,
      "content-length": String(length),
      "content-range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}

export async function handleRemuxAssetStream(options: RemuxStreamOptions) {
  const asset = await options.repository.findLocalAsset(options.assetId);
  if (!asset || !isInsideRoot(options.mediaRoot, asset.absolutePath)) {
    return new Response("Asset not found", { status: 404 });
  }

  const fileStat = await stat(asset.absolutePath).catch(() => null);
  if (!fileStat?.isFile()) return new Response("Asset not found", { status: 404 });

  const createProcess = options.createProcess ?? spawnFfmpegRemux;
  const process = createProcess(buildFfmpegRemuxArgs(asset.absolutePath));
  options.request.signal.addEventListener("abort", () => process.kill(), { once: true });

  return new Response(process.stdout, {
    status: 200,
    headers: {
      "accept-ranges": "none",
      "content-type": "video/mp4",
    },
  });
}

export async function handleSubtitleStream(options: LocalStreamOptions) {
  const subtitle = await options.repository.findFirstSubtitleForAsset(options.assetId);
  if (!subtitle || !isInsideRoot(options.mediaRoot, subtitle.absolutePath)) {
    return new Response("Subtitle not found", { status: 404 });
  }

  const fileStat = await stat(subtitle.absolutePath).catch(() => null);
  if (!fileStat?.isFile()) return new Response("Subtitle not found", { status: 404 });

  return new Response(Bun.file(subtitle.absolutePath), {
    status: 200,
    headers: {
      "content-disposition": contentDisposition(basename(subtitle.relativePath || subtitle.absolutePath)),
      "content-length": String(fileStat.size),
      "content-type": subtitleMimeType(subtitle.format),
    },
  });
}

export function buildFfmpegRemuxArgs(inputPath: string) {
  return [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-i",
    inputPath,
    "-map",
    "0:v:0?",
    "-map",
    "0:a:0?",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-f",
    "mp4",
    "-movflags",
    "frag_keyframe+empty_moov",
    "pipe:1",
  ];
}

export function parseByteRange(header: string, size: number) {
  if (size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    const start = Math.max(size - suffixLength, 0);
    return { start, end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
  if (start < 0 || end < start || start >= size) return null;

  return { start, end: Math.min(end, size - 1) };
}

function mimeTypeFor(asset: StreamAsset) {
  const extension = (asset.container || asset.relativePath.split(".").pop() || "").toLowerCase();
  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  if (extension === "avi") return "video/x-msvideo";
  if (extension === "mkv") return "video/x-matroska";
  return "application/octet-stream";
}

function contentDisposition(filename: string) {
  const safeName = filename.replaceAll(/["\r\n\\]/g, "_");
  return `inline; filename="${safeName}"`;
}

function spawnFfmpegRemux(args: string[]): RemuxProcess {
  const process = Bun.spawn(["ffmpeg", ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    stdout: process.stdout,
    kill() {
      process.kill("SIGTERM");
    },
  };
}
