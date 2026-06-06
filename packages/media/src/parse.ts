import { basename } from "node:path";
import type { TitleKind } from "@tailstreamer/domain";
import { extensionOf } from "./extensions";

export type ParsedMovieName = {
  kind: Extract<TitleKind, "MOVIE">;
  name: string;
  year?: number;
};

export type ParsedEpisodeName = {
  kind: Extract<TitleKind, "SHOW">;
  name: string;
  year?: number;
  seasonNumber: number;
  episodeNumber: number;
};

export type ParsedMediaName = ParsedMovieName | ParsedEpisodeName;

const tvPatterns = [
  /^(?<title>.+?)[ ._-]+S(?<season>\d{1,2})E(?<episode>\d{1,3})(?:\D|$)/i,
  /^(?<title>.+?)[ ._-]+(?<season>\d{1,2})x(?<episode>\d{1,3})(?:\D|$)/i,
];

const releaseNoise = new Set([
  "480p",
  "720p",
  "1080p",
  "2160p",
  "4k",
  "bluray",
  "brrip",
  "webrip",
  "web",
  "web-dl",
  "hdtv",
  "x264",
  "x265",
  "h264",
  "h265",
  "hevc",
  "aac",
  "dts",
]);

export function parseMediaName(pathOrName: string): ParsedMediaName {
  const name = stripExtension(basename(pathOrName));
  for (const pattern of tvPatterns) {
    const match = name.match(pattern);
    if (match?.groups) {
      const rawTitle = match.groups.title;
      return {
        kind: "SHOW",
        name: cleanTitle(rawTitle),
        year: extractYear(rawTitle),
        seasonNumber: Number(match.groups.season),
        episodeNumber: Number(match.groups.episode),
      };
    }
  }

  return {
    kind: "MOVIE",
    name: cleanTitle(name),
    year: extractYear(name),
  };
}

export function cleanTitle(input: string) {
  const year = extractYear(input);
  const withoutYear = year ? input.replace(new RegExp(`\\b${year}\\b|\\(${year}\\)|\\[${year}\\]`), " ") : input;
  const tokens = withoutYear
    .replace(/[._]+/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !releaseNoise.has(token.toLowerCase()));
  return tokens.join(" ").trim();
}

export function extractYear(input: string) {
  const matches = [...input.matchAll(/\b(19\d{2}|20\d{2})\b/g)];
  const match = matches.at(-1);
  return match ? Number(match[1]) : undefined;
}

function stripExtension(input: string) {
  const extension = extensionOf(input);
  return extension ? input.slice(0, -extension.length) : input;
}
