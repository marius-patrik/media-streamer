import { Button } from "@tailstreamer/ui/components/button";
import { QueryClientProvider } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Cloud,
  Database,
  Download,
  Film,
  HardDriveDownload,
  LogOut,
  PlaySquare,
  RefreshCw,
  Search,
  Settings,
  Users,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Link, Route, Switch, useLocation, useRoute, useSearchParams } from "wouter";
import "./styles.css";
import { queryClient, trpc, trpcClient } from "./trpc";

type UserRole = "ADMIN" | "DOWNLOADER" | "VIEWER";
type TitleKind = "MOVIE" | "SHOW";
type TitleSummary = {
  id: string;
  kind: TitleKind;
  name: string;
  year: number | null;
  matchStatus: string;
};
type SearchCandidate = {
  id: string;
  name: string;
  magnetUri: string | null;
  sizeBytes: string | null;
  seeders: number | null;
  quality: string | null;
};
type DownloadJob = {
  id: string;
  name: string;
  status: string;
  progress: number;
  downloadPath: string | null;
  magnetUri: string | null;
};
type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  disabledAt: string | Date | null;
};
type PlayableSource = {
  type: "LOCAL" | "DOWNLOAD" | "CLOUD";
  id: string;
  label: string;
  streamUrl?: string;
  url?: string;
  status?: string;
  durationSeconds?: number | null;
  subtitle?: {
    id: string;
    language: string | null;
    format: string;
    url: string;
  } | null;
};

function App() {
  const me = trpc.auth.me.useQuery();

  if (me.isLoading) return <CenteredState>Loading TailStreamer</CenteredState>;
  if (!me.data?.user) return <AuthScreen bootstrapRequired={Boolean(me.data?.bootstrapRequired)} />;
  return <Shell user={me.data.user} />;
}

function Shell({ user }: { user: { displayName?: string; email?: string; role?: UserRole } }) {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess() {
      utils.auth.me.invalidate();
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-x-0 top-0 z-10 flex h-14 items-center border-b border-border bg-sidebar px-3 md:inset-y-0 md:left-0 md:h-auto md:w-60 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-3">
        <Link href="/" className="mr-4 shrink-0 px-2 text-base font-semibold md:mb-3 md:mr-0 md:py-3 md:text-lg">
          TailStreamer
        </Link>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:grid md:flex-none md:overflow-visible">
          <NavLink href="/" icon={<Film size={18} />} label="Library" />
          <NavLink href="/downloads" icon={<HardDriveDownload size={18} />} label="Downloads" />
          <NavLink href="/player" icon={<PlaySquare size={18} />} label="Player" />
          {user.role === "ADMIN" ? <NavLink href="/admin" icon={<Settings size={18} />} label="Admin" /> : null}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:mt-auto md:ml-0 md:grid md:border-t md:border-border md:pt-3">
          <div className="hidden min-w-0 px-2 text-xs text-muted-foreground md:block">
            <div className="truncate text-foreground">{user.displayName ?? "TailStreamer user"}</div>
            <div className="truncate">{user.email ?? ""}</div>
            <div>{user.role ?? "VIEWER"}</div>
          </div>
          <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut size={16} />
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </div>
      </aside>
      <main className="min-h-screen px-3 pb-6 pt-20 md:ml-60 md:p-6">
        <Switch>
          <Route path="/" component={LibraryRoute} />
          <Route path="/title/:titleId" component={TitleDetailRoute} />
          <Route path="/downloads" component={DownloadsRoute} />
          <Route path="/player" component={PlayerRoute} />
          <Route path="/admin" component={AdminRoute} />
          <Route>
            <Panel title="Not found">The requested TailStreamer route does not exist.</Panel>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function AuthScreen({ bootstrapRequired }: { bootstrapRequired: boolean }) {
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const bootstrap = trpc.auth.bootstrapAdmin.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const pending = login.isPending || bootstrap.isPending;
  const error = login.error ?? bootstrap.error;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <form
        className="grid w-full max-w-sm gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (bootstrapRequired) bootstrap.mutate({ email, password, displayName, bootstrapSecret });
          else login.mutate({ email, password });
        }}
      >
        <header className="grid gap-1 border-b border-border pb-4">
          <h1 className="text-2xl font-semibold tracking-normal">TailStreamer</h1>
          <p className="text-sm text-muted-foreground">
            {bootstrapRequired ? "Create the first admin account" : "Sign in"}
          </p>
        </header>
        {bootstrapRequired ? (
          <Field label="Display name" value={displayName} onChange={setDisplayName} autoComplete="name" />
        ) : null}
        <Field label="Email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={bootstrapRequired ? "new-password" : "current-password"}
        />
        {bootstrapRequired ? (
          <Field
            label="Bootstrap secret"
            value={bootstrapSecret}
            onChange={setBootstrapSecret}
            type="password"
            autoComplete="one-time-code"
          />
        ) : null}
        {error ? <Notice>{error.message}</Notice> : null}
        <Button disabled={pending}>{bootstrapRequired ? "Create admin" : "Sign in"}</Button>
      </form>
    </main>
  );
}

