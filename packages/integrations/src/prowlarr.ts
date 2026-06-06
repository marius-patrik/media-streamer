export type ProwlarrSearchResult = {
  name: string;
  magnetUri: string | null;
  torrentUrl: string | null;
  sizeBytes: number | null;
  seeders: number | null;
  leechers: number | null;
  quality: string | null;
  trusted: boolean;
  indexer: string | null;
};

export type ProwlarrClient = {
  search(input: { query: string; limit?: number }): Promise<ProwlarrSearchResult[]>;
  health(): Promise<{ ok: true; version: string | null }>;
};

export type ProwlarrClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetchFn?: FetchLike;
};

export class ProwlarrIntegrationError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "ProwlarrIntegrationError";
  }
}

type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

export function createProwlarrClient(options: ProwlarrClientOptions): ProwlarrClient {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    async search(input) {
      const payload = await requestProwlarr<ProwlarrRawSearchResult[]>(fetchFn, baseUrl, options.apiKey, "search", {
        query: input.query,
      });
      return payload
        .map(normalizeProwlarrResult)
        .filter((candidate) => candidate.name)
        .slice(0, input.limit ?? 50);
    },

    async health() {
      const payload = await requestProwlarr<{ version?: string }>(
        fetchFn,
        baseUrl,
        options.apiKey,
        "system/status",
        {},
      );
      return { ok: true, version: payload.version ?? null };
    },
  };
}

export function normalizeProwlarrResult(result: ProwlarrRawSearchResult): ProwlarrSearchResult {
  const name = result.title ?? result.name ?? "";
  return {
    name,
    magnetUri: result.magnetUrl ?? magnetFromDownloadUrl(result.downloadUrl),
    torrentUrl: result.downloadUrl ?? null,
    sizeBytes: safeNumber(result.size),
    seeders: safeInteger(result.seeders),
    leechers: safeInteger(result.leechers),
    quality: inferQuality(name),
    trusted: trustedResult(result),
    indexer: result.indexer ?? null,
  };
}

async function requestProwlarr<TPayload>(
  fetchFn: FetchLike,
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  params: Record<string, string>,
) {
  if (!apiKey.trim()) throw new ProwlarrIntegrationError("Prowlarr API key is required");
  const url = new URL(`${baseUrl}/api/v1/${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetchFn(url);
  if (!response.ok) {
    throw new ProwlarrIntegrationError(`Prowlarr request failed with HTTP ${response.status}`, response.status);
  }
  return (await response.json()) as TPayload;
}

function magnetFromDownloadUrl(downloadUrl: string | null | undefined) {
  return downloadUrl?.startsWith("magnet:") ? downloadUrl : null;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function safeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function trustedResult(result: ProwlarrRawSearchResult) {
  if (typeof result.grabs === "number" && result.grabs > 0) return true;
  if (typeof result.seeders === "number" && result.seeders > 0) return true;
  return false;
}

function inferQuality(name: string) {
  const match = /\b(2160p|1080p|720p|480p|4k|uhd|remux|bluray|web[- ]?dl|webrip|hdtv)\b/i.exec(name);
  return match ? match[1].toUpperCase().replace("WEB DL", "WEB-DL") : null;
}

export type ProwlarrRawSearchResult = {
  title?: string;
  name?: string;
  downloadUrl?: string | null;
  magnetUrl?: string | null;
  size?: number | null;
  seeders?: number | null;
  leechers?: number | null;
  grabs?: number | null;
  indexer?: string | null;
};
