import { describe, expect, test } from "bun:test";
import { ProwlarrIntegrationError, createProwlarrClient, normalizeProwlarrResult } from "../src";

describe("Prowlarr client", () => {
  test("normalizes search results", () => {
    expect(
      normalizeProwlarrResult({
        title: "Movie.2024.1080p.WEB-DL",
        downloadUrl: "magnet:?xt=urn:btih:abc",
        size: 1234,
        seeders: 12,
        leechers: 2,
        indexer: "Indexer",
      }),
    ).toEqual({
      name: "Movie.2024.1080p.WEB-DL",
      magnetUri: "magnet:?xt=urn:btih:abc",
      torrentUrl: "magnet:?xt=urn:btih:abc",
      sizeBytes: 1234,
      seeders: 12,
      leechers: 2,
      quality: "1080P",
      trusted: true,
      indexer: "Indexer",
    });
  });

  test("search calls the Prowlarr API and limits normalized results", async () => {
    const requested: string[] = [];
    const client = createProwlarrClient({
      baseUrl: "http://prowlarr:9696",
      apiKey: "secret",
      fetchFn: async (url) => {
        requested.push(url.toString());
        return Response.json([
          { title: "A.2160p", magnetUrl: "magnet:?xt=urn:btih:a", seeders: 1 },
          { title: "B.720p", magnetUrl: "magnet:?xt=urn:btih:b", seeders: 1 },
        ]);
      },
    });

    const results = await client.search({ query: "movie", limit: 1 });

    expect(requested[0]).toContain("/api/v1/search");
    expect(requested[0]).toContain("apikey=secret");
    expect(requested[0]).toContain("query=movie");
    expect(results.map((result) => result.name)).toEqual(["A.2160p"]);
  });

  test("health returns configured status payload", async () => {
    const client = createProwlarrClient({
      baseUrl: "http://prowlarr:9696",
      apiKey: "secret",
      fetchFn: async () => Response.json({ version: "1.2.3" }),
    });

    await expect(client.health()).resolves.toEqual({ ok: true, version: "1.2.3" });
  });

  test("surfaces typed remote failures", async () => {
    const client = createProwlarrClient({
      baseUrl: "http://prowlarr:9696",
      apiKey: "secret",
      fetchFn: async () => new Response("nope", { status: 500 }),
    });

    await expect(client.search({ query: "movie" })).rejects.toBeInstanceOf(ProwlarrIntegrationError);
  });
});
