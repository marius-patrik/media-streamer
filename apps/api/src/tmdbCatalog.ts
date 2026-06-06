import type { TmdbTitleDetail } from "@tailstreamer/integrations";

export function tmdbDetailToTitleData(detail: TmdbTitleDetail) {
  return {
    kind: detail.kind,
    name: detail.name,
    year: detail.year,
    overview: detail.overview,
    posterPath: detail.posterPath,
    backdropPath: detail.backdropPath,
    createdFrom: "TMDB" as const,
    matchStatus: "MATCHED" as const,
    externalId: {
      provider: "TMDB" as const,
      value: String(detail.tmdbId),
    },
  };
}
