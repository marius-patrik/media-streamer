type TitleSummaryRow = {
  id: string;
  kind: string;
  name: string;
  year: number | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  createdFrom: string;
  matchStatus: string;
};

type EpisodeRow = {
  id: string;
  titleId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
};

type ExternalIdRow = {
  id: string;
  provider: string;
  value: string;
  episodeId?: string | null;
};

type LocalAssetRow = {
  id: string;
  episodeId: string | null;
  relativePath: string;
  sizeBytes: bigint | number | string;
  container: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  durationSeconds: number | null;
  scanStatus: string;
};

type CloudSourceRow = {
  id: string;
  episodeId: string | null;
  provider: string;
  url: string;
  enabled: boolean;
};

type DownloadJobRow = {
  id: string;
  episodeId: string | null;
  name: string;
  status: string;
  progress: number;
};

type SearchCandidateRow = {
  id: string;
  episodeId: string | null;
  source: string;
  name: string;
  sizeBytes: bigint | number | string | null;
  seeders: number | null;
  leechers: number | null;
  quality: string | null;
  trusted: boolean;
};

export function serializeTitleSummary(title: TitleSummaryRow) {
  return {
    id: title.id,
    kind: title.kind,
    name: title.name,
    year: title.year,
    overview: title.overview,
    posterPath: title.posterPath,
    backdropPath: title.backdropPath,
    createdFrom: title.createdFrom,
    matchStatus: title.matchStatus,
  };
}

export function serializeEpisode(episode: EpisodeRow) {
  return {
    id: episode.id,
    titleId: episode.titleId,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    name: episode.name,
    overview: episode.overview,
  };
}

export function serializeTitleDetail(
  title: TitleSummaryRow & {
    episodes: EpisodeRow[];
    externalIds: ExternalIdRow[];
    localAssets: LocalAssetRow[];
    cloudSources: CloudSourceRow[];
    downloads: DownloadJobRow[];
    candidates: SearchCandidateRow[];
  },
) {
  return {
    ...serializeTitleSummary(title),
    episodes: title.episodes.map(serializeEpisode),
    externalIds: title.externalIds.map((externalId) => ({
      id: externalId.id,
      provider: externalId.provider,
      value: externalId.value,
      episodeId: externalId.episodeId ?? null,
    })),
    localAssets: title.localAssets.map((asset) => ({
      id: asset.id,
      episodeId: asset.episodeId,
      relativePath: asset.relativePath,
      sizeBytes: asset.sizeBytes.toString(),
      container: asset.container,
      videoCodec: asset.videoCodec,
      audioCodec: asset.audioCodec,
      durationSeconds: asset.durationSeconds,
      scanStatus: asset.scanStatus,
    })),
    cloudSources: title.cloudSources.map((source) => ({
      id: source.id,
      episodeId: source.episodeId,
      provider: source.provider,
      url: source.url,
      enabled: source.enabled,
    })),
    downloads: title.downloads.map((job) => ({
      id: job.id,
      episodeId: job.episodeId,
      name: job.name,
      status: job.status,
      progress: job.progress,
    })),
    candidates: title.candidates.map((candidate) => ({
      id: candidate.id,
      episodeId: candidate.episodeId,
      source: candidate.source,
      name: candidate.name,
      sizeBytes: candidate.sizeBytes?.toString() ?? null,
      seeders: candidate.seeders,
      leechers: candidate.leechers,
      quality: candidate.quality,
      trusted: candidate.trusted,
    })),
  };
}
