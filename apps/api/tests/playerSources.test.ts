import { describe, expect, test } from "bun:test";
import { serializePlayableSources } from "../src/routers/player";

describe("player source serialization", () => {
  test("adds subtitle playback metadata to local sources", () => {
    const sources = serializePlayableSources({
      localAssets: [
        {
          id: "asset/1",
          container: "mkv",
          durationSeconds: 123,
          relativePath: "Movies/Arrival/Arrival.mkv",
          subtitles: [{ id: "subtitle-1", format: "srt", language: "en" }],
        },
      ],
      downloads: [],
      cloudSources: [],
    });

    expect(sources[0]).toMatchObject({
      id: "asset/1",
      subtitle: {
        format: "srt",
        id: "subtitle-1",
        language: "en",
        url: "/subtitle/asset%2F1",
      },
      type: "LOCAL",
    });
  });

  test("keeps local sources playable without subtitles", () => {
    const sources = serializePlayableSources({
      localAssets: [
        {
          id: "asset-1",
          container: "mp4",
          durationSeconds: null,
          relativePath: "Movie.mp4",
          subtitles: [],
        },
      ],
      downloads: [],
      cloudSources: [],
    });

    expect(sources[0]).toMatchObject({
      streamUrl: "/stream/local/asset-1",
      subtitle: null,
      type: "LOCAL",
    });
  });
});
