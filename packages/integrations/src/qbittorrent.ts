export type QbittorrentClientOptions = {
  baseUrl: string;
  username: string;
  password: string;
  fetchFn?: FetchLike;
};

export type QbittorrentClient = {
  login(): Promise<string>;
  addMagnet(input: { magnetUri: string; category: string; savePath: string }): Promise<void>;
  listTorrents(): Promise<QbittorrentTorrent[]>;
  pause(hash: string): Promise<void>;
  resume(hash: string): Promise<void>;
  delete(hash: string, deleteFiles: boolean): Promise<void>;
};

export type QbittorrentTorrent = {
  hash: string;
  name: string;
  state: string;
  progress: number;
  savePath: string | null;
  contentPath: string | null;
  category: string | null;
};

export type TailStreamerDownloadStatus = "QUEUED" | "DOWNLOADING" | "COMPLETED" | "FAILED" | "NEEDS_REVIEW";

export class QbittorrentIntegrationError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "QbittorrentIntegrationError";
  }
}

type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

export function createQbittorrentClient(options: QbittorrentClientOptions): QbittorrentClient {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  let cookie: string | null = null;

  return {
    async login() {
      cookie = await login(fetchFn, baseUrl, options.username, options.password);
      return cookie;
    },

    async addMagnet(input) {
      const form = new URLSearchParams({
        urls: input.magnetUri,
        category: input.category,
        savepath: input.savePath,
      });
      await request(fetchFn, baseUrl, "torrents/add", {
        method: "POST",
        body: form,
        cookie: cookie ?? (await this.login()),
      });
    },

    async listTorrents() {
      const payload = await request<QbittorrentRawTorrent[]>(fetchFn, baseUrl, "torrents/info", {
        cookie: cookie ?? (await this.login()),
      });
      return payload.map(normalizeTorrent);
    },

    async pause(hash) {
      await torrentAction(fetchFn, baseUrl, cookie ?? (await this.login()), "torrents/pause", hash);
    },

    async resume(hash) {
      await torrentAction(fetchFn, baseUrl, cookie ?? (await this.login()), "torrents/resume", hash);
    },

    async delete(hash, deleteFiles) {
      const form = new URLSearchParams({ hashes: hash, deleteFiles: String(deleteFiles) });
      await request(fetchFn, baseUrl, "torrents/delete", {
        method: "POST",
        body: form,
        cookie: cookie ?? (await this.login()),
      });
    },
  };
}

export function mapQbittorrentStatus(state: string, progress: number): TailStreamerDownloadStatus {
  if (progress >= 1 || state === "uploading" || state === "stalledUP") return "COMPLETED";
  if (state === "error" || state === "missingFiles") return "FAILED";
  if (state === "pausedDL" || state === "queuedDL" || state === "stalledDL") return "QUEUED";
  if (state.endsWith("DL") || state === "downloading" || state === "metaDL" || state === "checkingDL")
    return "DOWNLOADING";
  return "NEEDS_REVIEW";
}

export function normalizeTorrent(torrent: QbittorrentRawTorrent): QbittorrentTorrent {
  return {
    hash: torrent.hash,
    name: torrent.name,
    state: torrent.state,
    progress: Number.isFinite(torrent.progress) ? torrent.progress : 0,
    savePath: torrent.save_path ?? null,
    contentPath: torrent.content_path ?? null,
    category: torrent.category ?? null,
  };
}

async function login(fetchFn: FetchLike, baseUrl: string, username: string, password: string) {
  const response = await fetchFn(new URL(`${baseUrl}/api/v2/auth/login`), {
    method: "POST",
    body: new URLSearchParams({ username, password }),
  });
  if (!response.ok)
    throw new QbittorrentIntegrationError(`qBittorrent login failed with HTTP ${response.status}`, response.status);
  const text = await response.text();
  if (text.trim() !== "Ok.")
    throw new QbittorrentIntegrationError("qBittorrent login rejected credentials", response.status);
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? null;
  if (!cookie)
    throw new QbittorrentIntegrationError("qBittorrent login did not return a session cookie", response.status);
  return cookie;
}

async function torrentAction(fetchFn: FetchLike, baseUrl: string, cookie: string, endpoint: string, hash: string) {
  await request(fetchFn, baseUrl, endpoint, {
    method: "POST",
    body: new URLSearchParams({ hashes: hash }),
    cookie,
  });
}

async function request<TPayload = void>(
  fetchFn: FetchLike,
  baseUrl: string,
  endpoint: string,
  options: { method?: string; body?: BodyInit; cookie: string },
) {
  const response = await fetchFn(new URL(`${baseUrl}/api/v2/${endpoint}`), {
    method: options.method ?? "GET",
    headers: { cookie: options.cookie },
    body: options.body,
  });
  if (!response.ok) {
    throw new QbittorrentIntegrationError(`qBittorrent request failed with HTTP ${response.status}`, response.status);
  }
  if (response.headers.get("content-type")?.includes("application/json")) {
    return (await response.json()) as TPayload;
  }
  return undefined as TPayload;
}

export type QbittorrentRawTorrent = {
  hash: string;
  name: string;
  state: string;
  progress: number;
  save_path?: string;
  content_path?: string;
  category?: string;
};
