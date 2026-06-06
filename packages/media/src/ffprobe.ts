import type { ProbeResult } from "./scanner";

type SpawnResult = {
  stdout: ReadableStream<Uint8Array>;
  exited: Promise<number>;
};

export type FfprobeSpawner = (args: string[]) => SpawnResult;

export async function probeMediaFile(
  path: string,
  spawn: FfprobeSpawner = defaultFfprobeSpawner,
): Promise<ProbeResult> {
  try {
    const process = spawn(buildFfprobeArgs(path));
    const output = await new Response(process.stdout).text();
    const exitCode = await process.exited;
    if (exitCode !== 0) return {};
    return parseFfprobeOutput(output);
  } catch {
    return {};
  }
}

export function buildFfprobeArgs(path: string) {
  return ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path];
}

export function parseFfprobeOutput(output: string): ProbeResult {
  const payload = JSON.parse(output || "{}") as {
    format?: { format_name?: string; duration?: string };
    streams?: Array<{ codec_type?: string; codec_name?: string }>;
  };
  const video = payload.streams?.find((stream) => stream.codec_type === "video");
  const audio = payload.streams?.find((stream) => stream.codec_type === "audio");
  const duration = payload.format?.duration ? Number(payload.format.duration) : undefined;
  return {
    container: firstFormatName(payload.format?.format_name),
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
    durationSeconds: Number.isFinite(duration) && duration != null ? Math.round(duration) : undefined,
  };
}

function firstFormatName(value: string | undefined) {
  return value?.split(",")[0] || undefined;
}

function defaultFfprobeSpawner(args: string[]): SpawnResult {
  const process = Bun.spawn(["ffprobe", ...args], { stdout: "pipe", stderr: "pipe" });
  return { stdout: process.stdout, exited: process.exited };
}
