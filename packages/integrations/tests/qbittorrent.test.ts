import { describe, expect, test } from "bun:test";
import { createQbittorrentClient, mapQbittorrentStatus, normalizeTorrent } from "../src";

describe("qBittorrent client", () => {
  test("logs in and stores the session cookie", async () => {
    const calls: string[] = [];
    const client = createQbittorrentClient({
      baseUrl: "http://qbittorrent:8080",
      username: "admin",
      password: "secret",
      fetchFn: async (url) => {
        calls.push(url.pathname);
        return new Response("Ok.", { headers: { "set-cookie": "SID=abc; HttpOnly" } });
      },
    });

    await expect(client.login()).resolves.toBe("SID=abc");
    expect(calls).toEqual(["/api/v2/auth/login"]);
  });

  test("adds a magnet with category and save path", async () => {
    const requests: Array<{ path: string; body: string; cookie: string | null }> = [];
    const client = createQbittorrentClient({
      baseUrl: "http://qbittorrent:8080",
      username: "admin",
      password: "secret",
      fetchFn: async (url, init) => {
        if (url.pathname.endsWith("/auth/login")) {
          return new Response("Ok.", { headers: { "set-cookie": "SID=abc; HttpOnly" } });
        }
        requests.push({
          path: url.pathname,
          body: init?.body?.toString() ?? "",
          cookie: new Headers(init?.headers).get("cookie"),
        });
        return new Response("Ok.");
      },
    });

    await client.addMagnet({
      magnetUri: "magnet:?xt=urn:btih:abc",
      category: "tailstreamer",
      savePath: "/downloads/incomplete",
    });

    expect(requests).toEqual([
      {
        path: "/api/v2/torrents/add",
        body: "urls=magnet%3A%3Fxt%3Durn%3Abtih%3Aabc&category=tailstreamer&savepath=%2Fdownloads%2Fincomplete",
        cookie: "SID=abc",
      },
    ]);
  });

  test("lists normalized torrents", async () => {
    const client = createQbittorrentClient({
      baseUrl: "http://qbittorrent:8080",
      username: "admin",
      password: "secret",
      fetchFn: async (url) => {
        if (url.pathname.endsWith("/auth/login")) {
          return new Response("Ok.", { headers: { "set-cookie": "SID=abc; HttpOnly" } });
        }
        return Response.json([
          {
            hash: "abc",
            name: "Movie",
            state: "downloading",
            progress: 0.5,
            save_path: "/downloads/incomplete",
            content_path: "/downloads/incomplete/Movie",
            category: "tailstreamer",
          },
        ]);
      },
    });

    await expect(client.listTorrents()).resolves.toEqual([
      {
        hash: "abc",
        name: "Movie",
        state: "downloading",
        progress: 0.5,
        savePath: "/downloads/incomplete",
        contentPath: "/downloads/incomplete/Movie",
        category: "tailstreamer",
      },
    ]);
  });

  test("pauses, resumes, and deletes torrents", async () => {
    const paths: string[] = [];
    const client = createQbittorrentClient({
      baseUrl: "http://qbittorrent:8080",
      username: "admin",
      password: "secret",
      fetchFn: async (url) => {
        paths.push(url.pathname);
        if (url.pathname.endsWith("/auth/login")) {
          return new Response("Ok.", { headers: { "set-cookie": "SID=abc; HttpOnly" } });
        }
        return new Response("Ok.");
      },
    });

    await client.pause("abc");
    await client.resume("abc");
    await client.delete("abc", false);

    expect(paths).toEqual([
      "/api/v2/auth/login",
      "/api/v2/torrents/pause",
      "/api/v2/torrents/resume",
      "/api/v2/torrents/delete",
    ]);
  });

  test("maps qBittorrent statuses into TailStreamer statuses", () => {
    expect(mapQbittorrentStatus("downloading", 0.3)).toBe("DOWNLOADING");
    expect(mapQbittorrentStatus("queuedDL", 0)).toBe("QUEUED");
    expect(mapQbittorrentStatus("uploading", 1)).toBe("COMPLETED");
    expect(mapQbittorrentStatus("error", 0.1)).toBe("FAILED");
    expect(mapQbittorrentStatus("unknown", 0.1)).toBe("NEEDS_REVIEW");
  });

  test("normalizes raw torrent payloads", () => {
    expect(
      normalizeTorrent({
        hash: "abc",
        name: "Movie",
        state: "stalledDL",
        progress: Number.NaN,
      }),
    ).toEqual({
      hash: "abc",
      name: "Movie",
      state: "stalledDL",
      progress: 0,
      savePath: null,
      contentPath: null,
      category: null,
    });
  });
});
