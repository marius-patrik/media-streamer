export type TmdbKind = "MOVIE" | "SHOW";

export type TmdbSearchResult = {
  tmdbId: number;
  kind: TmdbKind;
  name: string;
  year: number | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
};

export type TmdbTitleDetail = TmdbSearchResult & {
  status: string | null;
  runtimeMinutes: number | null;
  episodeRuntimeMinutes: number | null;
  seasons: Array<{
    seasonNumber: number;
    episodeCount: number;
    name: string | null;
    overview: string | null;
  }>;
};

export type TmdbClient = {
  search(input: { kind: TmdbKind; query: string; page?: number }): Promise<TmdbSearchResult[]>;
  details(input: { kind: TmdbKind; tmdbId: number }): Promise<TmdbTitleDetail>;
  trending(input: { kind: TmdbKind; page?: number }): Promise<TmdbSearchResult[]>;
};

export type TmdbClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: FetchLike;
};

export class TmdbIntegrationError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "TmdbIntegrationError";
  }
}

export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.themoviedb.org/3";

  return {
    async search(input) {
      const endpoint = input.kind === "MOVIE" ? "search/movie" : "search/tv";
      const payload = await requestTmdb<TmdbSearchResponse>(fetchFn, baseUrl, options.apiKey, endpoint, {
        query: input.query,
        page: String(input.page ?? 1),
        include_adult: "false",
      });
      return payload.results.map((result) => mapSearchResult(input.kind, result)).filter((result) => result.name);
    },

    async details(input) {
      const endpoint = input.kind === "MOVIE" ? `movie/${input.tmdbId}` : `tv/${input.tmdbId}`;
      const payload = await requestTmdb<TmdbMovieDetail | TmdbShowDetail>(
        fetchFn,
        baseUrl,
        options.apiKey,
        endpoint,
        {},
      );
      return input.kind === "MOVIE"
        ? mapMovieDetail(payload as TmdbMovieDetail)
        : mapShowDetail(payload as TmdbShowDetail);
    },

    async trending(input) {
      const endpoint = input.kind === "MOVIE" ? "trending/movie/week" : "trending/tv/week";
      const payload = await requestTmdb<TmdbSearchResponse>(fetchFn, baseUrl, options.apiKey, endpoint, {
        page: String(input.page ?? 1),
      });
      return payload.results.map((result) => mapSearchResult(input.kind, result)).filter((result) => result.name);
    },
  };
}

export function validateTmdbImagePath(path: string | null | undefined) {
  if (!path) return null;
  if (!/^\/[A-Za-z0-9._/-]+$/.test(path)) return null;
  if (path.includes("..") || path.includes("//")) return null;
  return path;
}

function mapSearchResult(kind: TmdbKind, result: TmdbSearchItem): TmdbSearchResult {
  const name = kind === "MOVIE" ? result.title : result.name;
  const date = kind === "MOVIE" ? result.release_date : result.first_air_date;
  return {
    tmdbId: result.id,
    kind,
    name: name ?? "",
    year: yearFromDate(date),
    overview: result.overview ?? null,
    posterPath: validateTmdbImagePath(result.poster_path),
    backdropPath: validateTmdbImagePath(result.backdrop_path),
  };
}

function mapMovieDetail(detail: TmdbMovieDetail): TmdbTitleDetail {
  return {
    tmdbId: detail.id,
    kind: "MOVIE",
    name: detail.title,
    year: yearFromDate(detail.release_date),
    overview: detail.overview ?? null,
    posterPath: validateTmdbImagePath(detail.poster_path),
    backdropPath: validateTmdbImagePath(detail.backdrop_path),
    status: detail.status ?? null,
    runtimeMinutes: detail.runtime ?? null,
    episodeRuntimeMinutes: null,
    seasons: [],
  };
}

function mapShowDetail(detail: TmdbShowDetail): TmdbTitleDetail {
  const runtime = detail.episode_run_time?.find((minutes) => minutes > 0) ?? null;
  return {
    tmdbId: detail.id,
    kind: "SHOW",
    name: detail.name,
    year: yearFromDate(detail.first_air_date),
    overview: detail.overview ?? null,
    posterPath: validateTmdbImagePath(detail.poster_path),
    backdropPath: validateTmdbImagePath(detail.backdrop_path),
    status: detail.status ?? null,
    runtimeMinutes: null,
    episodeRuntimeMinutes: runtime,
    seasons: (detail.seasons ?? []).map((season) => ({
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
      name: season.name ?? null,
      overview: season.overview ?? null,
    })),
  };
}

type FetchLike = (input: URL) => Promise<Response>;

async function requestTmdb<TPayload>(
  fetchFn: FetchLike,
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  params: Record<string, string>,
) {
  if (!apiKey.trim()) throw new TmdbIntegrationError("TMDB API key is required");
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetchFn(url);
  if (!response.ok) {
    throw new TmdbIntegrationError(`TMDB request failed with HTTP ${response.status}`, response.status);
  }
  return (await response.json()) as TPayload;
}

function yearFromDate(date: string | null | undefined) {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(date ?? "");
  return match ? Number(match[1]) : null;
}

type TmdbSearchResponse = {
  results: TmdbSearchItem[];
};

type TmdbSearchItem = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

type TmdbMovieDetail = TmdbSearchItem & {
  title: string;
  release_date?: string;
  runtime?: number | null;
  status?: string | null;
};

type TmdbShowDetail = TmdbSearchItem & {
  name: string;
  first_air_date?: string;
  episode_run_time?: number[];
  seasons?: Array<{
    season_number: number;
    episode_count: number;
    name?: string | null;
    overview?: string | null;
  }>;
  status?: string | null;
};
