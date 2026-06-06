export type IntegrationHealth = {
  provider: "TMDB" | "PROWLARR" | "QBITTORRENT" | "CLOUD_PROVIDER";
  ok: boolean;
  message?: string;
};

export {
  CloudTemplateError,
  defaultCloudProviderTemplates,
  renderCloudProviderUrl,
  validateCloudProviderTemplate,
  type CloudProviderTemplate,
  type CloudTemplateInput,
} from "./cloud";
export {
  TmdbIntegrationError,
  createTmdbClient,
  validateTmdbImagePath,
  type TmdbClient,
  type TmdbKind,
  type TmdbSearchResult,
  type TmdbTitleDetail,
} from "./tmdb";
export {
  ProwlarrIntegrationError,
  createProwlarrClient,
  normalizeProwlarrResult,
  type ProwlarrClient,
  type ProwlarrRawSearchResult,
  type ProwlarrSearchResult,
} from "./prowlarr";
export {
  QbittorrentIntegrationError,
  createQbittorrentClient,
  mapQbittorrentStatus,
  normalizeTorrent,
  type QbittorrentClient,
  type QbittorrentRawTorrent,
  type QbittorrentTorrent,
  type TailStreamerDownloadStatus,
} from "./qbittorrent";