function LibraryRoute() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TitleKind | "ALL">("ALL");
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbKind, setTmdbKind] = useState<TitleKind>("MOVIE");
  const utils = trpc.useUtils();
  const titles = trpc.titles.search.useQuery({ query, kind: kind === "ALL" ? undefined : kind, limit: 50 });
  const tmdb = trpc.metadata.tmdbSearch.useQuery(
    { query: tmdbQuery, kind: tmdbKind },
    { enabled: tmdbQuery.trim().length > 0 },
  );
  const openFromTmdb = trpc.metadata.openTitleFromTmdb.useMutation({
    onSuccess(title) {
      utils.titles.search.invalidate();
      navigate(`/title/${title.id}`);
    },
  });

  return (
    <RouteSection title="Library" icon={<Film size={20} />}>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel
          title="Local Catalog"
          action={
            <Segmented
              value={kind}
              options={["ALL", "MOVIE", "SHOW"]}
              onChange={(value) => setKind(value as TitleKind | "ALL")}
            />
          }
        >
          <div className="grid gap-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Search local titles" />
            <DataState loading={titles.isLoading} error={titles.error?.message} empty={!titles.data?.length}>
              <div className="grid gap-2">
                {titles.data?.map((title) => (
                  <Link
                    key={title.id}
                    href={`/title/${title.id}`}
                    className="grid gap-1 rounded-md border border-border bg-sidebar px-3 py-2 hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{title.name}</span>
                      <Badge>{title.kind}</Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{title.year ?? "Unknown year"}</span>
                      <span>{title.matchStatus}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </DataState>
          </div>
        </Panel>
        <Panel
          title="TMDB Search"
          action={
            <Segmented
              value={tmdbKind}
              options={["MOVIE", "SHOW"]}
              onChange={(value) => setTmdbKind(value as TitleKind)}
            />
          }
        >
          <div className="grid gap-3">
            <SearchInput value={tmdbQuery} onChange={setTmdbQuery} placeholder="Search TMDB" />
            <DataState
              loading={tmdb.isFetching}
              error={tmdb.error?.message}
              empty={tmdbQuery.length > 0 && !tmdb.data?.length}
            >
              <div className="grid gap-2">
                {tmdb.data?.map((result) => (
                  <div
                    key={`${result.kind}-${result.tmdbId}`}
                    className="grid gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{result.name}</div>
                        <div className="text-xs text-muted-foreground">{result.year ?? "Unknown year"}</div>
                      </div>
                      <Button
                        variant="secondary"
                        disabled={openFromTmdb.isPending}
                        onClick={() => openFromTmdb.mutate({ kind: result.kind, tmdbId: result.tmdbId })}
                      >
                        Open
                      </Button>
                    </div>
                    {result.overview ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{result.overview}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </DataState>
          </div>
        </Panel>
      </div>
    </RouteSection>
  );
}

function TitleDetailRoute() {
  const [, params] = useRoute("/title/:titleId");
  const titleId = params?.titleId ?? "";
  const utils = trpc.useUtils();
  const detail = trpc.titles.detail.useQuery({ titleId }, { enabled: Boolean(titleId) });
  const [prowlarrQuery, setProwlarrQuery] = useState("");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState("");
  const candidates = trpc.downloads.listCandidates.useQuery(
    { titleId, episodeId: selectedEpisodeId },
    { enabled: Boolean(titleId) },
  );
  const providers = trpc.cloud.listProviders.useQuery();
  const searchProwlarr = trpc.downloads.searchProwlarr.useMutation({
    onSuccess() {
      utils.downloads.listCandidates.invalidate();
    },
  });
  const startCandidate = trpc.downloads.startFromCandidate.useMutation({
    onSuccess() {
      utils.downloads.listJobs.invalidate();
    },
  });
  const resolveCloud = trpc.cloud.resolveCloudSource.useMutation({
    onSuccess() {
      utils.titles.detail.invalidate({ titleId });
    },
  });

  const enabledProviders = providers.data?.filter((provider) => provider.enabled) ?? [];
  const activeEpisode = detail.data?.episodes.find((episode) => episode.id === selectedEpisodeId) ?? null;

  return (
    <RouteSection title={detail.data?.name ?? "Title"} icon={<Film size={20} />}>
      <DataState loading={detail.isLoading} error={detail.error?.message} empty={!detail.data}>
        {detail.data ? (
          <div className="grid gap-4">
            <Panel
              title={`${detail.data.kind}${detail.data.year ? ` - ${detail.data.year}` : ""}`}
              action={<Badge>{detail.data.matchStatus}</Badge>}
            >
              <div className="grid gap-3">
                {detail.data.overview ? (
                  <p className="text-sm leading-6 text-muted-foreground">{detail.data.overview}</p>
                ) : null}
                <div className="grid gap-2 md:grid-cols-4">
                  <Metric label="Local" value={detail.data.localAssets.length} />
                  <Metric label="Cloud" value={detail.data.cloudSources.filter((source) => source.enabled).length} />
                  <Metric label="Downloads" value={detail.data.downloads.length} />
                  <Metric label="Candidates" value={detail.data.candidates.length} />
                </div>
              </div>
            </Panel>
            <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
              <Panel title="Episodes And Sources">
                <div className="grid gap-3">
                  {detail.data.episodes.length ? (
                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
                      value={selectedEpisodeId ?? ""}
                      onChange={(event) => setSelectedEpisodeId(event.currentTarget.value || null)}
                    >
                      <option value="">Whole title</option>
                      {detail.data.episodes.map((episode) => (
                        <option key={episode.id} value={episode.id}>
                          S{episode.seasonNumber}E{episode.episodeNumber} {episode.name ?? ""}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <SourceList titleId={titleId} episodeId={selectedEpisodeId} />
                </div>
              </Panel>
              <Panel title="Search And Attach">
                <div className="grid gap-4">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <SearchInput
                      value={prowlarrQuery}
                      onChange={setProwlarrQuery}
                      placeholder={
                        activeEpisode
                          ? `${detail.data.name} S${activeEpisode.seasonNumber}E${activeEpisode.episodeNumber}`
                          : detail.data.name
                      }
                    />
                    <Button
                      disabled={searchProwlarr.isPending || !prowlarrQuery.trim()}
                      onClick={() =>
                        searchProwlarr.mutate({
                          titleId,
                          episodeId: selectedEpisodeId,
                          query: prowlarrQuery,
                          limit: 25,
                        })
                      }
                    >
                      <Search size={16} />
                      Search
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={providerId}
                      onChange={(event) => setProviderId(event.currentTarget.value)}
                    >
                      <option value="">Cloud provider</option>
                      {enabledProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={!providerId || resolveCloud.isPending}
                      onClick={() => resolveCloud.mutate({ titleId, episodeId: selectedEpisodeId, providerId })}
                    >
                      <Cloud size={16} />
                      Resolve
                    </Button>
                  </div>
                  <DataState
                    loading={candidates.isLoading}
                    error={candidates.error?.message}
                    empty={!candidates.data?.length}
                  >
                    <div className="grid gap-2">
                      {candidates.data?.map((candidate: SearchCandidate) => (
                        <div
                          key={candidate.id}
                          className="grid gap-2 rounded-md border border-border px-3 py-2 md:grid-cols-[1fr_auto] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm">{candidate.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {candidate.quality ?? "Unknown"} · {candidate.seeders ?? 0} seeders ·{" "}
                              {candidate.sizeBytes ?? "unknown"} bytes
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            disabled={!candidate.magnetUri || startCandidate.isPending}
                            onClick={() => startCandidate.mutate({ candidateId: candidate.id })}
                          >
                            <Download size={16} />
                            Queue
                          </Button>
                        </div>
                      ))}
                    </div>
                  </DataState>
                </div>
              </Panel>
            </div>
          </div>
        ) : null}
      </DataState>
    </RouteSection>
  );
}

function SourceList({ titleId, episodeId }: { titleId: string; episodeId: string | null }) {
  const sources = trpc.player.getPlayableSources.useQuery({ titleId, episodeId }, { enabled: Boolean(titleId) });

  return (
    <DataState loading={sources.isLoading} error={sources.error?.message} empty={!sources.data?.sources.length}>
      <div className="grid gap-2">
        {sources.data?.sources.map((source) => (
          <Link
            key={`${source.type}-${source.id}`}
            href={`/player?titleId=${encodeURIComponent(titleId)}${episodeId ? `&episodeId=${encodeURIComponent(episodeId)}` : ""}&sourceId=${encodeURIComponent(source.id)}&sourceType=${source.type}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 hover:border-primary"
          >
            <span className="min-w-0 truncate text-sm">{source.label}</span>
            <Badge>{source.type}</Badge>
          </Link>
        ))}
      </div>
    </DataState>
  );
}

function PlayerRoute() {
  const [, navigate] = useLocation();
  const [params] = useSearchParams();
  const titleId = params.get("titleId") ?? "";
  const episodeId = params.get("episodeId");
  const requestedSourceId = params.get("sourceId");
  const requestedSourceType = params.get("sourceType") as "LOCAL" | "DOWNLOAD" | "CLOUD" | null;
  const sources = trpc.player.getPlayableSources.useQuery({ titleId, episodeId }, { enabled: Boolean(titleId) });
  const saveLastSource = trpc.player.saveLastSource.useMutation();
  const saveProgress = trpc.player.saveProgress.useMutation();
  const [progressSeconds, setProgressSeconds] = useState("0");
  const selected = sources.data?.sources.find((source) => source.id === requestedSourceId) ?? sources.data?.sources[0];

  return (
    <RouteSection title="Player" icon={<PlaySquare size={20} />}>
      {!titleId ? (
        <Panel title="No Source Selected">Open a title from the library and choose a playable source.</Panel>
      ) : (
        <Panel
          title={selected ? selected.label : "Playable Sources"}
          action={selected ? <Badge>{selected.type}</Badge> : undefined}
        >
          <DataState loading={sources.isLoading} error={sources.error?.message} empty={!sources.data?.sources.length}>
            <div className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={selected ? `${selected.type}:${selected.id}` : ""}
                  onChange={(event) => {
                    const [sourceType, sourceId] = event.currentTarget.value.split(":");
                    navigate(
                      `/player?titleId=${titleId}${episodeId ? `&episodeId=${episodeId}` : ""}&sourceId=${sourceId}&sourceType=${sourceType}`,
                    );
                  }}
                >
                  {sources.data?.sources.map((source) => (
                    <option key={`${source.type}:${source.id}`} value={`${source.type}:${source.id}`}>
                      {source.type} · {source.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  disabled={!selected || saveLastSource.isPending}
                  onClick={() =>
                    selected &&
                    saveLastSource.mutate({
                      titleId,
                      episodeId,
                      sourceId: selected.id,
                      sourceType: requestedSourceType ?? selected.type,
                    })
                  }
                >
                  Save source
                </Button>
              </div>
              <PlayerSurface source={selected} />
              <div className="grid gap-2 md:grid-cols-[12rem_auto]">
                <input
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={progressSeconds}
                  inputMode="numeric"
                  onChange={(event) => setProgressSeconds(event.currentTarget.value)}
                />
                <Button
                  variant="secondary"
                  disabled={saveProgress.isPending}
                  onClick={() =>
                    saveProgress.mutate({
                      titleId,
                      episodeId,
                      progressSeconds: Number(progressSeconds) || 0,
                      durationSeconds: selected && "durationSeconds" in selected ? selected.durationSeconds : null,
                    })
                  }
                >
                  Save progress
                </Button>
              </div>
            </div>
          </DataState>
        </Panel>
      )}
    </RouteSection>
  );
}

function PlayerSurface({ source }: { source?: PlayableSource }) {
  if (!source) return <Notice>No playable source available.</Notice>;
  if (source.type === "LOCAL") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: Captions are rendered when the selected local asset has a stored subtitle.
      <video className="aspect-video w-full rounded-md border border-border bg-black" controls src={source.streamUrl}>
        {source.subtitle ? (
          <track
            default
            kind="subtitles"
            label={source.subtitle.language ?? source.subtitle.format.toUpperCase()}
            src={source.subtitle.url}
            srcLang={source.subtitle.language ?? "und"}
          />
        ) : null}
      </video>
    );
  }
  if (source.type === "CLOUD") {
    return (
      <iframe
        className="aspect-video w-full rounded-md border border-border bg-black"
        title={source.label}
        src={source.url}
      />
    );
  }
  return <Notice>{source.status ?? "Download source"} is tracked in the queue.</Notice>;
}

function DownloadsRoute() {
  const utils = trpc.useUtils();
  const jobs = trpc.downloads.listJobs.useQuery();
  const [magnet, setMagnet] = useState("");
  const [name, setName] = useState("");
  const [titleId, setTitleId] = useState("");
  const addMagnet = trpc.downloads.addMagnet.useMutation({ onSuccess: () => utils.downloads.listJobs.invalidate() });
  const syncJobs = trpc.downloads.syncJobs.useMutation({ onSuccess: () => utils.downloads.listJobs.invalidate() });
  const importJob = trpc.downloads.importCompletedJob.useMutation({
    onSuccess: () => utils.downloads.listJobs.invalidate(),
  });
  const pauseJob = trpc.downloads.pauseJob.useMutation();
  const resumeJob = trpc.downloads.resumeJob.useMutation();
  const deleteJob = trpc.downloads.deleteJob.useMutation({ onSuccess: () => utils.downloads.listJobs.invalidate() });

  return (
    <RouteSection title="Downloads" icon={<HardDriveDownload size={20} />}>
      <div className="grid gap-4">
        <Panel title="Add Magnet">
          <form
            className="grid gap-2 lg:grid-cols-[1fr_1fr_2fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              addMagnet.mutate({ titleId, name, magnetUri: magnet });
            }}
          >
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Title ID"
              value={titleId}
              onChange={(event) => setTitleId(event.currentTarget.value)}
            />
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="magnet:"
              value={magnet}
              onChange={(event) => setMagnet(event.currentTarget.value)}
            />
            <Button disabled={addMagnet.isPending}>Queue</Button>
          </form>
          {addMagnet.error ? <Notice>{addMagnet.error.message}</Notice> : null}
        </Panel>
        <Panel
          title="Queue"
          action={
            <Button variant="secondary" onClick={() => syncJobs.mutate()} disabled={syncJobs.isPending}>
              <RefreshCw size={16} />
              Sync
            </Button>
          }
        >
          <DataState loading={jobs.isLoading} error={jobs.error?.message} empty={!jobs.data?.length}>
            <div className="grid gap-2">
              {jobs.data?.map((job: DownloadJob) => (
                <div
                  key={job.id}
                  className="grid gap-2 rounded-md border border-border px-3 py-2 xl:grid-cols-[1fr_8rem_7rem_auto] xl:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{job.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {job.downloadPath ?? job.magnetUri ?? job.id}
                    </div>
                  </div>
                  <Badge>{job.status}</Badge>
                  <span className="text-sm text-muted-foreground">{Math.round(job.progress * 100)}%</span>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => pauseJob.mutate({ jobId: job.id })}>
                      Pause
                    </Button>
                    <Button variant="secondary" onClick={() => resumeJob.mutate({ jobId: job.id })}>
                      Resume
                    </Button>
                    <Button variant="secondary" onClick={() => importJob.mutate({ jobId: job.id })}>
                      Import
                    </Button>
                    <Button variant="ghost" onClick={() => deleteJob.mutate({ jobId: job.id })}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </Panel>
      </div>
    </RouteSection>
  );
}

function AdminRoute() {
  const utils = trpc.useUtils();
  const users = trpc.users.list.useQuery();
  const tmdb = trpc.metadata.tmdbStatus.useQuery();
  const prowlarr = trpc.downloads.prowlarrStatus.useQuery();
  const qbit = trpc.downloads.qbittorrentStatus.useQuery();
  const providers = trpc.cloud.listProviders.useQuery();
  const updateTmdbApiKey = trpc.admin.updateTmdbApiKey.useMutation({
    onSuccess() {
      utils.metadata.tmdbStatus.invalidate();
      setTmdbApiKey("");
    },
  });
  const updateProwlarrApiKey = trpc.admin.updateProwlarrApiKey.useMutation({
    onSuccess() {
      utils.downloads.prowlarrStatus.invalidate();
      setProwlarrApiKey("");
    },
  });
  const updateQbittorrentCredentials = trpc.admin.updateQbittorrentCredentials.useMutation({
    onSuccess() {
      utils.downloads.qbittorrentStatus.invalidate();
      setQbitPassword("");
    },
  });
  const ensureQbittorrentCategories = trpc.admin.ensureQbittorrentCategories.useMutation({
    onSuccess() {
      utils.downloads.qbittorrentStatus.invalidate();
    },
  });
  const createUser = trpc.users.create.useMutation({
    onSuccess() {
      utils.users.list.invalidate();
      setCreateForm({ email: "", password: "", displayName: "", role: "VIEWER" });
    },
  });
  const updateRole = trpc.users.updateRole.useMutation({ onSuccess: () => utils.users.list.invalidate() });
  const disableUser = trpc.users.disable.useMutation({ onSuccess: () => utils.users.list.invalidate() });
  const scanLibrary = trpc.library.scan.useMutation();
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [prowlarrApiKey, setProwlarrApiKey] = useState("");
  const [qbitUsername, setQbitUsername] = useState("");
  const [qbitPassword, setQbitPassword] = useState("");
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "VIEWER" as UserRole,
  });

  return (
    <RouteSection title="Admin" icon={<Settings size={20} />}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <StatusMetric label="TMDB" ok={tmdb.data?.configured} />
          <StatusMetric label="Prowlarr" ok={prowlarr.data?.configured && prowlarr.data.reachable} />
          <StatusMetric label="qBittorrent" ok={qbit.data?.configured && qbit.data.reachable} />
          <Metric label="Cloud Providers" value={providers.data?.length ?? 0} />
        </div>
        <Panel title="Provider Setup" action={<Cloud size={18} />}>
          <div className="grid gap-3 xl:grid-cols-3">
            <form
              className="grid gap-2 rounded-md border border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                updateTmdbApiKey.mutate({ apiKey: tmdbApiKey });
              }}
            >
              <Field label="TMDB API key" value={tmdbApiKey} type="password" onChange={setTmdbApiKey} />
              <Button disabled={updateTmdbApiKey.isPending}>Save TMDB</Button>
              {updateTmdbApiKey.error ? <Notice>{updateTmdbApiKey.error.message}</Notice> : null}
            </form>
            <form
              className="grid gap-2 rounded-md border border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                updateProwlarrApiKey.mutate({ apiKey: prowlarrApiKey });
              }}
            >
              <Field label="Prowlarr API key" value={prowlarrApiKey} type="password" onChange={setProwlarrApiKey} />
              <Button disabled={updateProwlarrApiKey.isPending}>Save Prowlarr</Button>
              {updateProwlarrApiKey.error ? <Notice>{updateProwlarrApiKey.error.message}</Notice> : null}
            </form>
            <form
              className="grid gap-2 rounded-md border border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                updateQbittorrentCredentials.mutate({ username: qbitUsername, password: qbitPassword });
              }}
            >
              <Field label="qBittorrent username" value={qbitUsername} onChange={setQbitUsername} />
              <Field label="qBittorrent password" value={qbitPassword} type="password" onChange={setQbitPassword} />
              <div className="flex flex-wrap gap-2">
                <Button disabled={updateQbittorrentCredentials.isPending}>Save qBit</Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={ensureQbittorrentCategories.isPending}
                  onClick={() => ensureQbittorrentCategories.mutate()}
                >
                  Categories
                </Button>
              </div>
              {updateQbittorrentCredentials.error ? (
                <Notice>{updateQbittorrentCredentials.error.message}</Notice>
              ) : null}
              {ensureQbittorrentCategories.error ? <Notice>{ensureQbittorrentCategories.error.message}</Notice> : null}
            </form>
          </div>
        </Panel>
        <Panel title="Cloud Providers" action={<Cloud size={18} />}>
          <DataState loading={providers.isLoading} error={providers.error?.message} empty={!providers.data?.length}>
            <div className="grid gap-2 md:grid-cols-3">
              {providers.data?.map((provider) => (
                <div key={provider.id} className="rounded-md border border-border p-3">
                  <div className="truncate text-sm">{provider.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge>{provider.enabled ? "Enabled" : "Disabled"}</Badge>
                    <Badge>{provider.externalProvider}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </Panel>
        <Panel title="Users" action={<Users size={18} />}>
          <form
            className="grid gap-2 xl:grid-cols-[1fr_1fr_1fr_10rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              createUser.mutate(createForm);
            }}
          >
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Email"
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.currentTarget.value })}
            />
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Display name"
              value={createForm.displayName}
              onChange={(event) => setCreateForm({ ...createForm, displayName: event.currentTarget.value })}
            />
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Password"
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm({ ...createForm, password: event.currentTarget.value })}
            />
            <RoleSelect value={createForm.role} onChange={(role) => setCreateForm({ ...createForm, role })} />
            <Button disabled={createUser.isPending}>Create</Button>
          </form>
          {createUser.error ? <Notice>{createUser.error.message}</Notice> : null}
          <DataState loading={users.isLoading} error={users.error?.message} empty={!users.data?.length}>
            <div className="grid gap-2">
              {users.data?.map((user: AdminUser) => (
                <div
                  key={user.id}
                  className="grid gap-2 rounded-md border border-border px-3 py-2 lg:grid-cols-[1fr_12rem_8rem_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{user.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <RoleSelect
                    value={user.role}
                    disabled={Boolean(user.disabledAt)}
                    onChange={(role) => updateRole.mutate({ userId: user.id, role })}
                  />
                  <Badge>{user.disabledAt ? "Disabled" : "Enabled"}</Badge>
                  <Button
                    variant="secondary"
                    disabled={Boolean(user.disabledAt)}
                    onClick={() => disableUser.mutate({ userId: user.id })}
                  >
                    Disable
                  </Button>
                </div>
              ))}
            </div>
          </DataState>
        </Panel>
        <Panel
          title="Library Scan"
          action={
            <Button onClick={() => scanLibrary.mutate()} disabled={scanLibrary.isPending}>
              <Database size={16} /> Scan
            </Button>
          }
        >
          {scanLibrary.data ? (
            <div className="grid gap-2 md:grid-cols-3">
              <Metric label="Videos" value={scanLibrary.data.scannedVideoCount} />
              <Metric label="Skipped incomplete" value={scanLibrary.data.skippedIncompleteCount} />
              <Metric label="Assets" value={scanLibrary.data.assetIds.length} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scans the configured media root and skips incomplete downloads.
            </p>
          )}
          {scanLibrary.error ? <Notice>{scanLibrary.error.message}</Notice> : null}
        </Panel>
      </div>
    </RouteSection>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value as UserRole)}
    >
      <option value="VIEWER">Viewer</option>
      <option value="DOWNLOADER">Downloader</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}

function RouteSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
      <header className="flex items-center gap-2 border-b border-border pb-4">
        {icon}
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      </header>
      {children}
    </motion.section>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-md border border-border bg-sidebar p-4">
      <header className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="truncate text-sm font-medium text-muted-foreground">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        className="h-10 rounded-md border border-border bg-sidebar px-3 text-foreground outline-none focus:border-primary"
        value={value}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:border-primary">
      <Search size={16} className="text-muted-foreground" />
      <input
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-10 shrink-0 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-md border border-border bg-background p-1">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={`h-7 rounded px-2 text-xs ${value === option ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function DataState({
  loading,
  error,
  empty,
  children,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (loading) return <Notice>Loading</Notice>;
  if (error) return <Notice>{error}</Notice>;
  if (empty) return <Notice>No results</Notice>;
  return <>{children}</>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{children}</p>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">{children}</span>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusMetric({ label, ok }: { label: string; ok?: boolean }) {
  return <Metric label={label} value={ok ? "OK" : "Needs config"} />;
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">{children}</main>
  );
}

const root = document.getElementById("root");

if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);
