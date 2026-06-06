import { describe, expect, test } from "bun:test";
import { serializeTitleDetail, serializeTitleSummary } from "../src/catalogSerialization";

describe("catalog serialization", () => {
  test("serializes display-safe title summaries", () => {
    expect(
      serializeTitleSummary({
        id: "title_1",
        kind: "MOVIE",
        name: "Blade Runner",
        year: 1982,
        overview: "Replicants.",
        posterPath: "/poster.jpg",
        backdropPath: "/backdrop.jpg",
        createdFrom: "TMDB",
        matchStatus: "MATCHED",
      }),
    ).toEqual({
      id: "title_1",
      kind: "MOVIE",
      name: "Blade Runner",
      year: 1982,
      overview: "Replicants.",
      posterPath: "/poster.jpg",
      backdropPath: "/backdrop.jpg",
      createdFrom: "TMDB",
      matchStatus: "MATCHED",
    });
  });

  test("stringifies bigint sizes in title detail", () => {
    const detail = serializeTitleDetail({
      id: "title_1",
      kind: "SHOW",
      name: "Severance",
      year: 2022,
      overview: null,
      posterPath: null,
      backdropPath: null,
      createdFrom: "LOCAL_SCAN",
      matchStatus: "NEEDS_REVIEW",
      episodes: [
        {
          id: "episode_1",
          titleId: "title_1",
          seasonNumber: 1,
          episodeNumber: 1,
          name: "Good News About Hell",
          overview: null,
        },
      ],
      externalIds: [{ id: "external_1", provider: "TMDB", value: "95396", episodeId: null }],
      localAssets: [
        {
          id: "asset_1",
          episodeId: "episode_1",
          relativePath: "Severance/S01E01.mkv",
          sizeBytes: 1234567890123n,
          container: "mkv",
          videoCodec: null,
          audioCodec: null,
          durationSeconds: 3200,
          scanStatus: "IMPORTED",
        },
      ],
      cloudSources: [],
      downloads: [],
      candidates: [
        {
          id: "candidate_1",
          episodeId: null,
          source: "PROWLARR",
          name: "release",
          sizeBytes: 42n,
          seeders: 1,
          leechers: 0,
          quality: "1080p",
          trusted: true,
        },
      ],
    });

    expect(detail.localAssets[0]?.sizeBytes).toBe("1234567890123");
    expect(detail.candidates[0]?.sizeBytes).toBe("42");
    expect(detail.episodes[0]?.seasonNumber).toBe(1);
  });
});
