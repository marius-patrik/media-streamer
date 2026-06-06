import { describe, expect, test } from "bun:test";
import { assertScannableMediaPath, isInsideRoot, relativeFromRoot, safeResolve } from "../src";

describe("media path safety", () => {
  test("resolves paths under the configured root", () => {
    expect(safeResolve("/media", "Movies", "Alien.mkv")).toBe("/media/Movies/Alien.mkv");
    expect(relativeFromRoot("/media", "/media/Movies/Alien.mkv")).toBe("Movies/Alien.mkv");
  });

  test("rejects traversal outside the root", () => {
    expect(() => safeResolve("/media", "../secrets.env")).toThrow("Path escapes configured root");
    expect(() => relativeFromRoot("/media", "/downloads/complete/movie.mkv")).toThrow("Path escapes configured root");
  });

  test("checks root containment without sibling prefix confusion", () => {
    expect(isInsideRoot("/mnt/HDD1/media", "/mnt/HDD1/media/movie.mkv")).toBe(true);
    expect(isInsideRoot("/mnt/HDD1/media", "/mnt/HDD1/media-streamer/postgres")).toBe(false);
  });

  test("blocks incomplete downloads from scanner paths", () => {
    const roots = {
      mediaRoot: "/mnt/HDD1",
      downloadIncomplete: "/mnt/HDD1/downloads/incomplete",
      downloadComplete: "/mnt/HDD1/downloads/complete",
    };
    expect(() => assertScannableMediaPath(roots, "/mnt/HDD1/downloads/incomplete/file.mkv")).toThrow(
      "Incomplete downloads are not scannable",
    );
  });
});
