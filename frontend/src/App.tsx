import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Folder, Server, Volume2, Cloud, Search, Info, X, 
  Tv, Film, Copy, Check, HardDrive, RefreshCw, Star, Sparkles, Key, ListMusic
} from 'lucide-react';
import './App.css';

// TMDb Free Read-Only Key
const TMDB_API_KEY = "8414aa8e05cc1c062c3e5d0db2972986";

interface MediaFile {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: MediaFile[];
}

// TMDb Mapping for Local Folders to display professional posters & metadata
const LOCAL_METADATA_MAP: Record<string, { id: number, type: 'movie' | 'tv', title: string }> = {
  "andromeda": { id: 1107, type: 'tv', title: "Gene Roddenberry's Andromeda" },
  "blakes7": { id: 4544, type: 'tv', title: "Blake's 7" },
  "macgyver": { id: 2407, type: 'tv', title: "MacGyver" },
  "stargate": { id: 307, type: 'tv', title: "Stargate Atlantis" },
  "the.fifth.element.1997.mkv": { id: 18, type: 'movie', title: "The Fifth Element" }
};

export default function App() {
  const [localMedia, setLocalMedia] = useState<MediaFile[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'local' | 'cloud' | 'movies' | 'tv'>('all');
  
  // TMDb API Key state
  const [tmdbKey, setTmdbKey] = useState<string>(() => localStorage.getItem('tmdb_api_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Cloud & TMDB catalog states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTv, setTrendingTv] = useState<any[]>([]);
  const [heroMovie, setHeroMovie] = useState<any>(null);
  
  // Detailed Modal/Theater Player states
  const [activeModalItem, setActiveModalItem] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<'su' | 'to'>('su');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  // Stream parameters
  const [shouldTranscode, setShouldTranscode] = useState(true);
  const [currentLocalPlayPath, setCurrentLocalPlayPath] = useState<string | null>(null);
  const [currentLocalPlayName, setCurrentLocalPlayName] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Immersive Details Drawer state
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Rich metadata for local cards
  const [richLocalCards, setRichLocalCards] = useState<any[]>([]);

  useEffect(() => {
    fetchLocalLibrary();
    if (tmdbKey) {
      fetchTrendingContent();
    }
  }, [tmdbKey]);

  // Once local folders and TMDb key are loaded, build rich catalog cards for local items!
  useEffect(() => {
    if (localMedia.length > 0 && tmdbKey) {
      buildRichLocalCards();
    }
  }, [localMedia, tmdbKey]);

  const fetchLocalLibrary = async () => {
    setLocalLoading(true);
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocalMedia(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLocalLoading(false);
  };

  const fetchTrendingContent = async () => {
    if (!tmdbKey) return;
    try {
      const movieRes = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbKey}`);
      const movieData = await movieRes.json();
      if (movieData.results && movieData.results.length > 0) {
        setTrendingMovies(movieData.results);
        setHeroMovie(movieData.results[0]);
      }

      const tvRes = await fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${tmdbKey}`);
      const tvData = await tvRes.json();
      if (tvData.results) {
        setTrendingTv(tvData.results);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const buildRichLocalCards = async () => {
    const cards: any[] = [];
    for (const item of localMedia) {
      const key = item.name.toLowerCase();
      const mapped = LOCAL_METADATA_MAP[key];
      if (mapped) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${mapped.type}/${mapped.id}?api_key=${tmdbKey}`);
          const data = await res.json();
          cards.push({
            ...data,
            media_type: mapped.type,
            is_local: true,
            local_item_ref: item
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    setRichLocalCards(cards);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !tmdbKey) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results.filter((x: any) => x.media_type === 'movie' || x.media_type === 'tv'));
      }
    } catch (e) {
      console.error(e);
    }
    setSearchLoading(false);
  };

  const loadMediaDetails = async (item: any) => {
    if (!tmdbKey) return;
    setSelectedDetailItem(item);
    setDetailLoading(true);
    try {
      const type = item.media_type || (item.name ? 'tv' : 'movie');
      const creditsRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}/credits?api_key=${tmdbKey}`);
      const creditsData = await creditsRes.json();
      setCredits(creditsData);
    } catch (e) {
      console.error(e);
    }
    setDetailLoading(false);
  };

  const loadTvEpisodes = async (tmdbId: number) => {
    if (!tmdbKey) return;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}`);
      const data = await res.json();
      if (data.seasons) {
        const filteredSeasons = data.seasons.filter((s: any) => s.season_number > 0);
        setSeasons(filteredSeasons);
        if (filteredSeasons.length > 0) {
          setSelectedSeason(filteredSeasons[0].season_number);
          fetchEpisodes(tmdbId, filteredSeasons[0].season_number);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEpisodes = async (tmdbId: number, seasonNum: number) => {
    if (!tmdbKey) return;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${tmdbKey}`);
      const data = await res.json();
      if (data.episodes) {
        setEpisodes(data.episodes);
        setSelectedEpisode(data.episodes[0].episode_number);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const launchCloudPlayer = (item: any) => {
    setActiveModalItem(item);
    setCurrentLocalPlayPath(null);
    if (item.media_type === 'tv' || (!item.media_type && item.name)) {
      loadTvEpisodes(item.id);
    }
  };

  const launchLocalPlayer = (path: string, name: string) => {
    setCurrentLocalPlayPath(path);
    setCurrentLocalPlayName(name);
    setActiveModalItem(selectedDetailItem || { title: name, media_type: 'movie' });
  };

  const copyVlcLink = () => {
    if (!currentLocalPlayPath) return;
    const fullUrl = `${window.location.protocol}//${window.location.host}/stream/${encodeURIComponent(currentLocalPlayPath)}?transcode=false`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const saveApiKey = () => {
    const cleanKey = keyInput.trim();
    if (cleanKey) {
      localStorage.setItem('tmdb_api_key', cleanKey);
      setTmdbKey(cleanKey);
      setShowKeyModal(false);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('tmdb_api_key');
    setTmdbKey('');
    setTrendingMovies([]);
    setTrendingTv([]);
    setHeroMovie(null);
    setSearchResults([]);
    setRichLocalCards([]);
  };

  const findLocalMatch = (title: string): any | null => {
    if (!title) return null;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTitle = normalize(title);
    return richLocalCards.find(c => normalize(c.title || c.name).includes(cleanTitle)) || null;
  };

  // Recursively extract all video files inside a directory to display as list/playlist!
  const getFilesList = (item: MediaFile): MediaFile[] => {
    const files: MediaFile[] = [];
    const recurse = (node: MediaFile) => {
      if (node.type === 'file') {
        files.push(node);
      } else if (node.children) {
        node.children.forEach(recurse);
      }
    };
    recurse(item);
    return files;
  };

  return (
    <div className="min-h-screen text-slate-100 pb-24 select-none relative backdrop-blur-overlay">
      {/* Premium Sticky Header */}
      <header className="flex justify-between items-center px-10 py-5 border-b border-white/5 bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-50 transition-all duration-300">
        <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent cursor-pointer">
          <Play className="w-8 h-8 text-violet-500 fill-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <span>TailStreamer</span>
        </div>

        {/* Global Filter Pills */}
        <div className="flex bg-white/5 p-1.5 rounded-full border border-white/10 shadow-lg">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-300 ${activeFilter === 'all' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            ✨ All Media
          </button>
          <button 
            onClick={() => setActiveFilter('local')}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-300 ${activeFilter === 'local' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            📂 Available Lossless
          </button>
          <button 
            onClick={() => setActiveFilter('cloud')}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-300 ${activeFilter === 'cloud' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            ☁️ Cloud Only
          </button>
          <button 
            onClick={() => setActiveFilter('movies')}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-300 ${activeFilter === 'movies' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            🎬 Movies
          </button>
          <button 
            onClick={() => setActiveFilter('tv')}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-300 ${activeFilter === 'tv' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            📺 TV Shows
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setKeyInput(tmdbKey);
              setShowKeyModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs border transition-all hover:scale-105 duration-200 ${tmdbKey ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'}`}
          >
            <Key className="w-4 h-4" /> {tmdbKey ? "TMDb Connected" : "Connect TMDb"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-10 mt-8">
        
        {/* TMDb Connection Needed */}
        {!tmdbKey ? (
          <div className="glass-panel p-16 rounded-3xl text-center max-w-2xl mx-auto flex flex-col items-center gap-6 border-amber-500/20 shadow-2xl mt-12">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 animate-pulse">
              <Key className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black">TMDb Connection Required</h2>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Link your free TMDb API key to fetch high-definition media catalog details, trending carousels, and poster art.
            </p>
            <button 
              onClick={() => setShowKeyModal(true)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold px-8 py-3 rounded-full shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
            >
              Configure TMDb Key
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            
            {/* Immersive Widescreen IMAX Hero Banner */}
            {heroMovie && activeFilter === 'all' && (
              <div 
                className="relative h-[550px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex items-end p-16 bg-cover bg-center transition-all duration-500"
                style={{ backgroundImage: `linear-gradient(to top, rgba(3,1,8,1) 10%, rgba(3,1,8,0.3) 60%, transparent), url(https://image.tmdb.org/t/p/original${heroMovie.backdrop_path})` }}
              >
                <div className="max-w-2xl relative z-10">
                  <div className="flex gap-2.5 items-center mb-4">
                    <span className="bg-violet-600/30 text-violet-300 border border-violet-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Featured blockbuster</span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-300" /> {heroMovie.vote_average.toFixed(1)}</span>
                  </div>
                  <h1 className="text-6xl font-black mb-4 tracking-tight leading-none hero-text-glow">{heroMovie.title || heroMovie.name}</h1>
                  <p className="text-slate-300 text-sm line-clamp-3 mb-8 leading-relaxed font-medium">{heroMovie.overview}</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => launchCloudPlayer(heroMovie)}
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black px-10 py-4 rounded-full flex items-center gap-2.5 shadow-xl shadow-violet-500/30 transition-all hover:scale-105"
                    >
                      <Play className="w-5 h-5 fill-white" /> Watch Now
                    </button>
                    <button 
                      onClick={() => loadMediaDetails(heroMovie)}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold px-8 py-4 rounded-full transition-all flex items-center gap-2"
                    >
                      <Info className="w-5 h-5" /> More Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Search bar */}
            <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
              <div className="flex bg-white/5 border border-white/10 rounded-full p-2 items-center focus-within:border-violet-500 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all">
                <Search className="w-6 h-6 text-slate-400 ml-4" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search movies, TV shows, and series..."
                  className="flex-1 bg-transparent border-none text-white outline-none px-4 py-3 font-semibold text-lg"
                />
                <button 
                  onClick={handleSearch}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black px-8 py-3 rounded-full transition-all shadow-md shadow-violet-500/20"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="font-extrabold text-2xl mb-6 flex items-center gap-2 tracking-tight">Search Results</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {searchResults.map((item, idx) => (
                    <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} />
                  ))}
                </div>
              </div>
            )}

            {/* Unifed Catalog Layout with Shelves */}
            <div className="flex flex-col gap-12">
              
              {/* Local Media Shelf */}
              {(activeFilter === 'all' || activeFilter === 'local') && richLocalCards.length > 0 && (
                <div>
                  <h3 className="font-black text-2xl mb-6 flex items-center gap-2.5 tracking-tight text-emerald-400">
                    <Server className="w-6 h-6" />
                    Available Locally (Lossless Audio)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {richLocalCards.map((item, idx) => (
                      <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} />
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Movies Shelf */}
              {(activeFilter === 'all' || activeFilter === 'cloud' || activeFilter === 'movies') && (
                <div>
                  <h3 className="font-black text-2xl mb-6 flex items-center gap-2.5 tracking-tight">
                    <Film className="w-6 h-6 text-violet-400" />
                    Trending Movies
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {trendingMovies
                      .filter(m => activeFilter === 'cloud' ? !findLocalMatch(m.title) : true)
                      .slice(0, 12)
                      .map((item, idx) => (
                        <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} />
                      ))}
                  </div>
                </div>
              )}

              {/* Popular TV Shows Shelf */}
              {(activeFilter === 'all' || activeFilter === 'cloud' || activeFilter === 'tv') && (
                <div>
                  <h3 className="font-black text-2xl mb-6 flex items-center gap-2.5 tracking-tight">
                    <Tv className="w-6 h-6 text-fuchsia-400" />
                    Popular TV Shows
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {trendingTv
                      .filter(t => activeFilter === 'cloud' ? !findLocalMatch(t.name) : true)
                      .slice(0, 12)
                      .map((item, idx) => (
                        <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* TMDb Config Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex justify-center items-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel max-w-lg w-full p-8 rounded-3xl flex flex-col gap-6 relative"
            >
              <button 
                onClick={() => setShowKeyModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-violet-500" />
                <h3 className="font-extrabold text-2xl">Configure TMDb API</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your personal, free API key from <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline font-semibold">TMDb</a> to unlock global media search, dynamic backdrops, and trending categories.
              </p>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">TMDb API Key (v3)</label>
                <input 
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste your 32-character TMDb API key here..."
                  className="bg-slate-900 border border-white/10 text-white px-4 py-3 rounded-xl font-medium outline-none focus:border-violet-500 transition-all text-sm"
                />
              </div>

              <div className="flex gap-4 justify-end mt-4">
                {tmdbKey && (
                  <button 
                    onClick={clearApiKey}
                    className="px-6 py-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition"
                  >
                    Disconnect Key
                  </button>
                )}
                <button 
                  onClick={saveApiKey}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold text-xs transition shadow-lg shadow-violet-500/20"
                >
                  Save API Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLOUD STREAM THEATER MODAL */}
      <AnimatePresence>
        {activeModalItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[1000] flex justify-center items-center p-4 md:p-8 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              className="max-w-[1200px] w-full flex flex-col gap-5"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <h2 className="text-3xl font-black tracking-tight text-slate-100">{activeModalItem.title || activeModalItem.name || currentLocalPlayName}</h2>
                  <span className="text-xs bg-violet-600/30 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-full font-extrabold uppercase">
                    {currentLocalPlayPath ? "Watching Local Lossless" : "Watching Cloud Mirror"}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setActiveModalItem(null);
                    setCurrentLocalPlayPath(null);
                  }}
                  className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full border border-white/10 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Player Frame */}
              <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative">
                {currentLocalPlayPath ? (
                  <video 
                    key={currentLocalPlayPath}
                    controls 
                    autoPlay 
                    className="w-full h-full"
                  >
                    <source src={`/stream/${encodeURIComponent(currentLocalPlayPath)}?transcode=${shouldTranscode}`} type="video/mp4" />
                    Your browser does not support native streaming.
                  </video>
                ) : (
                  <iframe 
                    src={
                      activeModalItem.media_type === 'tv' || (!activeModalItem.media_type && activeModalItem.name)
                        ? (activeProvider === 'su' 
                            ? `https://embed.su/embed/tv/${activeModalItem.id}/${selectedSeason}/${selectedEpisode}`
                            : `https://vidsrc.to/embed/tv/${activeModalItem.id}/${selectedSeason}/${selectedEpisode}`)
                        : (activeProvider === 'su'
                            ? `https://embed.su/embed/movie/${activeModalItem.id}`
                            : `https://vidsrc.to/embed/movie/${activeModalItem.id}`)
                    }
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                )}
              </div>

              {/* Controls, Metadata and Selector */}
              <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row justify-between gap-8 items-center">
                <div className="flex-1">
                  <p className="text-slate-300 text-sm leading-relaxed max-w-3xl font-medium">
                    {activeModalItem.overview || "High bitrate direct media stream from local HDD array."}
                  </p>
                  {currentLocalPlayPath && (
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => setShouldTranscode(!shouldTranscode)}
                        className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 border transition-all ${shouldTranscode ? 'bg-violet-600/20 text-violet-300 border-violet-500/30' : 'bg-white/5 text-slate-400 border-white/10'}`}
                      >
                        <Volume2 className="w-4 h-4" /> Audio Transcoder: {shouldTranscode ? "ON" : "OFF"}
                      </button>
                      <button 
                        onClick={copyVlcLink}
                        className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-2 text-slate-200"
                      >
                        {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        Copy VLC Stream Link
                      </button>
                    </div>
                  )}
                </div>

                {!currentLocalPlayPath && (
                  <div className="flex flex-col gap-5 w-full md:w-80 flex-shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block mb-2">Mirror Node Server</span>
                      <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                        <button 
                          onClick={() => setActiveProvider('su')}
                          className={`flex-1 text-center py-2 rounded-full font-bold text-xs transition-all ${activeProvider === 'su' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          embed.su
                        </button>
                        <button 
                          onClick={() => setActiveProvider('to')}
                          className={`flex-1 text-center py-2 rounded-full font-bold text-xs transition-all ${activeProvider === 'to' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          vidsrc.to
                        </button>
                      </div>
                    </div>

                    {(activeModalItem.media_type === 'tv' || (!activeModalItem.media_type && activeModalItem.name)) && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block mb-2">Season</span>
                          <select 
                            value={selectedSeason} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setSelectedSeason(val);
                              fetchEpisodes(activeModalItem.id, val);
                            }}
                            className="w-full bg-slate-900 border border-white/10 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none cursor-pointer"
                          >
                            {seasons.map((s, idx) => (
                              <option key={idx} value={s.season_number}>Season {s.season_number}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block mb-2">Episode</span>
                          <select 
                            value={selectedEpisode} 
                            onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-white/10 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none cursor-pointer"
                          >
                            {episodes.map((e, idx) => (
                              <option key={idx} value={e.episode_number}>Ep {e.episode_number}: {e.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED INFO DRAWER (CINEBY DETAIL POPUP PARITY) WITH DYNAMIC LOCAL FILE LIST INSPECTOR */}
      <AnimatePresence>
        {selectedDetailItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[900] flex justify-end"
            onClick={() => setSelectedDetailItem(null)}
          >
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-[680px] h-full bg-slate-950 border-l border-white/10 shadow-2xl relative flex flex-col overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Backdrop Image Banner */}
              <div 
                className="h-80 w-full bg-cover bg-center relative flex-shrink-0"
                style={{ backgroundImage: `linear-gradient(to top, #020108, transparent), url(https://image.tmdb.org/t/p/original${selectedDetailItem.backdrop_path})` }}
              >
                <button 
                  onClick={() => setSelectedDetailItem(null)}
                  className="absolute top-6 right-6 p-2 bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Detail Info */}
              <div className="p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
                <div>
                  <div className="flex gap-2 items-center mb-3">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400" /> {selectedDetailItem.vote_average ? selectedDetailItem.vote_average.toFixed(1) : "N/A"}</span>
                    <span className="text-xs text-slate-400 font-bold">{(selectedDetailItem.release_date || selectedDetailItem.first_air_date || '').substring(0, 4)}</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">{selectedDetailItem.title || selectedDetailItem.name}</h2>
                </div>

                <div>
                  <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Overview</h4>
                  <p className="text-slate-300 text-sm leading-relaxed font-medium">{selectedDetailItem.overview}</p>
                </div>

                {/* Local matching indicator & Interactive File Inspector */}
                {findLocalMatch(selectedDetailItem.title || selectedDetailItem.name) && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-sm text-emerald-400 block font-bold">Connected to Local Storage Array</strong>
                        <span className="text-xs text-slate-400 font-medium">Select any lossless file below to play instantly with custom AAC audio.</span>
                      </div>
                    </div>

                    <div className="mt-2 border-t border-emerald-500/10 pt-4">
                      <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><ListMusic className="w-4 h-4 text-emerald-400" /> Local Playlist Directory</h5>
                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                        {getFilesList(findLocalMatch(selectedDetailItem.title || selectedDetailItem.name).local_item_ref).map((file, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              launchLocalPlayer(file.path, file.name);
                              setSelectedDetailItem(null);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-white/5 p-3 rounded-xl flex justify-between items-center cursor-pointer transition-colors"
                          >
                            <span className="text-xs font-semibold text-slate-200 truncate pr-4">{file.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold flex-shrink-0">{(file.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cast / Credits section */}
                {credits && credits.cast && (
                  <div>
                    <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Starring Cast</h4>
                    <div className="flex flex-wrap gap-2">
                      {credits.cast.slice(0, 8).map((actor: any, idx: number) => (
                        <span key={idx} className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300">
                          {actor.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-8 border-t border-white/5">
                  <button 
                    onClick={() => {
                      launchCloudPlayer(selectedDetailItem);
                      setSelectedDetailItem(null);
                    }}
                    className="w-full py-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-500/25 transition-all hover:scale-102"
                  >
                    <Play className="w-5 h-5 fill-white" /> Watch Cloud Cinema (Aggregator)
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Media Card Component (TMDb grid element)
function MediaCard({ item, onSelect, localCheck }: { item: any, onSelect: (x: any) => void, localCheck: (x: string) => any }) {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').substring(0, 4);
  const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null;
  const localMatch = localCheck(title);

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={() => onSelect(item)}
      className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden cursor-pointer relative group transition-all duration-300 hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/10 poster-zoom"
    >
      {posterPath ? (
        <img src={posterPath} alt={title} className="w-full aspect-[2/3] object-cover bg-slate-900" />
      ) : (
        <div className="w-full aspect-[2/3] bg-slate-900 flex flex-col justify-center items-center text-slate-400 gap-2">
          <Film className="w-10 h-10 text-slate-600" />
          <span className="text-xs">No Poster</span>
        </div>
      )}
      
      {localMatch && (
        <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-0.5 shadow-lg shadow-emerald-500/25">
          <Check className="w-2.5 h-2.5" /> Lossless
        </div>
      )}

      <div className="p-4">
        <h4 className="font-bold text-sm truncate text-slate-100 group-hover:text-violet-400 transition-colors" title={title}>{title}</h4>
        <span className="text-[11px] text-slate-400 font-semibold">{year ? year : 'N/A'} • {item.media_type ? item.media_type.toUpperCase() : "TV"}</span>
      </div>
    </motion.div>
  );
}

// Sidebar Directory Tree File Node Component
function TreeItemNode({ item, onSelect, selectedItem }: { item: MediaFile, onSelect: (x: MediaFile) => void, selectedItem: MediaFile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedItem && selectedItem.path === item.path;

  if (item.type === 'directory') {
    return (
      <li className="tree-item">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm font-semibold"
        >
          <Folder className={`w-4 h-4 text-amber-500 ${isOpen ? 'fill-amber-500' : ''}`} />
          <span>{item.name}</span>
        </div>
        {isOpen && item.children && (
          <ul className="pl-4 mt-1 border-l border-white/5 ml-4 space-y-1">
            {item.children.map((child, idx) => (
              <TreeItemNode 
                key={idx} 
                item={child} 
                onSelect={onSelect} 
                selectedItem={selectedItem} 
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className="tree-item">
      <div 
        onClick={() => onSelect(item)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all ${isSelected ? 'bg-gradient-to-r from-violet-600/20 to-transparent text-violet-300 border-l-2 border-violet-500' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      >
        <Film className={`w-4 h-4 ${isSelected ? 'text-violet-400' : 'text-blue-400'}`} />
        <span className="truncate">{item.name}</span>
      </div>
    </li>
  );
}
