import { describe, expect, test } from "bun:test";
import {
  addMagnetDownloadInputParser,
  bootstrapInputParser,
  createEpisodeInputParser,
  createUserInputParser,
  deleteDownloadJobInputParser,
  downloadJobIdInputParser,
  loginInputParser,
  openOrCreateTitleInputParser,
  playerSubjectInputParser,
  prowlarrSearchInputParser,
  rematchTitleInputParser,
  resolveCloudSourceInputParser,
  saveLastSourceInputParser,
  saveProgressInputParser,
  startCandidateDownloadInputParser,
  titleCandidateListInputParser,
  titleSearchInputParser,
  tmdbDetailsInputParser,
  tmdbOpenTitleInputParser,
  tmdbRematchTitleInputParser,
  tmdbSearchInputParser,
  tmdbTrendingInputParser,
  updateCloudProvidersInputParser,
  updateUserRoleInputParser,
  userIdInputParser,
} from "../src/validation";

describe("auth input validation", () => {
  test("normalizes login email and trims password", () => {
    expect(loginInputParser.parse({ email: " Admin@Example.COM ", password: " password123 " })).toEqual({
      email: "admin@example.com",
      password: "password123",
    });
  });

  test("rejects malformed login input", () => {
    expect(() => loginInputParser.parse({ email: "not-email", password: "short" })).toThrow();
  });

  test("parses bootstrap input", () => {
    expect(
      bootstrapInputParser.parse({
        email: "admin@example.com",
        password: "password123",
        displayName: " Admin ",
        bootstrapSecret: " secret ",
      }),
    ).toEqual({
      email: "admin@example.com",
      password: "password123",
      displayName: "Admin",
      bootstrapSecret: "secret",
    });
  });

  test("parses create user input", () => {
    expect(
      createUserInputParser.parse({
        email: "viewer@example.com",
        password: "password123",
        displayName: " Viewer ",
        role: "VIEWER",
      }),
    ).toEqual({
      email: "viewer@example.com",
      password: "password123",
      displayName: "Viewer",
      role: "VIEWER",
    });
  });

  test("rejects invalid user roles", () => {
    expect(() => updateUserRoleInputParser.parse({ userId: "user_1", role: "OWNER" })).toThrow();
  });

  test("parses user id input", () => {
    expect(userIdInputParser.parse({ userId: " user_1 " })).toEqual({ userId: "user_1" });
  });

  test("parses player subject and progress input", () => {
    expect(playerSubjectInputParser.parse({ titleId: " title_1 ", episodeId: null })).toEqual({
      titleId: "title_1",
      episodeId: null,
    });
    expect(
      saveProgressInputParser.parse({
        titleId: "title_1",
        episodeId: "episode_1",
        progressSeconds: 12,
        durationSeconds: 120,
      }),
    ).toEqual({
      titleId: "title_1",
      episodeId: "episode_1",
      progressSeconds: 12,
      durationSeconds: 120,
    });
  });

  test("rejects invalid player source or progress input", () => {
    expect(() => saveProgressInputParser.parse({ titleId: "title_1", progressSeconds: -1 })).toThrow();
    expect(() =>
      saveLastSourceInputParser.parse({
        titleId: "title_1",
        sourceType: "REMOTE",
        sourceId: "source_1",
      }),
    ).toThrow();
  });

  test("parses catalog title inputs", () => {
    expect(titleSearchInputParser.parse({ query: " Blade Runner ", kind: "MOVIE", limit: 10 })).toEqual({
      query: "Blade Runner",
      kind: "MOVIE",
      limit: 10,
    });
    expect(
      openOrCreateTitleInputParser.parse({
        kind: "SHOW",
        name: " Severance ",
        year: 2022,
        createdFrom: "TMDB",
        externalId: { provider: "TMDB", value: " 95396 " },
      }),
    ).toEqual({
      kind: "SHOW",
      name: "Severance",
      year: 2022,
      createdFrom: "TMDB",
      externalId: { provider: "TMDB", value: "95396" },
    });
  });

  test("parses rematch and episode inputs", () => {
    expect(
      rematchTitleInputParser.parse({
        titleId: "title_1",
        matchStatus: "MATCHED",
        name: " New Name ",
      }),
    ).toEqual({
      titleId: "title_1",
      matchStatus: "MATCHED",
      name: "New Name",
    });
    expect(
      createEpisodeInputParser.parse({
        titleId: "show_1",
        seasonNumber: 1,
        episodeNumber: 2,
        name: " Episode ",
      }),
    ).toEqual({
      titleId: "show_1",
      seasonNumber: 1,
      episodeNumber: 2,
      name: "Episode",
    });
  });

  test("rejects invalid catalog title inputs", () => {
    expect(() => titleSearchInputParser.parse({ kind: "SERIES" })).toThrow();
    expect(() => openOrCreateTitleInputParser.parse({ kind: "MOVIE", name: "", year: 1400 })).toThrow();
    expect(() => rematchTitleInputParser.parse({ titleId: "title_1", matchStatus: "DONE" })).toThrow();
    expect(() => createEpisodeInputParser.parse({ titleId: "show_1", seasonNumber: -1, episodeNumber: 1 })).toThrow();
  });

  test("parses TMDB metadata inputs", () => {
    expect(tmdbSearchInputParser.parse({ kind: "MOVIE", query: " Inception ", page: 2 })).toEqual({
      kind: "MOVIE",
      query: "Inception",
      page: 2,
    });
    expect(tmdbDetailsInputParser.parse({ kind: "SHOW", tmdbId: 95396 })).toEqual({ kind: "SHOW", tmdbId: 95396 });
    expect(tmdbTrendingInputParser.parse({ kind: "MOVIE" })).toEqual({ kind: "MOVIE" });
    expect(tmdbOpenTitleInputParser.parse({ kind: "MOVIE", tmdbId: 27205 })).toEqual({
      kind: "MOVIE",
      tmdbId: 27205,
    });
    expect(tmdbRematchTitleInputParser.parse({ titleId: "title_1", kind: "SHOW", tmdbId: 95396 })).toEqual({
      titleId: "title_1",
      kind: "SHOW",
      tmdbId: 95396,
    });
  });

  test("rejects invalid TMDB metadata inputs", () => {
    expect(() => tmdbSearchInputParser.parse({ kind: "MOVIE", query: "" })).toThrow();
    expect(() => tmdbDetailsInputParser.parse({ kind: "SHOW", tmdbId: 0 })).toThrow();
    expect(() => tmdbTrendingInputParser.parse({ kind: "PERSON" })).toThrow();
  });

  test("parses cloud provider inputs", () => {
    expect(
      updateCloudProvidersInputParser.parse({
        providers: [
          {
            id: " embed ",
            name: " Embed ",
            enabled: true,
            rank: 1,
            externalProvider: "TMDB",
            movieUrlTemplate: " https://embed.test/movie/{externalId} ",
            episodeUrlTemplate: " https://embed.test/tv/{externalId}/{season}/{episode} ",
          },
        ],
      }),
    ).toEqual({
      providers: [
        {
          id: "embed",
          name: "Embed",
          enabled: true,
          rank: 1,
          externalProvider: "TMDB",
          movieUrlTemplate: "https://embed.test/movie/{externalId}",
          episodeUrlTemplate: "https://embed.test/tv/{externalId}/{season}/{episode}",
        },
      ],
    });
    expect(resolveCloudSourceInputParser.parse({ titleId: "title_1", episodeId: null, providerId: " embed " })).toEqual(
      {
        titleId: "title_1",
        episodeId: null,
        providerId: "embed",
      },
    );
  });

  test("rejects invalid cloud provider inputs", () => {
    expect(() =>
      updateCloudProvidersInputParser.parse({
        providers: [{ id: "", name: "Embed", enabled: true, rank: 0, externalProvider: "TMDB" }],
      }),
    ).toThrow();
    expect(() => resolveCloudSourceInputParser.parse({ titleId: "title_1", providerId: "" })).toThrow();
  });

  test("parses Prowlarr search inputs", () => {
    expect(
      prowlarrSearchInputParser.parse({
        titleId: " title_1 ",
        episodeId: null,
        query: " Movie 1080p ",
        limit: 25,
      }),
    ).toEqual({
      titleId: "title_1",
      episodeId: null,
      query: "Movie 1080p",
      limit: 25,
    });
    expect(titleCandidateListInputParser.parse({ titleId: "title_1", episodeId: "episode_1" })).toEqual({
      titleId: "title_1",
      episodeId: "episode_1",
    });
  });

  test("rejects invalid Prowlarr search inputs", () => {
    expect(() => prowlarrSearchInputParser.parse({ titleId: "title_1", query: "" })).toThrow();
    expect(() => prowlarrSearchInputParser.parse({ titleId: "title_1", query: "movie", limit: 0 })).toThrow();
  });

  test("parses qBittorrent download action inputs", () => {
    expect(
      addMagnetDownloadInputParser.parse({
        titleId: " title_1 ",
        episodeId: null,
        name: " Movie ",
        magnetUri: " magnet:?xt=urn:btih:abc ",
        review: true,
      }),
    ).toEqual({
      titleId: "title_1",
      episodeId: null,
      name: "Movie",
      magnetUri: "magnet:?xt=urn:btih:abc",
      review: true,
    });
    expect(startCandidateDownloadInputParser.parse({ candidateId: " candidate_1 " })).toEqual({
      candidateId: "candidate_1",
    });
    expect(downloadJobIdInputParser.parse({ jobId: " job_1 " })).toEqual({ jobId: "job_1" });
    expect(deleteDownloadJobInputParser.parse({ jobId: "job_1", deleteFiles: true })).toEqual({
      jobId: "job_1",
      deleteFiles: true,
    });
  });

  test("rejects invalid qBittorrent download action inputs", () => {
    expect(() =>
      addMagnetDownloadInputParser.parse({
        titleId: "title_1",
        name: "Movie",
        magnetUri: "https://example.com/file.torrent",
      }),
    ).toThrow();
    expect(() => startCandidateDownloadInputParser.parse({ candidateId: "" })).toThrow();
    expect(() => downloadJobIdInputParser.parse({ jobId: "" })).toThrow();
  });
});
