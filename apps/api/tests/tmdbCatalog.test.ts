import { describe, expect, test } from "bun:test";
import { tmdbDetailToTitleData } from "../src/tmdbCatalog";

describe("TMDB catalog mapping", () => {
  test("maps TMDB details to matched title persistence data", () => {
    expect(
      tmdbDetailToTitleData({
        tmdbId: 95396,
        kind: "SHOW",
        name: "Severance",
        year: 2022,
        overview: "Work/life split.",
        posterPath: "/poster.jpg",
        backdropPath: "/backdrop.jpg",
        status: "Returning Series",
        runtimeMinutes: null,
        episodeRuntimeMinutes: 50,
        seasons: [],
      }),
    ).toEqual({
      kind: "SHOW",
      name: "Severance",
      year: 2022,
      overview: "Work/life split.",
      posterPath: "/poster.jpg",
      backdropPath: "/backdrop.jpg",
      createdFrom: "TMDB",
      matchStatus: "MATCHED",
      externalId: {
        provider: "TMDB",
        value: "95396",
      },
    });
  });
});
