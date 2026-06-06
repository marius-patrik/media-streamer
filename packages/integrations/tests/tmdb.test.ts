import { describe, expect, test } from "bun:test";
import { TmdbIntegrationError, createTmdbClient, validateTmdbImagePath } from "../src";

describe("TMDB client", () => {
  test("normalizes movie search results", async () => {
    const client = createTmdbClient({
      apiKey: "secret",
      baseUrl: "https://tmdb.test/3",
      fetchFn: jsonFetch({
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
            overview: "Reality bends.",
            poster_path: "/matrix.jpg",
            backdrop_path: "/matrix-backdrop.jpg",
          },
        ],
      }),
    });

    await expect(client.search({ kind: "MOVIE", query: "matrix" })).resolves.toEqual([
      {
        tmdbId: 603,
        kind: "MOVIE",
        name: "The Matrix",
        year: 1999,
        overview: "Reality bends.",
        posterPath: "/matrix.jpg",
        backdropPath: "/matrix-backdrop.jpg",
      },
    ]);
  });

  test("normalizes show search results", async () => {
    const client = createTmdbClient({
      apiKey: "secret",
      fetchFn: jsonFetch({
        results: [
          {
            id: 95396,
            name: "Severance",
            first_air_date: "2022-02-17",
            overview: "Work/life split.",
            poster_path: "/severance.jpg",
            backdrop_path: null,
          },
        ],
      }),
    });

    await expect(client.search({ kind: "SHOW", query: "severance" })).resolves.toEqual([
      {
        tmdbId: 95396,
        kind: "SHOW",
        name: "Severance",
        year: 2022,
        overview: "Work/life split.",
        posterPath: "/severance.jpg",
        backdropPath: null,
      },
    ]);
  });

  test("normalizes movie and show details", async () => {
    const movie = createTmdbClient({
      apiKey: "secret",
      fetchFn: jsonFetch({
        id: 27205,
        title: "Inception",
        release_date: "2010-07-15",
        overview: "Dreams.",
        poster_path: "/inception.jpg",
        backdrop_path: "/inception-backdrop.jpg",
        runtime: 148,
        status: "Released",
      }),
    });
    const show = createTmdbClient({
      apiKey: "secret",
      fetchFn: jsonFetch({
        id: 95396,
        name: "Severance",
        first_air_date: "2022-02-17",
        overview: "Work/life split.",
        poster_path: "/severance.jpg",
        backdrop_path: "/severance-backdrop.jpg",
        episode_run_time: [50],
        status: "Returning Series",
        seasons: [{ season_number: 1, episode_count: 9, name: "Season 1", overview: "Macrodata." }],
      }),
    });

    await expect(movie.details({ kind: "MOVIE", tmdbId: 27205 })).resolves.toMatchObject({
      kind: "MOVIE",
      name: "Inception",
      runtimeMinutes: 148,
      seasons: [],
    });
    await expect(show.details({ kind: "SHOW", tmdbId: 95396 })).resolves.toMatchObject({
      kind: "SHOW",
      name: "Severance",
      episodeRuntimeMinutes: 50,
      seasons: [{ seasonNumber: 1, episodeCount: 9, name: "Season 1", overview: "Macrodata." }],
    });
  });

  test("surfaces typed remote failures", async () => {
    const client = createTmdbClient({
      apiKey: "secret",
      fetchFn: async () => new Response("bad", { status: 503 }),
    });

    await expect(client.trending({ kind: "MOVIE" })).rejects.toBeInstanceOf(TmdbIntegrationError);
  });

  test("rejects unsafe image paths", () => {
    expect(validateTmdbImagePath("/safe/path.jpg")).toBe("/safe/path.jpg");
    expect(validateTmdbImagePath("https://example.com/path.jpg")).toBeNull();
    expect(validateTmdbImagePath("/../secret.jpg")).toBeNull();
    expect(validateTmdbImagePath("/bad//path.jpg")).toBeNull();
  });
});

function jsonFetch(payload: unknown) {
  return async () => Response.json(payload);
}
