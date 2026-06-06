import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type MediaScanRepository, scanMediaLibrary } from "../src";

describe("media scanner", () => {
  test("creates provisional movie and show assets from a fixture library", async () => {
    const root = await mkdtemp(join(tmpdir(), "tailstreamer-scan-"));
    await mkdir(join(root, "Movies", "Arrival"), { recursive: true });
    await mkdir(join(root, "TV", "Severance", "Season 01"), { recursive: true });
    await writeFile(join(root, "Movies", "Arrival", "Arrival.2016.1080p.mkv"), "movie");
    await writeFile(join(root, "Movies", "Arrival", "Arrival.2016.1080p.en.srt"), "subtitle");
    await writeFile(join(root, "TV", "Severance", "Season 01", "Severance.S01E02.mkv"), "episode");

    const repo = new MemoryScanRepository();
    const result = await scanMediaLibrary({
      roots: {
        mediaRoot: root,
        downloadIncomplete: join(root, "downloads", "incomplete"),
        downloadComplete: join(root, "downloads", "complete"),
      },
      repository: repo,
      probe: async () => ({ durationSeconds: 123, container: "matroska", videoCodec: "h264", audioCodec: "aac" }),
    });

    expect(result.scannedVideoCount).toBe(2);
    expect(repo.titles.map((title) => `${title.kind}:${title.name}:${title.year ?? ""}`).sort()).toEqual([
      "MOVIE:Arrival:2016",
      "SHOW:Severance:",
    ]);
    const severance = repo.titles.find((title) => title.name === "Severance");
    if (!severance) throw new Error("Expected Severance title");
    expect(repo.episodes).toEqual([{ id: "episode-1", titleId: severance.id, seasonNumber: 1, episodeNumber: 2 }]);
    expect(repo.assets).toHaveLength(2);
    expect(repo.assets.find((asset) => asset.relativePath.endsWith("Arrival.2016.1080p.mkv"))?.subtitles).toEqual([
      {
        absolutePath: join(root, "Movies", "Arrival", "Arrival.2016.1080p.en.srt"),
        format: "srt",
        language: "en",
        relativePath: "Movies/Arrival/Arrival.2016.1080p.en.srt",
      },
    ]);
  });

  test("skips incomplete downloads inside the scanned root", async () => {
    const root = await mkdtemp(join(tmpdir(), "tailstreamer-scan-"));
    await mkdir(join(root, "downloads", "incomplete"), { recursive: true });
    await writeFile(join(root, "downloads", "incomplete", "Half.Done.S01E01.mkv"), "partial");

    const result = await scanMediaLibrary({
      roots: {
        mediaRoot: root,
        downloadIncomplete: join(root, "downloads", "incomplete"),
        downloadComplete: join(root, "downloads", "complete"),
      },
      repository: new MemoryScanRepository(),
    });

    expect(result.scannedVideoCount).toBe(0);
    expect(result.skippedIncompleteCount).toBe(1);
  });
});

class MemoryScanRepository implements MediaScanRepository {
  titles: Array<{ id: string; kind: "MOVIE" | "SHOW"; name: string; year?: number }> = [];
  episodes: Array<{ id: string; titleId: string; seasonNumber: number; episodeNumber: number }> = [];
  assets: Array<{
    id: string;
    titleId: string;
    episodeId?: string;
    relativePath: string;
    absolutePath: string;
    sizeBytes: bigint;
    subtitles: Array<{ relativePath: string; absolutePath: string; language?: string; format: string }>;
  }> = [];

  async findOrCreateTitle(input: { kind: "MOVIE" | "SHOW"; name: string; year?: number }) {
    const existing = this.titles.find(
      (title) => title.kind === input.kind && title.name === input.name && title.year === input.year,
    );
    if (existing) return existing;
    const title = { id: `title-${this.titles.length + 1}`, kind: input.kind, name: input.name, year: input.year };
    this.titles.push(title);
    return title;
  }

  async findOrCreateEpisode(input: { titleId: string; seasonNumber: number; episodeNumber: number }) {
    const existing = this.episodes.find(
      (episode) =>
        episode.titleId === input.titleId &&
        episode.seasonNumber === input.seasonNumber &&
        episode.episodeNumber === input.episodeNumber,
    );
    if (existing) return existing;
    const episode = { id: `episode-${this.episodes.length + 1}`, ...input };
    this.episodes.push(episode);
    return episode;
  }

  async upsertLocalAsset(input: {
    titleId: string;
    episodeId?: string;
    relativePath: string;
    absolutePath: string;
    sizeBytes: bigint;
    subtitles: Array<{ relativePath: string; absolutePath: string; language?: string; format: string }>;
  }) {
    const existing = this.assets.find((asset) => asset.absolutePath === input.absolutePath);
    if (existing) return existing;
    const asset = { id: `asset-${this.assets.length + 1}`, ...input };
    this.assets.push(asset);
    return asset;
  }
}
