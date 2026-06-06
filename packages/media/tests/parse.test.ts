import { describe, expect, test } from "bun:test";
import { isSubtitlePath, isVideoPath, parseMediaName } from "../src";

describe("media name parsing", () => {
  test("parses movie names with years and release tokens", () => {
    expect(parseMediaName("Blade.Runner.2049.2017.1080p.BluRay.x265.mkv")).toEqual({
      kind: "MOVIE",
      name: "Blade Runner 2049",
      year: 2017,
    });
  });

  test("parses TV SxxEyy names", () => {
    expect(parseMediaName("The.Last.of.Us.S01E02.Infected.1080p.WEB.mkv")).toEqual({
      kind: "SHOW",
      name: "The Last of Us",
      seasonNumber: 1,
      episodeNumber: 2,
    });
  });

  test("parses TV 1x02 names", () => {
    expect(parseMediaName("Severance.2x03.Who.Is.Alive.mkv")).toEqual({
      kind: "SHOW",
      name: "Severance",
      seasonNumber: 2,
      episodeNumber: 3,
    });
  });

  test("detects video and subtitle extensions case-insensitively", () => {
    expect(isVideoPath("Movie.MKV")).toBe(true);
    expect(isSubtitlePath("Movie.EN.vtt")).toBe(true);
    expect(isVideoPath("poster.jpg")).toBe(false);
  });
});
