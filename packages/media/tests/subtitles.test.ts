import { describe, expect, test } from "bun:test";
import { describeSubtitle, inferSubtitleLanguage, subtitleMimeType } from "../src";

describe("subtitle helpers", () => {
  test("describes subtitle storage metadata", () => {
    expect(
      describeSubtitle({
        absolutePath: "/media/Movies/Arrival/Arrival.2016.en.srt",
        relativePath: "Movies/Arrival/Arrival.2016.en.srt",
      }),
    ).toEqual({
      absolutePath: "/media/Movies/Arrival/Arrival.2016.en.srt",
      format: "srt",
      language: "en",
      relativePath: "Movies/Arrival/Arrival.2016.en.srt",
    });
  });

  test("infers compact language tokens only", () => {
    expect(inferSubtitleLanguage("Movie.en.srt")).toBe("en");
    expect(inferSubtitleLanguage("Movie.pt-BR.vtt")).toBe("br");
    expect(inferSubtitleLanguage("Movie.1080p.srt")).toBeUndefined();
  });

  test("maps subtitle formats to response mime types", () => {
    expect(subtitleMimeType("srt")).toBe("application/x-subrip; charset=utf-8");
    expect(subtitleMimeType("vtt")).toBe("text/vtt; charset=utf-8");
    expect(subtitleMimeType("ass")).toBe("text/plain; charset=utf-8");
  });
});
