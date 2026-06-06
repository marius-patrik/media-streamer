import { describe, expect, test } from "bun:test";
import { serializeDownloadJob, serializeSearchCandidate } from "../src/downloadSerialization";

describe("download serialization", () => {
  test("serializes search candidate sizes as strings", () => {
    expect(
      serializeSearchCandidate({
        id: "candidate_1",
        titleId: "title_1",
        episodeId: null,
        source: "PROWLARR",
        name: "Movie.1080p",
        magnetUri: "magnet:?xt=urn:btih:abc",
        sizeBytes: 1234567890123n,
        seeders: 10,
        leechers: 2,
        quality: "1080P",
        trusted: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toEqual({
      id: "candidate_1",
      titleId: "title_1",
      episodeId: null,
      source: "PROWLARR",
      name: "Movie.1080p",
      magnetUri: "magnet:?xt=urn:btih:abc",
      sizeBytes: "1234567890123",
      seeders: 10,
      leechers: 2,
      quality: "1080P",
      trusted: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  test("serializes download jobs", () => {
    expect(
      serializeDownloadJob({
        id: "job_1",
        titleId: "title_1",
        episodeId: null,
        client: "QBITTORRENT",
        clientHash: "abc",
        name: "Movie",
        magnetUri: "magnet:?xt=urn:btih:abc",
        status: "DOWNLOADING",
        progress: 0.5,
        downloadPath: "/downloads/incomplete/Movie",
        importedAssetId: null,
        createdByUserId: "user_1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:01:00.000Z"),
      }),
    ).toEqual({
      id: "job_1",
      titleId: "title_1",
      episodeId: null,
      client: "QBITTORRENT",
      clientHash: "abc",
      name: "Movie",
      magnetUri: "magnet:?xt=urn:btih:abc",
      status: "DOWNLOADING",
      progress: 0.5,
      downloadPath: "/downloads/incomplete/Movie",
      importedAssetId: null,
      createdByUserId: "user_1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:01:00.000Z",
    });
  });
});
