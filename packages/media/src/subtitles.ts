import { basename } from "node:path";
import { extensionOf } from "./extensions";

export type SubtitleDescriptor = {
  relativePath: string;
  absolutePath: string;
  language?: string;
  format: string;
};

export function describeSubtitle(input: { relativePath: string; absolutePath: string }): SubtitleDescriptor {
  return {
    ...input,
    language: inferSubtitleLanguage(input.relativePath),
    format: extensionOf(input.relativePath).replace(/^\./, "") || "unknown",
  };
}

export function inferSubtitleLanguage(path: string) {
  const name = basename(path).replace(/\.[^.]+$/, "");
  const tokens = name.split(/[._ -]+/).filter(Boolean);
  const candidate = tokens.at(-1)?.toLowerCase();
  if (!candidate || candidate.length < 2 || candidate.length > 3) return undefined;
  if (/^\d+$/.test(candidate)) return undefined;
  return candidate;
}

export function subtitleMimeType(format: string) {
  if (format === "vtt") return "text/vtt; charset=utf-8";
  if (format === "srt") return "application/x-subrip; charset=utf-8";
  return "text/plain; charset=utf-8";
}
