export type ApiEnv = {
  port: number;
  sessionSecret: string;
  bootstrapSecret: string;
  production: boolean;
  webDist: string;
  mediaRoot: string;
  downloadIncomplete: string;
  downloadComplete: string;
  tmdbApiKey: string | null;
  prowlarrUrl: string;
  prowlarrApiKey: string | null;
  qbittorrentUrl: string;
  qbittorrentUsername: string | null;
  qbittorrentPassword: string | null;
};

export function readEnv(input = process.env): ApiEnv {
  const production = input.NODE_ENV === "production";
  const sessionSecret = input.SESSION_SECRET ?? "";
  const bootstrapSecret = input.BOOTSTRAP_SECRET ?? "";

  if (production && sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production");
  }

  return {
    port: Number(input.PORT ?? 8080),
    sessionSecret: sessionSecret || "development-session-secret-32-bytes-min",
    bootstrapSecret: bootstrapSecret || "development-bootstrap-secret",
    production,
    webDist: input.WEB_DIST || "dist/web",
    mediaRoot: input.MEDIA_ROOT || "/media",
    downloadIncomplete: input.DOWNLOAD_INCOMPLETE || "/downloads/incomplete",
    downloadComplete: input.DOWNLOAD_COMPLETE || "/downloads/complete",
    tmdbApiKey: input.TMDB_API_KEY?.trim() || null,
    prowlarrUrl: input.PROWLARR_URL || "http://prowlarr:9696",
    prowlarrApiKey: input.PROWLARR_API_KEY?.trim() || null,
    qbittorrentUrl: input.QB_URL || "http://qbittorrent:8080",
    qbittorrentUsername: input.QB_USERNAME?.trim() || null,
    qbittorrentPassword: input.QB_PASSWORD?.trim() || null,
  };
}
