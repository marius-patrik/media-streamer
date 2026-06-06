import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type StreamAsset,
  type StreamAssetRepository,
  type StreamSubtitle,
  buildFfmpegRemuxArgs,
  handleLocalAssetStream,
  handleRemuxAssetStream,
  handleSubtitleStream,
  parseByteRange,
} from "../src/streaming";

describe("local asset streaming", () => {
  let root: string;
  let mediaFile: string;
  let outsideRoot: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "tailstreamer-media-"));
    outsideRoot = await mkdtemp(join(tmpdir(), "tailstreamer-outside-"));
    mediaFile = join(root, "Movie.mkv");
    await Bun.write(mediaFile, "0123456789");
    await Bun.write(join(outsideRoot, "Secret.mkv"), "hidden");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  });

  test("returns 206 for a valid byte range", async () => {
    const response = await handleLocalAssetStream({
      request: new Request("http://tailstreamer.test/stream/local/asset-1", {
        headers: { range: "bytes=2-5" },
      }),
      assetId: "asset-1",
      mediaRoot: root,
      repository: repositoryFor({
        id: "asset-1",
        absolutePath: mediaFile,
        relativePath: "Movie.mkv",
        container: "mkv",
      }),
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("content-length")).toBe("4");
    expect(await response.text()).toBe("2345");
  });

  test("returns 416 for an invalid byte range", async () => {
    const response = await handleLocalAssetStream({
      request: new Request("http://tailstreamer.test/stream/local/asset-1", {
        headers: { range: "bytes=20-30" },
      }),
      assetId: "asset-1",
      mediaRoot: root,
      repository: repositoryFor({
        id: "asset-1",
        absolutePath: mediaFile,
        relativePath: "Movie.mkv",
      }),
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
  });

  test("returns 404 for a missing asset", async () => {
    const response = await handleLocalAssetStream({
      request: new Request("http://tailstreamer.test/stream/local/missing"),
      assetId: "missing",
      mediaRoot: root,
      repository: repositoryFor(null),
    });

    expect(response.status).toBe(404);
  });

  test("returns 404 for an asset outside the media root", async () => {
    const response = await handleLocalAssetStream({
      request: new Request("http://tailstreamer.test/stream/local/asset-2"),
      assetId: "asset-2",
      mediaRoot: root,
      repository: repositoryFor({
        id: "asset-2",
        absolutePath: join(outsideRoot, "Secret.mkv"),
        relativePath: "../Secret.mkv",
      }),
    });

    expect(response.status).toBe(404);
  });
});

describe("byte range parsing", () => {
  test("supports open-ended and suffix ranges", () => {
    expect(parseByteRange("bytes=6-", 10)).toEqual({ start: 6, end: 9 });
    expect(parseByteRange("bytes=-4", 10)).toEqual({ start: 6, end: 9 });
  });

  test("rejects malformed or impossible ranges", () => {
    expect(parseByteRange("bytes=-0", 10)).toBeNull();
    expect(parseByteRange("bytes=5-2", 10)).toBeNull();
    expect(parseByteRange("items=0-1", 10)).toBeNull();
  });
});

describe("remux streaming", () => {
  let root: string;
  let mediaFile: string;
  let outsideRoot: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "tailstreamer-remux-media-"));
    outsideRoot = await mkdtemp(join(tmpdir(), "tailstreamer-remux-outside-"));
    mediaFile = join(root, "Movie.mkv");
    await Bun.write(mediaFile, "video");
    await Bun.write(join(outsideRoot, "Secret.mkv"), "hidden");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  });

  test("constructs ffmpeg remux argv without a shell command string", () => {
    const args = buildFfmpegRemuxArgs("/media/Movie.mkv");

    expect(args).toContain("-i");
    expect(args[args.indexOf("-i") + 1]).toBe("/media/Movie.mkv");
    expect(args.at(-1)).toBe("pipe:1");
    expect(args.join(" ")).not.toContain("sh -c");
  });

  test("starts a remux process for a safe stored asset", async () => {
    let capturedArgs: string[] = [];
    const response = await handleRemuxAssetStream({
      request: new Request("http://tailstreamer.test/stream/remux/asset-1"),
      assetId: "asset-1",
      mediaRoot: root,
      repository: repositoryFor({
        id: "asset-1",
        absolutePath: mediaFile,
        relativePath: "Movie.mkv",
      }),
      createProcess(args) {
        capturedArgs = args;
        return {
          stdout: streamFromText("mp4"),
          kill() {},
        };
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(capturedArgs[capturedArgs.indexOf("-i") + 1]).toBe(mediaFile);
    expect(await response.text()).toBe("mp4");
  });

  test("does not start remux for missing or unsafe assets", async () => {
    let starts = 0;
    const createProcess = () => {
      starts += 1;
      return {
        stdout: streamFromText("mp4"),
        kill() {},
      };
    };

    const missing = await handleRemuxAssetStream({
      request: new Request("http://tailstreamer.test/stream/remux/missing"),
      assetId: "missing",
      mediaRoot: root,
      repository: repositoryFor(null),
      createProcess,
    });
    const unsafe = await handleRemuxAssetStream({
      request: new Request("http://tailstreamer.test/stream/remux/asset-2"),
      assetId: "asset-2",
      mediaRoot: root,
      repository: repositoryFor({
        id: "asset-2",
        absolutePath: join(outsideRoot, "Secret.mkv"),
        relativePath: "../Secret.mkv",
      }),
      createProcess,
    });

    expect(missing.status).toBe(404);
    expect(unsafe.status).toBe(404);
    expect(starts).toBe(0);
  });
});

describe("subtitle streaming", () => {
  let root: string;
  let subtitleFile: string;
  let outsideRoot: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "tailstreamer-subtitle-media-"));
    outsideRoot = await mkdtemp(join(tmpdir(), "tailstreamer-subtitle-outside-"));
    subtitleFile = join(root, "Movie.en.srt");
    await Bun.write(subtitleFile, "1\n00:00:00,000 --> 00:00:01,000\nHello\n");
    await Bun.write(join(outsideRoot, "Secret.srt"), "hidden");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  });

  test("serves the first subtitle for an asset", async () => {
    const response = await handleSubtitleStream({
      request: new Request("http://tailstreamer.test/subtitle/asset-1"),
      assetId: "asset-1",
      mediaRoot: root,
      repository: repositoryFor(null, {
        id: "subtitle-1",
        assetId: "asset-1",
        absolutePath: subtitleFile,
        relativePath: "Movie.en.srt",
        format: "srt",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-subrip; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('inline; filename="Movie.en.srt"');
    expect(await response.text()).toContain("Hello");
  });

  test("returns 404 for missing or unsafe subtitles", async () => {
    const missing = await handleSubtitleStream({
      request: new Request("http://tailstreamer.test/subtitle/missing"),
      assetId: "missing",
      mediaRoot: root,
      repository: repositoryFor(null, null),
    });
    const unsafe = await handleSubtitleStream({
      request: new Request("http://tailstreamer.test/subtitle/asset-2"),
      assetId: "asset-2",
      mediaRoot: root,
      repository: repositoryFor(null, {
        id: "subtitle-2",
        assetId: "asset-2",
        absolutePath: join(outsideRoot, "Secret.srt"),
        relativePath: "../Secret.srt",
        format: "srt",
      }),
    });

    expect(missing.status).toBe(404);
    expect(unsafe.status).toBe(404);
  });
});

function repositoryFor(asset: StreamAsset | null, subtitle: StreamSubtitle | null = null): StreamAssetRepository {
  return {
    async findLocalAsset(assetId) {
      return asset?.id === assetId ? asset : null;
    },
    async findFirstSubtitleForAsset(assetId) {
      return subtitle?.assetId === assetId ? subtitle : null;
    },
  };
}

function streamFromText(value: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(value));
      controller.close();
    },
  });
}
