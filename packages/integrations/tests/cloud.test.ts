import { describe, expect, test } from "bun:test";
import { CloudTemplateError, renderCloudProviderUrl, validateCloudProviderTemplate } from "../src";

const provider = {
  id: "embed",
  name: "Embed",
  enabled: true,
  rank: 0,
  externalProvider: "TMDB" as const,
  movieUrlTemplate: "https://embed.test/movie/{externalId}",
  episodeUrlTemplate: "https://embed.test/tv/{externalId}/{season}/{episode}",
};

describe("cloud provider templates", () => {
  test("renders movie URLs from external IDs", () => {
    expect(renderCloudProviderUrl(provider, { externalId: "603" })).toBe("https://embed.test/movie/603");
  });

  test("renders episode URLs from external IDs, season, and episode", () => {
    expect(renderCloudProviderUrl(provider, { externalId: "95396", season: 1, episode: 2 })).toBe(
      "https://embed.test/tv/95396/1/2",
    );
  });

  test("validates URL templates", () => {
    expect(validateCloudProviderTemplate(provider)).toBe(provider);
    expect(() => validateCloudProviderTemplate({ ...provider, movieUrlTemplate: "javascript:{externalId}" })).toThrow(
      CloudTemplateError,
    );
  });

  test("rejects unsupported placeholders and missing episode values", () => {
    expect(() =>
      renderCloudProviderUrl({ ...provider, movieUrlTemplate: "https://embed.test/{imdbId}" }, { externalId: "1" }),
    ).toThrow(CloudTemplateError);
    expect(() => renderCloudProviderUrl(provider, { externalId: "95396", season: 1 })).toThrow(CloudTemplateError);
  });
});
