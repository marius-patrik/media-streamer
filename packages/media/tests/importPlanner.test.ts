import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moveImportPlan, planCompletedDownloadImport } from "../src";

describe("completed download import planner", () => {
  let root: string;
  let mediaRoot: string;
  let incompleteRoot: string;
  let completeRoot: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "tailstreamer-import-"));
    mediaRoot = join(root, "media");
    incompleteRoot = join(root, "downloads", "incomplete");
    completeRoot = join(root, "downloads", "complete");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test("chooses the largest relevant video and normalizes a movie destination", async () => {
    const download = join(completeRoot, "Movie.Release");
    await Bun.write(join(download, "sample.mkv"), bytes(60 * 1024 * 1024));
    await Bun.write(join(download, "Movie.2024.1080p.mkv"), bytes(55 * 1024 * 1024));
    await Bun.write(join(download, "Movie.2024.2160p.mkv"), bytes(70 * 1024 * 1024));

    const plan = await planCompletedDownloadImport({
      roots: roots(),
      downloadPath: download,
      subject: { kind: "MOVIE", titleName: "Movie", year: 2024 },
    });

    expect(plan?.sourcePath).toBe(join(download, "Movie.2024.2160p.mkv"));
    expect(plan?.relativePath).toBe("Movie (2024)/Movie (2024).mkv");
    expect(plan?.destinationPath).toBe(join(mediaRoot, "Movie (2024)", "Movie (2024).mkv"));
    expect(plan?.sizeBytes).toBe(70n * 1024n * 1024n);
  });

  test("creates show season episode destinations", async () => {
    const download = join(completeRoot, "Show.S01E02");
    await Bun.write(join(download, "Show.S01E02.mkv"), bytes(100 * 1024 * 1024));

    const plan = await planCompletedDownloadImport({
      roots: roots(),
      downloadPath: download,
      subject: { kind: "SHOW", titleName: "Show", seasonNumber: 1, episodeNumber: 2 },
    });

    expect(plan?.relativePath).toBe("Show/Season 01/Show - S01E02.mkv");
  });

  test("returns null when only junk videos are present", async () => {
    const download = join(completeRoot, "Movie.Release");
    await Bun.write(join(download, "sample.mkv"), bytes(60 * 1024 * 1024));
    await Bun.write(join(download, "tiny.mkv"), bytes(10 * 1024 * 1024));

    await expect(
      planCompletedDownloadImport({
        roots: roots(),
        downloadPath: download,
        subject: { kind: "MOVIE", titleName: "Movie" },
      }),
    ).resolves.toBeNull();
  });

  test("rejects imports outside completed downloads", async () => {
    const outside = join(root, "elsewhere", "Movie.mkv");
    await Bun.write(outside, bytes(60 * 1024 * 1024));

    await expect(
      planCompletedDownloadImport({
        roots: roots(),
        downloadPath: outside,
        subject: { kind: "MOVIE", titleName: "Movie" },
      }),
    ).rejects.toThrow("Path escapes configured root");
  });

  test("moves the selected import into media", async () => {
    const download = join(completeRoot, "Movie.Release");
    const source = join(download, "Movie.mkv");
    await Bun.write(source, bytes(60 * 1024 * 1024));
    const plan = await planCompletedDownloadImport({
      roots: roots(),
      downloadPath: download,
      subject: { kind: "MOVIE", titleName: "Movie" },
    });

    if (!plan) throw new Error("expected import plan");
    await moveImportPlan(plan);

    expect(existsSync(source)).toBe(false);
    expect(existsSync(plan.destinationPath)).toBe(true);
  });

  function roots() {
    return { mediaRoot, downloadIncomplete: incompleteRoot, downloadComplete: completeRoot };
  }
});

function bytes(size: number) {
  return new Uint8Array(size);
}
