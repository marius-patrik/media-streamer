type SearchCandidateRow = {
  id: string;
  titleId: string;
  episodeId: string | null;
  source: string;
  name: string;
  magnetUri: string | null;
  sizeBytes: bigint | number | string | null;
  seeders: number | null;
  leechers: number | null;
  quality: string | null;
  trusted: boolean;
  createdAt?: Date;
};

export function serializeSearchCandidate(candidate: SearchCandidateRow) {
  return {
    id: candidate.id,
    titleId: candidate.titleId,
    episodeId: candidate.episodeId,
    source: candidate.source,
    name: candidate.name,
    magnetUri: candidate.magnetUri,
    sizeBytes: candidate.sizeBytes?.toString() ?? null,
    seeders: candidate.seeders,
    leechers: candidate.leechers,
    quality: candidate.quality,
    trusted: candidate.trusted,
    createdAt: candidate.createdAt?.toISOString() ?? null,
  };
}

type DownloadJobRow = {
  id: string;
  titleId: string;
  episodeId: string | null;
  client: string;
  clientHash: string | null;
  name: string;
  magnetUri: string | null;
  status: string;
  progress: number;
  downloadPath: string | null;
  importedAssetId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeDownloadJob(job: DownloadJobRow) {
  return {
    id: job.id,
    titleId: job.titleId,
    episodeId: job.episodeId,
    client: job.client,
    clientHash: job.clientHash,
    name: job.name,
    magnetUri: job.magnetUri,
    status: job.status,
    progress: job.progress,
    downloadPath: job.downloadPath,
    importedAssetId: job.importedAssetId,
    createdByUserId: job.createdByUserId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
