import { describe, expect, test } from "bun:test";
import { buildFfprobeArgs, parseFfprobeOutput, probeMediaFile } from "../src";

describe("ffprobe helpers", () => {
  test("constructs ffprobe argv without a shell command string", () => {
    const args = buildFfprobeArgs("/media/Movie.mkv");

    expect(args).toContain("-show_format");
    expect(args).toContain("-show_streams");
    expect(args.at(-1)).toBe("/media/Movie.mkv");
    expect(args.join(" ")).not.toContain("sh -c");
  });

  test("normalizes format, stream codecs, and duration", () => {
    expect(
      parseFfprobeOutput(
        JSON.stringify({
          format: { format_name: "matroska,webm", duration: "122.6" },
          streams: [
            { codec_type: "video", codec_name: "h264" },
            { codec_type: "audio", codec_name: "aac" },
          ],
        }),
      ),
    ).toEqual({
      audioCodec: "aac",
      container: "matroska",
      durationSeconds: 123,
      videoCodec: "h264",
    });
  });

  test("returns empty metadata on ffprobe failure", async () => {
    const result = await probeMediaFile("/media/bad.mkv", () => ({
      exited: Promise.resolve(1),
      stdout: streamFromText("{}"),
    }));

    expect(result).toEqual({});
  });
});

function streamFromText(value: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(value));
      controller.close();
    },
  });
}
