export const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".webm"] as const;
export const subtitleExtensions = [".srt", ".vtt"] as const;

export type VideoExtension = (typeof videoExtensions)[number];
export type SubtitleExtension = (typeof subtitleExtensions)[number];

export function extensionOf(path: string) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

export function isVideoPath(path: string) {
  return (videoExtensions as readonly string[]).includes(extensionOf(path));
}

export function isSubtitlePath(path: string) {
  return (subtitleExtensions as readonly string[]).includes(extensionOf(path));
}
