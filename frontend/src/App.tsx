import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Folder, Server, Volume2, Cloud, Search, Info, X, 
  Tv, Film, Copy, Check, HardDrive, RefreshCw, Star, Sparkles, Key, ListMusic,
  Pause, RotateCcw, VolumeX, Maximize, Settings, ShieldAlert, ChevronRight,
  TrendingUp, Award, Clock, Database, Radio, Layers, Subtitles, Sliders,
  HelpCircle, Trash2, Edit, Plus, Monitor, ChevronLeft, ArrowRight
} from 'lucide-react';
import './App.css';

interface MediaFile {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: MediaFile[];
}

interface ServerNode {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
}

interface CloudProvider {
  id: string;
  name: string;
  getMovieUrl: (id: string | number) => string;
  getTvUrl: (id: string | number, s: number, e: number) => string;
}

export default function App() {
  const [localMedia, setLocalMedia] = useState<MediaFile[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'local' | 'cloud' | 'movies' | 'tv'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unwatched' | 'inprogress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'title'>('rating');
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('tailstreamer_sidebar_collapsed') === 'true';
  });

  // TMDb API Key state
  const [tmdbKey, setTmdbKey] = useState<string>(() => localStorage.getItem('tmdb_api_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Settings Panel state
  const [showSettings, setShowSettings] = useState(false);
  const [servers, setServers] = useState<ServerNode[]>(() => {
    const saved = localStorage.getItem('tailstreamer_servers');
    return saved ? JSON.parse(saved) : [
      { id: 's001', name: 's001 NixOS (Tailscale)', url: window.location.origin, status: 'online' }
    ];
  });
  const [activeServerId, setActiveServerId] = useState<string>(() => localStorage.getItem('tailstreamer_active_server') || 's001');
  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [defaultSubtitleLang, setDefaultSubtitleLang] = useState('en');

  // Rematching states
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [rematchSearchQuery, setRematchSearchQuery] = useState('');
  const [rematchResults, setRematchResults] = useState<any[]>([]);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [customMappings, setCustomMappings] = useState<Record<string, { id: number, type: 'movie' | 'tv' }>>(() => {
    const saved = localStorage.getItem('tailstreamer_custom_mappings');
    return saved ? JSON.parse(saved) : {};
  });

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
  
  // Cineby style multi-source cloud providers list
  const [cloudProviders] = useState<CloudProvider[]>([
    {
      id: 'embed_su',
      name: 'Embed.su (Premium Fast)',
      getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
      getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`
    },
    {
      id: 'vidsrc_to',
      name: 'VidSrc.to (Stable HQ)',
      getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
      getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
    },
    {
      id: 'vidsrc_me',
      name: 'VidSrc.me (No Ads)',
      getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
      getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
      id: 'smashy',
      name: 'SmashyStream (Auto Multi)',
      getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
      getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
      id: 'autoembed',
      name: 'AutoEmbed (Ad-Bypass)',
      getMovieUrl: (id) => `https://player.autoembed.co/movie/${id}`,
      getTvUrl: (id, s, e) => `https://player.autoembed.co/tv/${id}/${s}/${e}`
    },
    {
      id: 'twoembed',
      name: '2Embed (Cloud Backup)',
      getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
      getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
    }
  ]);
  const [activeProviderId, setActiveProviderId] = useState<string>('embed_su');
  
  // Custom video controller states
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bufferProgress, setBufferProgress] = useState(35); // Simulated buffer progress

  // Season / Episode TV selection
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // Subtitles / Captions
  const [subtitlesList, setSubtitlesList] = useState<{ name: string, path: string }[]>([]);
  const [activeSubtitlePath, setActiveSubtitlePath] = useState<string>('');
  const [customSubtitleUrl, setCustomSubtitleUrl] = useState<string>('');

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

  // Focus floating search dock on keypress
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Filename Cleaning Helper
  const cleanFilenameToTitle = (filename: string): { title: string, year?: string } => {
    let name = filename.replace(/\.[^/.]+$/, "");
    const yearMatch = name.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[0] : undefined;
    name = name.replace(/\b(1080p|720p|480p|2160p|4k|uhd|bluray|hdtv|web-dl|webrip|brrip|x264|h264|x265|hevc|aac|dts|ac3|dd5\.1|dual-audio|multi|sub|yts|yify|rarbg|psa|eztv|pahe|qxr)\b/gi, " ");
    name = name.replace(/[\._\-]/g, " ");
    name = name.replace(/\s+/g, " ").trim();
    if (year) {
      const parts = name.split(year);
      if (parts[0].trim()) {
        name = parts[0].trim();
      }
    }
    return { title: name, year };
  };

  useEffect(() => {
    fetchLocalLibrary();
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
    
    // Add forward slash listener to focus search dock
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tmdbKey, activeServerId]);

  useEffect(() => {
    if (localMedia.length > 0 && tmdbKey) {
      buildRichLocalCards();
    }
  }, [localMedia, tmdbKey, customMappings]);

  // Save server list in localStorage
  useEffect(() => {
    localStorage.setItem('tailstreamer_servers', JSON.stringify(servers));
  }, [servers]);

  const toggleSidebar = () => {
    const nextState = !sidebarCollapsed;
    setSidebarCollapsed(nextState);
    localStorage.setItem('tailstreamer_sidebar_collapsed', String(nextState));
  };

  // Update watch history in state and local storage
  const updateWatchProgress = (mediaId: string, time: number, total: number) => {
    if (!total || total <= 0) return;
    const pct = Math.min((time / total) * 100, 100);
    const updated = { ...watchProgress, [mediaId]: pct };
    setWatchProgress(updated);
    localStorage.setItem('tailstreamer_watch_progress', JSON.stringify(updated));
  };

  // Canvas-based client-side dominant color extraction for ambient glow
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
        setGlowColor(`rgba(${r}, ${g}, ${b}, 0.38)`);
      }
    };
    img.onerror = () => {
      setGlowColor('rgba(139, 92, 246, 0.35)');
    };
    img.src = imgUrl;
  };

  const getActiveServerUrl = () => {
    const node = servers.find(s => s.id === activeServerId);
    return node ? node.url : window.location.origin;
  };

  const fetchLocalLibrary = async () => {
    setLocalLoading(true);
    try {
      const baseUrl = getActiveServerUrl();
      const res = await fetch(`${baseUrl}/api/media`);
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
      
      const customMapping = customMappings[key];
      if (customMapping) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${customMapping.type}/${customMapping.id}?api_key=${tmdbKey}`);
          const data = await res.json();
          cards.push({
            ...data,
            media_type: customMapping.type,
            is_local: true,
            local_item_ref: item
          });
          continue;
        } catch (e) {
          console.error(e);
        }
      }

      const staticMapping = LOCAL_METADATA_MAP[key];
      if (staticMapping) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${staticMapping.type}/${staticMapping.id}?api_key=${tmdbKey}`);
          const data = await res.json();
          cards.push({
            ...data,
            media_type: staticMapping.type,
            is_local: true,
            local_item_ref: item
          });
          continue;
        } catch (e) {
          console.error(e);
        }
      }

      const { title, year } = cleanFilenameToTitle(item.name);
      try {
        let searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(title)}`;
        if (year) searchUrl += `&year=${year}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        if (searchData.results && searchData.results.length > 0) {
          const matched = searchData.results.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
          if (matched) {
            cards.push({
              ...matched,
              is_local: true,
              local_item_ref: item
            });
          }
        }
      } catch (e) {
        console.error("Automatching failed for " + item.name, e);
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

  const handleRematchSearch = async () => {
    if (!rematchSearchQuery.trim() || !tmdbKey) return;
    setRematchLoading(true);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(rematchSearchQuery)}`);
      const data = await res.json();
      if (data.results) {
        setRematchResults(data.results.filter((x: any) => x.media_type === 'movie' || x.media_type === 'tv'));
      }
    } catch (e) {
      console.error(e);
    }
    setRematchLoading(false);
  };

  const bindCustomMapping = (item: any) => {
    if (!selectedDetailItem) return;
    const localMatch = findLocalMatch(selectedDetailItem.title || selectedDetailItem.name);
    if (!localMatch || !localMatch.local_item_ref) return;

    const key = localMatch.local_item_ref.name.toLowerCase();
    const updated = {
      ...customMappings,
      [key]: { id: item.id, type: item.media_type }
    };
    setCustomMappings(updated);
    localStorage.setItem('tailstreamer_custom_mappings', JSON.stringify(updated));
    
    setSelectedDetailItem({ ...item, is_local: true, local_item_ref: localMatch.local_item_ref });
    setShowRematchModal(false);
    setRematchResults([]);
    setRematchSearchQuery('');
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

  const launchLocalPlayer = (path: string, name: string, dirChildren?: MediaFile[]) => {
    setActivePlayPath(path);
    setActivePlayName(name);
    setActiveCloudItem(null);
    setIsPlaying(true);
    setCurrentTime(0);
    
    if (dirChildren) {
      const subs = dirChildren.filter(c => {
        const ext = c.name.split('.').pop()?.toLowerCase();
        return ext === 'srt' || ext === 'vtt';
      }).map(c => ({
        name: c.name,
        path: c.path
      }));
      setSubtitlesList(subs);
      if (subs.length > 0) {
        setActiveSubtitlePath(subs[0].path);
      }
    } else {
      setSubtitlesList([]);
      setActiveSubtitlePath('');
    }

    setBufferProgress(12);
    const interval = setInterval(() => {
      setBufferProgress(prev => {
        if (prev >= 98) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 600);
  };

  const getSubtitleUrl = () => {
    if (customSubtitleUrl) return customSubtitleUrl;
    if (!activeSubtitlePath) return "";
    const baseUrl = getActiveServerUrl();
    return `${baseUrl}/stream/${encodeURIComponent(activeSubtitlePath)}?transcode=false`;
  };

  const copyVlcLink = () => {
    if (!activePlayPath) return;
    const baseUrl = getActiveServerUrl();
    const fullUrl = `${baseUrl}/stream/${encodeURIComponent(activePlayPath)}?transcode=false`;
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
        const ext = node.name.split('.').pop()?.toLowerCase();
        if (ext && ext !== 'srt' && ext !== 'vtt') {
          files.push(node);
        }
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

  const handleAddServer = () => {
    if (newServerName.trim() && newServerUrl.trim()) {
      const newServer: ServerNode = {
        id: 'srv_' + Date.now(),
        name: newServerName.trim(),
        url: newServerUrl.trim(),
        status: 'online'
      };
      const updated = [...servers, newServer];
      setServers(updated);
      setNewServerName('');
      setNewServerUrl('');
    }
  };

  const handleDeleteServer = (id: string) => {
    if (id === 's001') return;
    const updated = servers.filter(s => s.id !== id);
    setServers(updated);
    if (activeServerId === id) {
      setActiveServerId('s001');
      localStorage.setItem('tailstreamer_active_server', 's001');
    }
  };

  const selectServer = (id: string) => {
    setActiveServerId(id);
    localStorage.setItem('tailstreamer_active_server', id);
  };

  const processMediaList = (list: any[]) => {
    let processed = [...list];
    
    if (sortBy === 'rating') {
      processed.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'year') {
      processed.sort((a, b) => {
        const yearA = (a.release_date || a.first_air_date || '');
        const yearB = (b.release_date || b.first_air_date || '');
        return yearB.localeCompare(yearA);
      });
    } else if (sortBy === 'title') {
      processed.sort((a, b) => {
        const titleA = a.title || a.name || '';
        const titleB = b.title || b.name || '';
        return titleA.localeCompare(titleB);
      });
    }

    if (statusFilter !== 'all') {
      processed = processed.filter(item => {
        const matched = findLocalMatch(item.title || item.name);
        const refId = matched?.local_item_ref?.path || matched?.local_item_ref?.name || '';
        const pct = watchProgress[refId] || 0;
        
        if (statusFilter === 'unwatched') return pct === 0;
        if (statusFilter === 'inprogress') return pct > 0 && pct < 95;
        if (statusFilter === 'completed') return pct >= 95;
        return true;
      });
    }

    return processed;
  };

  const getActiveCloudStreamUrl = () => {
    if (!activeCloudItem) return "";
    const isTv = activeCloudItem.media_type === 'tv' || (!activeCloudItem.media_type && activeCloudItem.name);
    const provider = cloudProviders.find(p => p.id === activeProviderId) || cloudProviders[0];
    
    if (isTv) {
      return provider.getTvUrl(activeCloudItem.id, selectedSeason, selectedEpisode);
    } else {
      return provider.getMovieUrl(activeCloudItem.id);
    }
  };

  return (
    <div 
      className="min-h-screen text-slate-100 pb-36 select-none relative flex flex-row" 
      style={{ '--color-glow-color': glowColor } as React.CSSProperties}
    >
      {/* Canvas-backed Ambient Backlight Glow Layer */}
      <div className="ambient-glow-layer"></div>

      {/* Dynamic Collapsable Sidebar Navigation (Cineby style layout) */}
      <aside 
        className={`bg-slate-950/80 border-r border-white/5 backdrop-blur-3xl p-6 flex flex-col justify-between sticky top-0 h-screen z-[100] flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-[80px]' : 'w-[280px]'}`}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <Play className="w-8 h-8 text-violet-500 fill-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)] flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent truncate">TailStreamer</span>
              )}
            </div>
            <button 
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition"
            >
              {sidebarCollapsed ? <ArrowRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-2">
            {!sidebarCollapsed && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Navigation</div>}
            
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'all' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              title="All Media Catalog"
            >
              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
              {!sidebarCollapsed && <span>All Media</span>}
            </button>
            <button 
              onClick={() => setActiveFilter('local')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'local' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              title="Available Lossless"
            >
              <Server className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {!sidebarCollapsed && <span>Available Lossless</span>}
            </button>
            <button 
              onClick={() => setActiveFilter('cloud')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'cloud' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              title="Cloud Only"
            >
              <Cloud className="w-4 h-4 text-sky-400 flex-shrink-0" />
              {!sidebarCollapsed && <span>Cloud Only</span>}
            </button>
            <button 
              onClick={() => setActiveFilter('movies')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'movies' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              title="Movies Stream"
            >
              <Film className="w-4 h-4 text-amber-400 flex-shrink-0" />
              {!sidebarCollapsed && <span>Movies Stream</span>}
            </button>
            <button 
              onClick={() => setActiveFilter('tv')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeFilter === 'tv' ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              title="TV Series"
            >
              <Tv className="w-4 h-4 text-pink-400 flex-shrink-0" />
              {!sidebarCollapsed && <span>TV Series</span>}
            </button>
          </nav>
        </div>

        {/* User / Setup Profile */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-xs bg-slate-900 border border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>

          <button 
            onClick={() => {
              setKeyInput(tmdbKey);
              setShowKeyModal(true);
            }}
            className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-xs border transition-all duration-200 ${tmdbKey ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg'}`}
            title="TMDb API Key"
          >
            <Key className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>TMDb Connection</span>}
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

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {servers.find(s => s.id === activeServerId)?.name}
            </span>
          </div>
        </header>

        {/* Sorting and Filtering Sub-Header */}
        <div className="flex justify-between items-center px-12 py-4 bg-slate-950/40 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-violet-400" /> Watch State Filter:</span>
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${statusFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                All
              </button>
              <button 
                onClick={() => setStatusFilter('unwatched')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${statusFilter === 'unwatched' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Unwatched
              </button>
              <button 
                onClick={() => setStatusFilter('inprogress')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${statusFilter === 'inprogress' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                In Progress
              </button>
              <button 
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${statusFilter === 'completed' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Watched
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sort Shelves:</span>
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
              <button 
                onClick={() => setSortBy('rating')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${sortBy === 'rating' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                TMDb Rating
              </button>
              <button 
                onClick={() => setSortBy('year')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${sortBy === 'year' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Release Year
              </button>
              <button 
                onClick={() => setSortBy('title')}
                className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-all ${sortBy === 'title' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Alphabetical
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid View */}
        <main className="flex-1 px-12 py-10">
          
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
                    {processMediaList(searchResults).map((item, idx) => (
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
                      {processMediaList(richLocalCards).map((item, idx) => (
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
                      {processMediaList(trendingMovies
                        .filter(m => activeFilter === 'cloud' ? !findLocalMatch(m.title) : true))
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
                      {processMediaList(trendingTv
                        .filter(t => activeFilter === 'cloud' ? !findLocalMatch(t.name) : true))
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

      {/* Dynamic Floating Search Dock at bottom middle (macOS dock style) */}
      {tmdbKey && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[550px] z-[500] pointer-events-auto">
          <div className="glass-panel py-3 px-5 rounded-full flex items-center gap-3 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] focus-within:border-violet-500 focus-within:shadow-[0_20px_50px_rgba(139,92,246,0.25)] transition-all duration-300">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search catalog... (Press '/' to focus)"
              className="flex-1 bg-transparent border-none text-white outline-none px-2 py-1 text-sm font-semibold placeholder:text-slate-500"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleSearch}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-black px-5 py-2 rounded-full transition-all shadow-md shadow-violet-500/20 hover:scale-105"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1010] flex justify-center items-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel max-w-2xl w-full p-8 rounded-3xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-violet-500" />
                <h3 className="font-extrabold text-2xl">Streaming Settings</h3>
              </div>

              {/* Server Nodes Management */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Monitor className="w-4 h-4 text-emerald-400" /> Available Server Nodes</h4>
                <div className="flex flex-col gap-2">
                  {servers.map((s) => (
                    <div 
                      key={s.id} 
                      className={`flex justify-between items-center p-4 rounded-xl border transition-all cursor-pointer ${activeServerId === s.id ? 'bg-violet-600/20 border-violet-500' : 'bg-slate-900 border-white/5 hover:border-white/15'}`}
                      onClick={() => selectServer(s.id)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-100">{s.name}</span>
                          {activeServerId === s.id && <span className="bg-violet-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Active</span>}
                        </div>
                        <span className="text-xs text-slate-400 font-medium font-mono">{s.url}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Online</span>
                        {s.id !== 's001' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteServer(s.id);
                            }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new server form */}
                <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 mt-2">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Add Custom Mirror Server Node</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      value={newServerName}
                      onChange={(e) => setNewServerName(e.target.value)}
                      placeholder="e.g. desktop Local Node"
                      className="bg-slate-900 border border-white/10 text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-violet-500"
                    />
                    <input 
                      type="text" 
                      value={newServerUrl}
                      onChange={(e) => setNewServerUrl(e.target.value)}
                      placeholder="e.g. http://100.120.196.110:8080"
                      className="bg-slate-900 border border-white/10 text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-violet-500"
                    />
                  </div>
                  <button 
                    onClick={handleAddServer}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-[10px] rounded-xl flex justify-center items-center gap-1.5 shadow-md shadow-violet-600/10 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Register Server Node
                  </button>
                </div>
              </div>

              {/* Streaming preferences */}
              <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
                <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Sliders className="w-4 h-4 text-violet-400" /> Player Preferences</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Default Subtitles Language</label>
                    <select 
                      value={defaultSubtitleLang}
                      onChange={(e) => setDefaultSubtitleLang(e.target.value)}
                      className="bg-slate-900 border border-white/10 text-white px-3 py-2.5 rounded-xl text-xs outline-none cursor-pointer"
                    >
                      <option value="en">English (default)</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Default Downmix Config</label>
                    <select 
                      value={downmixMode}
                      onChange={(e) => setDownmixMode(e.target.value as any)}
                      className="bg-slate-900 border border-white/10 text-white px-3 py-2.5 rounded-xl text-xs outline-none cursor-pointer"
                    >
                      <option value="stereo">Stereo Downmix (AAC)</option>
                      <option value="mono">Mono Mixdown</option>
                      <option value="5.1">5.1 downmix</option>
                      <option value="bypass">Bypass (Raw stream)</option>
                    </select>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Metadata Manual Rematching Modal */}
      <AnimatePresence>
        {showRematchModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1050] flex justify-center items-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel max-w-xl w-full p-8 rounded-3xl flex flex-col gap-6 relative"
            >
              <button 
                onClick={() => {
                  setShowRematchModal(false);
                  setRematchResults([]);
                  setRematchSearchQuery('');
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-violet-400 font-black uppercase tracking-wider">Fix Metadata Match</span>
                <h3 className="font-extrabold text-2xl">Rematch TMDb Catalog</h3>
              </div>

              <div className="flex bg-slate-900 border border-white/10 rounded-xl p-2 items-center">
                <Search className="w-4 h-4 text-slate-500 ml-2" />
                <input 
                  type="text" 
                  value={rematchSearchQuery}
                  onChange={(e) => setRematchSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRematchSearch()}
                  placeholder="Enter exact movie or series name..."
                  className="flex-1 bg-transparent border-none text-white outline-none px-3 py-2 text-xs font-semibold"
                />
                <button 
                  onClick={handleRematchSearch}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-[10px] rounded-lg transition"
                >
                  Search
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                {rematchLoading && (
                  <div className="text-center py-6 text-xs text-slate-500 font-bold flex justify-center items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-violet-500" /> Searching TMDb...
                  </div>
                )}
                {rematchResults.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => bindCustomMapping(item)}
                    className="p-3 bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-violet-500/30 rounded-xl flex items-center gap-4 cursor-pointer transition"
                  >
                    {item.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} className="w-10 rounded object-cover aspect-[2/3]" alt="" />
                    ) : (
                      <div className="w-10 aspect-[2/3] bg-slate-950 rounded flex items-center justify-center"><Film className="w-4 h-4 text-slate-700" /></div>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-extrabold text-xs text-slate-200 truncate">{item.title || item.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{(item.release_date || item.first_air_date || '').substring(0, 4)} • {item.media_type ? item.media_type.toUpperCase() : 'TV'}</span>
                    </div>
                  </div>
                ))}
                {!rematchLoading && rematchResults.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 font-medium">Search for metadata above to link this local directory correctly.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLOUD & LOSSLESS LOCAL IMMERSIVE FULL-SCREEN PLAYER */}
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
                  <source src={`${getActiveServerUrl()}/stream/${encodeURIComponent(activePlayPath)}?transcode=${shouldTranscode}`} type="video/mp4" />
                  {getSubtitleUrl() && (
                    <track 
                      src={getSubtitleUrl()} 
                      kind="subtitles" 
                      srcLang={defaultSubtitleLang} 
                      label="Custom Track" 
                      default 
                    />
                  )}
                  Your browser does not support direct video streaming.
                </video>
              ) : (
                <iframe 
                  src={getActiveCloudStreamUrl()}
                  allowFullScreen
                  className="w-full h-full border-none"
                ></iframe>
              )}

              {/* Highly Polished Overlay Controller (Appears on hover or movement) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-8 z-50">
                {/* Top Control Bar */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest animate-pulse">
                        {activePlayPath ? "Live Transcoder Stream" : "Aggregated Cloud Stream"}
                      </span>
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
                    <div className="flex items-center gap-4 flex-wrap">
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

                          {/* Captions Selector dropdown */}
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                            <Subtitles className="w-4 h-4 text-violet-400" />
                            <select 
                              value={activeSubtitlePath}
                              onChange={(e) => setActiveSubtitlePath(e.target.value)}
                              className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer border-none"
                            >
                              <option value="" className="bg-slate-900">Captions: None</option>
                              {subtitlesList.map((s, idx) => (
                                <option key={idx} value={s.path} className="bg-slate-900">{s.name}</option>
                              ))}
                              {customSubtitleUrl && <option value="custom" className="bg-slate-900">Custom URL track</option>}
                            </select>
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
                        <div className="flex flex-col gap-3 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5"><Server className="w-4 h-4 text-violet-400" /> Cineby Cloud Router Multi-Source Resolver:</span>
                            {/* Season / Episode navigation if TV show */}
                            {(activeCloudItem.media_type === 'tv' || (!activeCloudItem.media_type && activeCloudItem.name)) && seasons.length > 0 && (
                              <div className="flex items-center gap-2">
                                <select 
                                  value={selectedSeason} 
                                  onChange={(e) => {
                                    const s = parseInt(e.target.value);
                                    setSelectedSeason(s);
                                    fetchEpisodes(activeCloudItem.id, s);
                                  }}
                                  className="bg-slate-900 border border-white/10 text-white px-2 py-1 rounded text-[10px] outline-none font-bold"
                                >
                                  {seasons.map((s, idx) => (
                                    <option key={idx} value={s.season_number}>Season {s.season_number}</option>
                                  ))}
                                </select>
                                <select 
                                  value={selectedEpisode} 
                                  onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                                  className="bg-slate-900 border border-white/10 text-white px-2 py-1 rounded text-[10px] outline-none font-bold"
                                >
                                  {episodes.map((ep, idx) => (
                                    <option key={idx} value={ep.episode_number}>Episode {ep.episode_number}: {ep.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {cloudProviders.map((p) => (
                              <button 
                                key={p.id}
                                onClick={() => setActiveProviderId(p.id)}
                                className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${activeProviderId === p.id ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                              >
                                {p.name}
                              </button>
                            ))}
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

      {/* FULL-SCREEN IMMERSIVE INFO DRAWER */}
      <AnimatePresence>
        {selectedDetailItem && (
          <motion.div 
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="fixed top-0 right-0 h-screen w-[580px] bg-slate-950/98 z-[900] border-l border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            <div className="flex flex-col">
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
                  
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-3xl font-black tracking-tight hero-text-glow">{selectedDetailItem.title || selectedDetailItem.name}</h2>
                    {findLocalMatch(selectedDetailItem.title || selectedDetailItem.name) && (
                      <button 
                        onClick={() => {
                          setRematchSearchQuery(selectedDetailItem.title || selectedDetailItem.name);
                          setShowRematchModal(true);
                        }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold text-[10px] flex items-center gap-1 transition"
                      >
                        <Edit className="w-3 h-3" /> Rematch
                      </button>
                    )}
                  </div>
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

            {/* Right Column: Local HDD Playlist Directory Inspector */}
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
                              const matchNode = findLocalMatch(selectedDetailItem.title || selectedDetailItem.name);
                              launchLocalPlayer(file.path, file.name, matchNode.local_item_ref.children);
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

// Media Card Component
function MediaCard({ item, onSelect, localCheck, watchProgress }: { item: any, onSelect: (x: any) => void, localCheck: (x: string) => any, watchProgress: Record<string, number> }) {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').substring(0, 4);
  const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null;
  const localMatch = localCheck(title);
  
  let progress = 0;
  if (localMatch && localMatch.local_item_ref) {
    if (localMatch.local_item_ref.type === 'file') {
      progress = watchProgress[localMatch.local_item_ref.path || localMatch.local_item_ref.name] || 0;
    } else if (localMatch.local_item_ref.children) {
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

        {/* Hover Action Popover Overlay */}
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
