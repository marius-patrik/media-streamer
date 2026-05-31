import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Folder, Server, Volume2, Cloud, Search, Info, X, 
  Tv, Film, Copy, Check, HardDrive, RefreshCw, Star, Sparkles, Key, ListMusic,
  Pause, RotateCcw, VolumeX, Maximize, Settings, ShieldAlert, ChevronRight,
  TrendingUp, Award, Clock, Database, Radio, Layers
} from 'lucide-react';
import './App.css';

interface MediaFile {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: MediaFile[];
}

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

  // Cloud & TMDB states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTv, setTrendingTv] = useState<any[]>([]);
  const [heroMovie, setHeroMovie] = useState<any>(null);

  // Immersive Details Overlay state
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Active Playback Overlay Player states
  const [activePlayPath, setActivePlayPath] = useState<string | null>(null);
  const [activePlayName, setActivePlayName] = useState('');
  const [activeCloudItem, setActiveCloudItem] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<'su' | 'to'>('su');
  
  // Custom video controller states
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bufferProgress, setBufferProgress] = useState(35); // Simulated live network buffer progress

  // Season / Episode TV selection
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // Transcode states
  const [shouldTranscode, setShouldTranscode] = useState(true);
  const [downmixMode, setDownmixMode] = useState<'stereo' | 'mono' | '5.1' | 'bypass'>('stereo');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Dynamic dominant backlight color state
  const [glowColor, setGlowColor] = useState('rgba(139, 92, 246, 0.35)');
  const [richLocalCards, setRichLocalCards] = useState<any[]>([]);

  // Local storage for watch history
  const [watchProgress, setWatchProgress] = useState<Record<string, number>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    fetchLocalLibrary();
    // Load watch progress from localStorage
    const saved = localStorage.getItem('tailstreamer_watch_progress');
    if (saved) {
      try {
        setWatchProgress(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    if (tmdbKey) {
      fetchTrendingContent();
    }
  }, [tmdbKey]);

  useEffect(() => {
    if (localMedia.length > 0 && tmdbKey) {
      buildRichLocalCards();
    }
  }, [localMedia, tmdbKey]);

  // Update watch history in state and local storage
  const updateWatchProgress = (mediaId: string, time: number, total: number) => {
    if (!total || total <= 0) return;
    const pct = Math.min((time / total) * 100, 100);
    const updated = { ...watchProgress, [mediaId]: pct };
    setWatchProgress(updated);
    localStorage.setItem('tailstreamer_watch_progress', JSON.stringify(updated));
  };

  // Canvas-based client-side dominant color extraction for ambient glow!
  const updateAmbientGlow = (posterPath: string | null) => {
    if (!posterPath) {
      setGlowColor('rgba(139, 92, 246, 0.35)');
      return;
    }
    const imgUrl = `https://image.tmdb.org/t/p/w92${posterPath}`;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 5;
      canvas.height = 5;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 5, 5);
        const data = ctx.getImageData(0, 0, 5, 5).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i+1];
          b += data[i+2];
        }
        const count = data.length / 4;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // amplify color vibrancy for standard glow look
        setGlowColor(`rgba(${r}, ${g}, ${b}, 0.38)`);
      }
    };
    img.onerror = () => {
      setGlowColor('rgba(139, 92, 246, 0.35)');
    };
    img.src = imgUrl;
  };

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
        updateAmbientGlow(movieData.results[0].poster_path);
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
    updateAmbientGlow(item.poster_path);
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
    setActiveCloudItem(item);
    setActivePlayPath(null);
    if (item.media_type === 'tv' || (!item.media_type && item.name)) {
      loadTvEpisodes(item.id);
    }
  };

  const launchLocalPlayer = (path: string, name: string) => {
    setActivePlayPath(path);
    setActivePlayName(name);
    setActiveCloudItem(null);
    setIsPlaying(true);
    setCurrentTime(0);
    
    // Simulate initial buffering values
    setBufferProgress(12);
    const interval = setInterval(() => {
      setBufferProgress(prev => {
        if (prev >= 98) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 800);
  };

  const copyVlcLink = () => {
    if (!activePlayPath) return;
    const fullUrl = `${window.location.protocol}//${window.location.host}/stream/${encodeURIComponent(activePlayPath)}?transcode=false`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const findLocalMatch = (title: string): any | null => {
    if (!title) return null;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTitle = normalize(title);
    return richLocalCards.find(c => normalize(c.title || c.name).includes(cleanTitle)) || null;
  };

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

  // Custom Video Player Controls Hooks
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    updateWatchProgress(activePlayPath || activePlayName, curr, duration);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    
    // Auto-resume checking
    const prevProgress = watchProgress[activePlayPath || activePlayName];
    if (prevProgress && prevProgress < 95) {
      const targetTime = (prevProgress / 100) * videoRef.current.duration;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveApiKey = () => {
    if (keyInput.trim()) {
      localStorage.setItem('tmdb_api_key', keyInput.trim());
      setTmdbKey(keyInput.trim());
      setShowKeyModal(false);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('tmdb_api_key');
    setTmdbKey('');
    setShowKeyModal(false);
  };

  return (
    <div 
      className="min-h-screen text-slate-100 pb-24 select-none relative flex flex-row" 
      style={{ '--color-glow-color': glowColor } as React.CSSProperties}
    >
      {/* Canvas-backed Ambient Backlight Glow Layer */}
      <div className="ambient-glow-layer"></div>

      {/* Dynamic Modern Sidebar Navigation (Cineby style layout) */}
      <aside className="w-[280px] bg-slate-950/80 border-r border-white/5 backdrop-blur-3xl p-8 flex flex-col justify-between sticky top-0 h-screen z-[100] flex-shrink-0">
        <div className="flex flex-col gap-10">
          <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent cursor-pointer">
            <Play className="w-8 h-8 text-violet-500 fill-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            <span>TailStreamer</span>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Navigation</div>
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'all' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>All Media Catalog</span>
            </button>
            <button 
              onClick={() => setActiveFilter('local')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'local' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Available Lossless</span>
            </button>
            <button 
              onClick={() => setActiveFilter('cloud')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'cloud' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Cloud Only</span>
            </button>
            <button 
              onClick={() => setActiveFilter('movies')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'movies' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Film className="w-4 h-4 text-amber-400" />
              <span>Movies Stream</span>
            </button>
            <button 
              onClick={() => setActiveFilter('tv')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'tv' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Tv className="w-4 h-4 text-pink-400" />
              <span>TV Series</span>
            </button>
          </nav>
        </div>

        {/* User / Setup Profile */}
        <div className="flex flex-col gap-4">
          {tmdbKey ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Database className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">Storage Node</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold truncate">Connected: s001 Server</span>
            </div>
          ) : null}

          <button 
            onClick={() => {
              setKeyInput(tmdbKey);
              setShowKeyModal(true);
            }}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-xs border transition-all duration-200 ${tmdbKey ? 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/5' : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white animate-pulse shadow-lg shadow-amber-600/20'}`}
          >
            <Key className="w-4 h-4" /> {tmdbKey ? "Manage TMDb Config" : "Setup TMDb Key"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Modern Header Row */}
        <header className="flex justify-between items-center px-12 py-6 border-b border-white/5 bg-slate-950/20 backdrop-blur-lg sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              {activeFilter === 'all' && '✨ Global Stream Space'}
              {activeFilter === 'local' && '📂 Lossless Local Library'}
              {activeFilter === 'cloud' && '☁️ Cloud Streaming Cloud'}
              {activeFilter === 'movies' && '🎬 Cinema Movie Blockbusters'}
              {activeFilter === 'tv' && '📺 HD TV Shows & Series'}
            </span>
          </div>

          {/* Search bar */}
          <div className="w-[450px] flex bg-white/5 border border-white/10 rounded-full py-1.5 px-4 items-center focus-within:border-violet-500 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search movies, TV shows, and series..."
              className="flex-1 bg-transparent border-none text-white outline-none px-3 py-1 font-semibold text-xs"
            />
            <button 
              onClick={handleSearch}
              className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black px-4 py-1.5 rounded-full transition-all border border-white/10"
            >
              Search
            </button>
          </div>
        </header>

        {/* Main Grid View */}
        <main className="flex-1 px-12 py-10">
          
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
              
              {/* Premium IMAX Hero Banner */}
              {heroMovie && activeFilter === 'all' && (
                <div 
                  className="relative h-[480px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex items-end p-16 bg-cover bg-center transition-all duration-500"
                  style={{ backgroundImage: `linear-gradient(to top, rgba(2,1,6,1) 10%, rgba(2,1,6,0.3) 60%, transparent), url(https://image.tmdb.org/t/p/original${heroMovie.backdrop_path})` }}
                >
                  <div className="max-w-2xl relative z-10">
                    <div className="flex gap-2.5 items-center mb-4">
                      <span className="bg-violet-600/30 text-violet-300 border border-violet-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Featured blockbuster</span>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-300" /> {heroMovie.vote_average.toFixed(1)}</span>
                    </div>
                    <h1 className="text-5xl font-black mb-4 tracking-tight leading-none hero-text-glow">{heroMovie.title || heroMovie.name}</h1>
                    <p className="text-slate-300 text-sm line-clamp-3 mb-8 leading-relaxed font-medium">{heroMovie.overview}</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => launchCloudPlayer(heroMovie)}
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black px-8 py-3.5 rounded-full flex items-center gap-2 shadow-xl shadow-violet-500/30 transition-all hover:scale-105 text-xs"
                      >
                        <Play className="w-4 h-4 fill-white" /> Watch Now
                      </button>
                      <button 
                        onClick={() => loadMediaDetails(heroMovie)}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold px-6 py-3.5 rounded-full transition-all flex items-center gap-2 text-xs"
                      >
                        <Info className="w-4 h-4" /> More Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 tracking-tight text-violet-400">Search Results</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {searchResults.map((item, idx) => (
                      <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} watchProgress={watchProgress} />
                    ))}
                  </div>
                </div>
              )}

              {/* Unified Catalog Shelves */}
              <div className="flex flex-col gap-12">
                
                {/* Local Media Shelf */}
                {(activeFilter === 'all' || activeFilter === 'local') && richLocalCards.length > 0 && (
                  <div>
                    <h3 className="font-black text-xl mb-6 flex items-center gap-2.5 tracking-tight text-emerald-400">
                      <Server className="w-5 h-5 animate-pulse" />
                      Lossless Audio Tracks (On Local HDD Array)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {richLocalCards.map((item, idx) => (
                        <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} watchProgress={watchProgress} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Movies Shelf */}
                {(activeFilter === 'all' || activeFilter === 'cloud' || activeFilter === 'movies') && (
                  <div>
                    <h3 className="font-black text-xl mb-6 flex items-center gap-2.5 tracking-tight">
                      <Film className="w-5 h-5 text-violet-400" />
                      Trending Blockbuster Cinema
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {trendingMovies
                        .filter(m => activeFilter === 'cloud' ? !findLocalMatch(m.title) : true)
                        .slice(0, 12)
                        .map((item, idx) => (
                          <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} watchProgress={watchProgress} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Popular TV Shows Shelf */}
                {(activeFilter === 'all' || activeFilter === 'cloud' || activeFilter === 'tv') && (
                  <div>
                    <h3 className="font-black text-xl mb-6 flex items-center gap-2.5 tracking-tight">
                      <Tv className="w-5 h-5 text-fuchsia-400" />
                      Popular TV Series Stream
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {trendingTv
                        .filter(t => activeFilter === 'cloud' ? !findLocalMatch(t.name) : true)
                        .slice(0, 12)
                        .map((item, idx) => (
                          <MediaCard key={idx} item={item} onSelect={loadMediaDetails} localCheck={findLocalMatch} watchProgress={watchProgress} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

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

              <p className="text-xs text-slate-400 leading-relaxed font-medium">
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

      {/* CLOUD & LOSSLESS LOCAL IMMERSIVE FULL-SCREEN PLAYER (NETFLIX PARITY) */}
      <AnimatePresence>
        {(activePlayPath || activeCloudItem) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[1000] flex justify-center items-center overflow-hidden"
          >
            {/* Custom Interactive Player Interface Overlay */}
            <div className="relative w-full h-full flex items-center justify-center group">
              {activePlayPath ? (
                <video 
                  ref={videoRef}
                  key={activePlayPath}
                  autoPlay 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="w-full h-full object-contain"
                >
                  <source src={`/stream/${encodeURIComponent(activePlayPath)}?transcode=${shouldTranscode}`} type="video/mp4" />
                  Your browser does not support direct video streaming.
                </video>
              ) : (
                <iframe 
                  src={
                    activeCloudItem.media_type === 'tv' || (!activeCloudItem.media_type && activeCloudItem.name)
                      ? (activeProvider === 'su' 
                          ? `https://embed.su/embed/tv/${activeCloudItem.id}/${selectedSeason}/${selectedEpisode}`
                          : `https://vidsrc.to/embed/tv/${activeCloudItem.id}/${selectedSeason}/${selectedEpisode}`)
                      : (activeProvider === 'su'
                          ? `https://embed.su/embed/movie/${activeCloudItem.id}`
                          : `https://vidsrc.to/embed/movie/${activeCloudItem.id}`)
                  }
                  allowFullScreen
                  className="w-full h-full border-none"
                ></iframe>
              )}

              {/* Highly Polished Overlay Controller (Appears on hover or movement, matching Netflix FE) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-8 z-50">
                {/* Top Control Bar */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest animate-pulse">Live Transcoder Stream</span>
                      {activePlayPath && (
                        <span className="bg-white/10 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded border border-white/5">Buffer Rate: {(bufferProgress < 100) ? `${Math.floor(Math.random() * 4) + 1} MB/s` : 'Stable'}</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black">{activePlayName || (activeCloudItem ? activeCloudItem.title || activeCloudItem.name : "")}</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setActivePlayPath(null);
                      setActiveCloudItem(null);
                    }}
                    className="p-3 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-full border border-white/5 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Bottom Control Bar */}
                <div className="flex flex-col gap-6">
                  {/* Custom progress seek bar (only for local video) */}
                  {activePlayPath && (
                    <div className="flex flex-col gap-2">
                      {/* Live Network Buffer Visualizer */}
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-white/20 absolute left-0 top-0 transition-all duration-300"
                          style={{ width: `${bufferProgress}%` }}
                        ></div>
                        <div 
                          className="h-full bg-violet-600 absolute left-0 top-0"
                          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <div className="flex items-center gap-1.5 text-violet-400">
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Streaming tailscale://s001:8080 (Buffer Health: {bufferProgress === 100 ? '100% Loaded' : `${bufferProgress}% caching`})</span>
                        </div>
                        <span>{formatTime(duration)}</span>
                      </div>

                      <input 
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full custom-seekbar"
                      />
                    </div>
                  )}

                  {/* Overlaid player controls */}
                  <div className="flex justify-between items-center bg-slate-950/80 backdrop-blur-2xl p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-6">
                      {activePlayPath ? (
                        <>
                          <button onClick={handlePlayPause} className="text-white hover:text-violet-400 transition bg-white/5 hover:bg-white/10 p-3 rounded-full border border-white/5">
                            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                          </button>
                          
                          {/* Volume controls */}
                          <div className="flex items-center gap-3">
                            <button onClick={handleMuteToggle} className="text-slate-300 hover:text-white transition">
                              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <input 
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-24 custom-seekbar animate-none"
                            />
                          </div>

                          {/* Dynamic Audio Downmix options selector */}
                          <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                            <button 
                              onClick={() => setDownmixMode('stereo')}
                              className={`px-3 py-1.5 rounded-full font-bold text-[9px] uppercase transition-all ${downmixMode === 'stereo' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                              Stereo AAC
                            </button>
                            <button 
                              onClick={() => setDownmixMode('mono')}
                              className={`px-3 py-1.5 rounded-full font-bold text-[9px] uppercase transition-all ${downmixMode === 'mono' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                              Mono mix
                            </button>
                            <button 
                              onClick={() => setDownmixMode('5.1')}
                              className={`px-3 py-1.5 rounded-full font-bold text-[9px] uppercase transition-all ${downmixMode === '5.1' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                              5.1 mix
                            </button>
                          </div>

                          {/* Audio Transcode controls */}
                          <button 
                            onClick={() => setShouldTranscode(!shouldTranscode)}
                            className={`px-4 py-2 rounded-full font-bold text-[10px] border transition-all ${shouldTranscode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-400 border-white/10'}`}
                          >
                            FFmpeg Server Transcode: {shouldTranscode ? "AAC Auto-Transcode" : "Raw Direct stream"}
                          </button>
                          
                          <button 
                            onClick={copyVlcLink}
                            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 font-bold text-[10px] hover:bg-white/10 transition flex items-center gap-1.5 text-slate-200"
                          >
                            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy VLC Link
                          </button>
                        </>
                      ) : (
                        <div className="flex gap-4">
                          {/* Cloud Node toggles */}
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mr-2"><Server className="w-4 h-4 text-violet-400" /> Server Mirror Node Selector:</span>
                          <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                            <button 
                              onClick={() => setActiveProvider('su')}
                              className={`px-4 py-1.5 rounded-full font-bold text-[9px] uppercase transition-all ${activeProvider === 'su' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                              embed.su (High Speed)
                            </button>
                            <button 
                              onClick={() => setActiveProvider('to')}
                              className={`px-4 py-1.5 rounded-full font-bold text-[9px] uppercase transition-all ${activeProvider === 'to' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                              vidsrc.to (Backup Mirror)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN IMMERSIVE INFO DRAWER (NETFLIX DETAILS PAGE PARITY) */}
      <AnimatePresence>
        {selectedDetailItem && (
          <motion.div 
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="fixed top-0 right-0 h-screen w-[580px] bg-slate-950/98 z-[900] border-l border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {/* Split Info Catalog Detail Grid */}
            <div className="flex flex-col">
              {/* Immersive Widescreen Backdrop Banner */}
              <div 
                className="w-full h-[320px] bg-cover bg-center relative border-b border-white/5"
                style={{ backgroundImage: `linear-gradient(to top, rgba(2,1,6,1) 15%, transparent), url(https://image.tmdb.org/t/p/original${selectedDetailItem.backdrop_path})` }}
              >
                <button 
                  onClick={() => setSelectedDetailItem(null)}
                  className="absolute top-6 right-6 p-2.5 bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex flex-col gap-6">
                <div>
                  <div className="flex gap-2.5 items-center mb-3">
                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-amber-400" /> {selectedDetailItem.vote_average ? selectedDetailItem.vote_average.toFixed(1) : "N/A"}</span>
                    <span className="text-[10px] text-slate-400 font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full">{(selectedDetailItem.release_date || selectedDetailItem.first_air_date || '').substring(0, 4)}</span>
                    {findLocalMatch(selectedDetailItem.title || selectedDetailItem.name) && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-lg shadow-emerald-500/5">
                        <Server className="w-3.5 h-3.5" /> Lossless Local
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight hero-text-glow">{selectedDetailItem.title || selectedDetailItem.name}</h2>
                </div>

                <div>
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Overview</h4>
                  <p className="text-slate-300 text-xs leading-relaxed font-medium">{selectedDetailItem.overview}</p>
                </div>

                {/* Cast / Credits section */}
                {credits && credits.cast && (
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Starring Cast</h4>
                    <div className="flex flex-wrap gap-2">
                      {credits.cast.slice(0, 8).map((actor: any, idx: number) => (
                        <span key={idx} className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
                          {actor.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Local HDD Playlist Directory Inspector (Infuse/Plex Inspired) */}
            <div className="p-8 border-t border-white/5 bg-slate-900/30">
              {findLocalMatch(selectedDetailItem.title || selectedDetailItem.name) ? (
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 border-emerald-500/20 shadow-2xl">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <strong className="text-sm text-emerald-400 block font-bold">Storage Array Online</strong>
                      <span className="text-xs text-slate-400 font-medium">Select any high fidelity file below to begin immediate streaming.</span>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-emerald-500/10 pt-4">
                    <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><ListMusic className="w-4 h-4 text-emerald-400" /> Storage Array Files</h5>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                      {getFilesList(findLocalMatch(selectedDetailItem.title || selectedDetailItem.name).local_item_ref).map((file, idx) => {
                        const progress = watchProgress[file.path || file.name];
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              launchLocalPlayer(file.path, file.name);
                              setSelectedDetailItem(null);
                            }}
                            className="bg-slate-950 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/30 p-3.5 rounded-xl flex flex-col gap-2 cursor-pointer transition-all duration-200"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-200 truncate pr-4">{file.name}</span>
                              <span className="text-[10px] text-slate-500 font-bold flex-shrink-0">{(file.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB</span>
                            </div>
                            {progress ? (
                              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600" style={{ width: `${progress}%` }}></div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5 justify-between">
                  <div className="flex items-start gap-3 text-amber-400">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-sm font-bold block">Aggregator Streaming Mode</strong>
                      <span className="text-xs text-slate-400 leading-relaxed block mt-1">This catalog media is currently not saved on local array. Direct stream from secure cloud aggregators.</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      launchCloudPlayer(selectedDetailItem);
                      setSelectedDetailItem(null);
                    }}
                    className="w-full py-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-violet-500/25 transition-all hover:scale-102"
                  >
                    <Play className="w-5 h-5 fill-white animate-pulse" /> Watch Secure Cloud Mirror
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Media Card Component (TMDb grid element with elegant Cineby style popover features)
function MediaCard({ item, onSelect, localCheck, watchProgress }: { item: any, onSelect: (x: any) => void, localCheck: (x: string) => any, watchProgress: Record<string, number> }) {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').substring(0, 4);
  const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null;
  const localMatch = localCheck(title);
  
  // Find any child file progress to overlay
  let progress = 0;
  if (localMatch && localMatch.local_item_ref) {
    if (localMatch.local_item_ref.type === 'file') {
      progress = watchProgress[localMatch.local_item_ref.path || localMatch.local_item_ref.name] || 0;
    } else if (localMatch.local_item_ref.children) {
      // Find maximum progress of any children
      const getProgress = (node: any): number => {
        if (node.type === 'file') {
          return watchProgress[node.path || node.name] || 0;
        } else if (node.children) {
          return Math.max(...node.children.map(getProgress));
        }
        return 0;
      };
      progress = getProgress(localMatch.local_item_ref);
    }
  }

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={() => onSelect(item)}
      className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden cursor-pointer relative group transition-all duration-300 hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/10 poster-zoom movie-card-hover flex flex-col justify-between"
    >
      <div className="relative overflow-hidden aspect-[2/3]">
        {posterPath ? (
          <img src={posterPath} alt={title} className="w-full h-full object-cover bg-slate-900 group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-slate-900 flex flex-col justify-center items-center text-slate-400 gap-2">
            <Film className="w-8 h-8 text-slate-600" />
            <span className="text-[10px]">No Poster</span>
          </div>
        )}
        
        {localMatch && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-0.5 shadow-lg shadow-emerald-500/25 z-10">
            <Check className="w-2.5 h-2.5" /> Lossless
          </div>
        )}

        {/* Hover Action Popover Overlay (Netflix Style) */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-2.5 z-10">
          <div className="flex gap-2">
            <button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-2 rounded-full hover:scale-110 transition shadow-lg shadow-violet-500/20">
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
            <button className="bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition">
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-violet-400">{item.vote_average ? `${item.vote_average.toFixed(1)} Rating` : 'New'}</span>
              <span className="text-[9px] text-slate-400 font-semibold">• {year ? year : 'N/A'}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5 inline-block">{item.media_type ? item.media_type.toUpperCase() : "TV"}</span>
          </div>
        </div>

        {/* Stored Watch Progress Bar Overlay */}
        {progress > 0 && progress < 98 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
            <div className="h-full bg-violet-600" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h4 className="font-bold text-xs truncate text-slate-100 group-hover:text-violet-400 transition-colors" title={title}>{title}</h4>
        <span className="text-[10px] text-slate-400 font-semibold">{year ? year : 'N/A'} • {item.media_type ? item.media_type.toUpperCase() : "TV"}</span>
      </div>
    </motion.div>
  );
}
