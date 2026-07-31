import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { recordPlay } from '../services/adminApi';
import { AudioProcessor } from '../utils/audioProcessor';
import { selectOptimalAudioSource, getQualityDescription, type AudioSourceInfo } from '../utils/audioSourceOptimizer';
import { fetchLikedSongs, pushLikedSongs, fetchPlaylists, pushPlaylists } from '../services/syncService';
import { jiosaavnApi } from '../services/jiosaavnApi';
import { API_ENDPOINTS } from '../config/api';

interface Song {
  id: string;
  name: string;
  primaryArtists: string;
  image: string[] | string | null;
  duration: number;
  url: string;
  downloadUrl?: Array<{ quality?: string; link: string }>;
  album?: string;
  year?: string;
  language?: string;
  playCount?: number;
  releaseDate?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Song[];
  currentIndex?: number;
  language?: string;
  image?: string | string[] | Array<{ quality?: string; link: string }>;
}

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  queueIndex: number;
  activePlaylist: Playlist | null;
  repeatMode: 'none' | 'one' | 'all';
  isShuffle: boolean;
  isSongLiked: (songId: string) => boolean;
  addToLikedSongs: (song: Song) => void;
  removeFromLikedSongs: (songId: string) => void;
  playSong: (song: Song) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlayPause: () => void;
  setQueue: (songs: Song[]) => void;
  setQueueIndex: (index: number) => void;
  setActivePlaylist: (playlist: Playlist | null) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  setIsShuffle: (shuffle: boolean) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setPlaylistAndPlay: (playlist: Song[], index: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  savePlaylist: (playlist: Playlist) => void;
  deletePlaylist: (playlistId: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  likedSongs: Song[];
  savedPlaylists: Playlist[];
  volume: number;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  // Audio quality and processing
  currentAudioInfo: AudioSourceInfo | null;
  audioProcessingEnabled: boolean;
  setAudioProcessingEnabled: (enabled: boolean) => void;
  audioProcessor: AudioProcessor | null;

  // Sleep Timer
  sleepTimerOption: string;
  sleepTimerRemaining: number | null;
  setSleepTimerOption: (option: string) => void;
  cancelSleepTimer: () => void;
  extendSleepTimer: (minutes?: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAuthToken, user } = useAuth();
  // Audio state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [likedSongs, setLikedSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem('likedSongs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('savedPlaylists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Audio processing state
  const [currentAudioInfo, setCurrentAudioInfo] = useState<AudioSourceInfo | null>(null);
  const [audioProcessingEnabled, setAudioProcessingEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('audioProcessingEnabled');
      return saved ? JSON.parse(saved) : true; // Enabled by default
    } catch {
      return true;
    }
  });
  const [audioProcessor] = useState(() => new AudioProcessor());

  // Sleep Timer state
  const [sleepTimerOption, setSleepTimerOptionState] = useState<string>('off');
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  const setSleepTimerOption = (option: string) => {
    setSleepTimerOptionState(option);

    if (option === 'off') {
      setSleepTimerRemaining(null);
      toast.success('Sleep timer turned off');
      return;
    }

    if (option === 'end_of_song') {
      setSleepTimerRemaining(null);
      toast.success('Sleep timer set: End of current song 🌙');
      return;
    }

    const minutesMap: Record<string, number> = {
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '45m': 45,
      '60m': 60,
    };

    const mins = minutesMap[option] || 15;
    const totalSeconds = mins * 60;
    setSleepTimerRemaining(totalSeconds);
    toast.success(`Sleep timer set for ${mins} minutes 🌙`);
  };

  const cancelSleepTimer = () => {
    setSleepTimerOptionState('off');
    setSleepTimerRemaining(null);
    toast.success('Sleep timer cancelled');
  };

  const extendSleepTimer = (minutes: number = 15) => {
    setSleepTimerRemaining((prev) => (prev !== null ? prev + minutes * 60 : minutes * 60));
    toast.success(`Sleep timer extended by ${minutes} minutes 🌙`);
  };

  // Countdown effect for Sleep Timer
  useEffect(() => {
    if (sleepTimerRemaining === null || !isPlaying) return;

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
          setSleepTimerOptionState('off');
          toast('Sleep timer finished. Goodnight! 🌙', {
            icon: '🌙',
            duration: 6000,
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining, isPlaying]);

  // Refs for accessing current values in callbacks
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const playPauseTimeoutRef = useRef<number | null>(null);
  const activePlaylistRef = useRef(activePlaylist);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);

  // Update refs when state changes
  useEffect(() => {
    queueRef.current = queue;
    queueIndexRef.current = queueIndex;
    activePlaylistRef.current = activePlaylist;
    repeatModeRef.current = repeatMode;
    isShuffleRef.current = isShuffle;
  }, [queue, queueIndex, activePlaylist, repeatMode, isShuffle]);

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      const nextMode = prev === 'none' ? 'one' : prev === 'one' ? 'all' : 'none';
      toast.success(
        nextMode === 'one'
          ? 'Repeat Track enabled 🔂'
          : nextMode === 'all'
          ? 'Repeat Queue enabled 🔁'
          : 'Repeat Off ➡️'
      );
      return nextMode;
    });
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const nextShuffle = !prev;
      toast.success(nextShuffle ? 'Shuffle enabled 🔀' : 'Shuffle disabled ➡️');
      return nextShuffle;
    });
  };

  // Cleanup audio processor on unmount
  useEffect(() => {
    return () => {
      if (audioProcessor) {
        // Removed verbose logging for cleaner console
        audioProcessor.dispose();
      }
    };
  }, [audioProcessor]);

  // Persist liked songs, playlists, and audio settings
  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));
  }, [savedPlaylists]);



  useEffect(() => {
    localStorage.setItem('audioProcessingEnabled', JSON.stringify(audioProcessingEnabled));
  }, [audioProcessingEnabled]);

  // Audio element setup & event listeners
  useEffect(() => {
    const handleEnded = () => {
      if (repeatModeRef.current === 'one') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch((err) => console.error('[Player] Repeat One playback failed:', err));
        }
        return;
      }

      setIsPlaying(false);
      playNext();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
    };

    const handleLoadStart = () => {
    };

    const handleLoadedData = () => {
    };

    const handleWaiting = () => {
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target?.error;
      
      if (error) {
        const errorCode = error.code;
        const errorMessage = error.message || 'Unknown audio error';
        
        switch (errorCode) {
          case MediaError.MEDIA_ERR_ABORTED:
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            console.warn('[Player] Network error loading audio:', errorMessage);
            setError('Network error loading audio');
            break;
          case MediaError.MEDIA_ERR_DECODE:
            console.error('[Player] Audio decoding error:', errorMessage);
            setError('Audio format error');
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            console.error('[Player] Audio source not supported:', errorMessage);
            setError('Audio format not supported');
            break;
          default:
            console.error('[Player] Unknown audio error:', { code: errorCode, message: errorMessage });
            setError('Audio playback error');
        }
      }
      setIsPlaying(false);
    };

    const attachListeners = (audioEl: HTMLAudioElement | null) => {
      if (!audioEl) return;
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('canplay', handleCanPlay);
      audioEl.removeEventListener('loadstart', handleLoadStart);
      audioEl.removeEventListener('loadeddata', handleLoadedData);
      audioEl.removeEventListener('waiting', handleWaiting);
      audioEl.removeEventListener('error', handleError);

      audioEl.addEventListener('ended', handleEnded);
      audioEl.addEventListener('play', handlePlay);
      audioEl.addEventListener('pause', handlePause);
      audioEl.addEventListener('canplay', handleCanPlay);
      audioEl.addEventListener('loadstart', handleLoadStart);
      audioEl.addEventListener('loadeddata', handleLoadedData);
      audioEl.addEventListener('waiting', handleWaiting);
      audioEl.addEventListener('error', handleError);
    };

    // Attach to current ref immediately and on frame tick
    attachListeners(audioRef.current);
    const frameId = requestAnimationFrame(() => attachListeners(audioRef.current));

    return () => {
      cancelAnimationFrame(frameId);
      if (playPauseTimeoutRef.current) {
        clearTimeout(playPauseTimeoutRef.current);
        playPauseTimeoutRef.current = null;
      }
      const audioEl = audioRef.current;
      if (audioEl) {
        audioEl.removeEventListener('ended', handleEnded);
        audioEl.removeEventListener('play', handlePlay);
        audioEl.removeEventListener('pause', handlePause);
        audioEl.removeEventListener('canplay', handleCanPlay);
        audioEl.removeEventListener('loadstart', handleLoadStart);
        audioEl.removeEventListener('loadeddata', handleLoadedData);
        audioEl.removeEventListener('waiting', handleWaiting);
        audioEl.removeEventListener('error', handleError);
      }
    };
  }, [audioRef.current]);

  // Sync volume with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (audioProcessingEnabled && audioProcessor) {
        // When Web Audio API is active, control volume via GainNode
        // to prevent inconsistent cross-browser duplicate attenuation
        audioProcessor.setGain(volume);
        audio.volume = 1;
      } else {
        // Fallback to standard HTML5 audio volume
        audio.volume = volume;
      }
    }
  }, [volume, audioProcessingEnabled, audioProcessor]);

  // Liked songs methods
  const isSongLiked = (songId: string) => {
    return likedSongs.some(song => song.id === songId);
  };

  const addToLikedSongs = (song: Song) => {
    if (!isSongLiked(song.id)) {
      setLikedSongs(prev => [...prev, song]);
    }
  };

  const removeFromLikedSongs = (songId: string) => {
    setLikedSongs(prev => prev.filter(song => song.id !== songId));
  };

  // Analytics tracking
  const trackPlay = async (song: Song) => {
    try {
      // Removed verbose logging for cleaner console
      
      // Check if user is authenticated
      if (!getAuthToken) {
        console.warn('[Analytics] No auth context available, using anonymous tracking');
        await trackPlayAnonymous(song);
        return;
      }
      
      const token = await getAuthToken();
      // Removed verbose logging for cleaner console
      
      if (token) {
        // Removed verbose logging for cleaner console
        const playData = {
          songId: song.id,
          songTitle: song.name,
          artist: song.primaryArtists,
          duration: song.duration
        };
        // Removed verbose logging for cleaner console
        
        const result = await recordPlay(token, playData);
        // Removed verbose logging for cleaner console
      } else {
        console.warn('[Analytics] No auth token available for tracking - using anonymous tracking');
        await trackPlayAnonymous(song);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track authenticated play:', error);
      
      // Fallback to anonymous tracking
      // Removed verbose logging for cleaner console
      await trackPlayAnonymous(song);
    }
  };

  // Anonymous analytics tracking (fallback)
  const trackPlayAnonymous = async (song: Song) => {
    try {
      // Removed verbose logging for cleaner console
      
      const playData = {
        songId: song.id,
        songTitle: song.name,
        artist: song.primaryArtists,
        duration: song.duration
      };
      
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/play/anonymous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Removed verbose logging for cleaner console
      } else {
        console.error('[Analytics] Failed to track anonymous play:', result.error);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track anonymous play:', error);
      // Don't block playback if analytics fails
    }
  };

  // Initialize audio processing when audio element is ready
  useEffect(() => {
    // AudioProcessor is initialized lazily inside proceedWithPlayback
    // (after a user gesture) to comply with browser autoplay policy.
    return () => {
      if (!audioProcessingEnabled && audioProcessor.getStatus().isInitialized) {
        audioProcessor.dispose();
      }
    };
  }, [audioProcessingEnabled]);

  // On login: pull data from MongoDB and update localStorage
  useEffect(() => {
    if (!user) return;
    const syncFromBackend = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const [remoteLiked, remotePlaylists] = await Promise.all([
          fetchLikedSongs(token),
          fetchPlaylists(token),
        ]);
        if (remoteLiked.length > 0) setLikedSongs(remoteLiked);
        if (remotePlaylists.length > 0) setSavedPlaylists(remotePlaylists);
      } catch {
        // Silent fail — localStorage remains as fallback
      }
    };
    syncFromBackend();
  }, [user]);

  // Push liked songs to MongoDB on change (1.5s debounce)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        const token = await getAuthToken();
        if (token) await pushLikedSongs(token, likedSongs);
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [likedSongs, user]);

  // Push playlists to MongoDB on change (1.5s debounce)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        const token = await getAuthToken();
        if (token) await pushPlaylists(token, savedPlaylists);
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [savedPlaylists, user]);

  // Playback methods with enhanced audio source selection
  const playSong = (song: Song) => {
    // Removed verbose logging for cleaner console
    
    if (!song) {
      console.warn('[Player] playSong called with invalid song');
      return;
    }
    
    // Clear any existing timeout to prevent race conditions
    if (playPauseTimeoutRef.current) {
      clearTimeout(playPauseTimeoutRef.current);
      playPauseTimeoutRef.current = null;
    }
    
    // Continue with playback directly (no image enhancement)
    proceedWithPlayback(song);
  };

  // Continue with playback
  const proceedWithPlayback = async (song: Song) => {
    // Read audio quality preference from user settings
    let preferredQuality = 'normal';
    try {
      const savedSettingsStr = localStorage.getItem('userSettings');
      if (savedSettingsStr) {
        preferredQuality = JSON.parse(savedSettingsStr).audioQuality || 'normal';
      }
    } catch (e) { /* fallback */ }

    let targetSong = { ...song };
    const isSpotifyUrl = (targetSong.url || '').includes('spotify.com') || (targetSong.url || '').includes('spotify:');

    // If Spotify link and no downloadUrl stream, search JioSaavn stream automatically
    if (isSpotifyUrl && (!targetSong.downloadUrl || (Array.isArray(targetSong.downloadUrl) && targetSong.downloadUrl.length === 0))) {
      try {
        const matches = await jiosaavnApi.searchSongs(`${targetSong.name} ${targetSong.primaryArtists || ''}`, 1);
        if (matches && matches.length > 0 && matches[0].downloadUrl) {
          targetSong.downloadUrl = matches[0].downloadUrl;
          targetSong.url = matches[0].url;
        }
      } catch (err) {
        console.warn('[Player] Spotify stream resolution failed:', err);
      }
    }

    const isYouTubeUrl = (targetSong.id || '').startsWith('yt:') || (targetSong.url || '').includes('youtube.com') || (targetSong.url || '').includes('youtu.be');
    
    // If YouTube link, point the player to our Backend Proxy for JIT stream resolution
    if (isYouTubeUrl) {
      try {
        const urlMatch = targetSong.url?.match(/[?&]v=([^&]+)/) || targetSong.url?.match(/youtu\.be\/([^?]+)/);
        const videoId = targetSong.id.startsWith('yt:') ? targetSong.id.replace('yt:', '') : (urlMatch ? urlMatch[1] : null);
        if (videoId) {
          const proxyUrl = `${API_ENDPOINTS.BASE_URL}/api/stream/youtube/${videoId}`;
          targetSong.downloadUrl = [{ quality: 'highest', link: proxyUrl }];
          targetSong.url = proxyUrl;
        }
      } catch (err) {
        console.warn('[Player] YouTube stream setup failed:', err);
      }
    }

    // Select optimal audio source with preferred quality
    let audioSourceInfo: AudioSourceInfo;
    
    if (targetSong.downloadUrl && Array.isArray(targetSong.downloadUrl) && targetSong.downloadUrl.length > 0) {
      // Use the audio source optimizer with user preferred quality
      audioSourceInfo = selectOptimalAudioSource(targetSong.downloadUrl, preferredQuality);
    } else if (targetSong.url && targetSong.url.trim() !== '' && !targetSong.url.includes('spotify.com')) {
      audioSourceInfo = {
        selectedUrl: targetSong.url,
        detectedQuality: 'unknown',
        availableQualities: []
      };
    } else {
      // No valid audio source found
      console.error('[Player] No valid audio URL found:', targetSong);
      setError('Cannot play song: No audio URL available');
      return;
    }
    
    // Validate we have a valid URL
    if (!audioSourceInfo.selectedUrl || audioSourceInfo.selectedUrl.trim() === '') {
      console.error('[Player] No valid audio URL found after processing:', song);
      setError('Cannot play song: No audio URL available');
      return;
    }
    
    // Clear any previous error
    setError(null);
    
    // Set current song and audio info (with enhanced images)
    setCurrentSong(song);
    setCurrentAudioInfo(audioSourceInfo);
    
    // Track the play for analytics
    // Removed verbose logging for cleaner console
    trackPlay(song);
    
    // Dispatch custom event for play history (consumed by SocialContext)
    window.dispatchEvent(new CustomEvent('audionova:songPlayed', {
      detail: {
        songId: song.id,
        songName: song.name,
        artistName: song.primaryArtists || '',
        language: song.language || '',
      }
    }));
    
    if (audioRef.current) {
      try {
        // Stop current playback first with better error handling
        if (!audioRef.current.paused) {
          try {
            audioRef.current.pause();
          } catch (pauseError) {
            console.warn('[Player] Error pausing current audio:', pauseError);
          }
        }
        
        // Reset audio element
        audioRef.current.currentTime = 0;
        
        // Configure audio element for optimal playback
        audioRef.current.preload = 'auto';
        audioRef.current.crossOrigin = 'anonymous'; // Enable CORS for Web Audio API
        
        // Set new source with optimal URL
        audioRef.current.src = audioSourceInfo.selectedUrl;
        audioRef.current.volume = volume;
        
        // Removed verbose logging for cleaner console
        
        // Play the audio with enhanced error handling
        const attemptPlay = async () => {
          if (!audioRef.current) {
            throw new Error('Audio element no longer available');
          }
          
          try {
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              await playPromise;
              // Removed verbose logging for cleaner console
              setIsPlaying(true);
            }
          } catch (error: any) {
            // Handle specific error types with reduced console spam
            if (error.name === 'AbortError') {
              // Don't show error to user for AbortError as it's usually due to rapid clicking
              return;
            } else if (error.name === 'NotAllowedError') {
              console.warn('[Player] Playback not allowed - user interaction may be required');
              setError('Playback not allowed. Please click play to start.');
            } else if (error.name === 'NotSupportedError') {
              console.error('[Player] Audio format not supported');
              setError('Audio format not supported');
            } else if (error.message && error.message.includes('network')) {
              console.error('[Player] Network error loading audio');
              setError('Network error: Unable to load audio');
            } else {
              console.error('[Player] Failed to play song:', error.message);
              setError('Failed to play song: ' + error.message);
            }
            
            setIsPlaying(false);
          }
        };
        
        // Attempt to play immediately
        attemptPlay();

        // Init AudioProcessor here — guaranteed user gesture context
        if (audioProcessingEnabled && !audioProcessor.getStatus().isInitialized) {
          audioProcessor.initializeProcessing(audioRef.current).catch(() => {});
        }
        
      } catch (error) {
        console.error('[Player] Error setting up audio:', error);
        setIsPlaying(false);
        setError('Failed to setup audio playback');
      }
    }
  };

  const togglePlayPause = () => {
    if (!currentSong || !audioRef.current) {
      console.warn('[Player] No current song or audio element available');
      return;
    }
    
    // Clear any existing timeout to prevent race conditions
    if (playPauseTimeoutRef.current) {
      clearTimeout(playPauseTimeoutRef.current);
      playPauseTimeoutRef.current = null;
    }
    
    const audio = audioRef.current;
    
    // Use the actual audio element state instead of React state to avoid race conditions
    const isCurrentlyPlaying = !audio.paused;
    
    
    // Immediate state update to prevent UI lag
    setIsPlaying(!isCurrentlyPlaying);
    
    // Debounce rapid play/pause calls with increased timeout
    playPauseTimeoutRef.current = setTimeout(async () => {
      if (!audioRef.current) {
        console.warn('[Player] Audio element no longer available');
        return;
      }
      
      try {
        if (isCurrentlyPlaying) {
          try {
            audioRef.current.pause();
            // State will be updated by the 'pause' event listener
          } catch (pauseError) {
            console.warn('[Player] Error pausing audio:', pauseError);
          }
        } else {
          
          // Check if audio has a valid source
          if (!audioRef.current.src || audioRef.current.src === '') {
            console.error('[Player] No audio source available');
            setError('No audio source available');
            setIsPlaying(false);
            return;
          }
          
          // Attempt to play with enhanced error handling
          try {
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              try {
                await playPromise;
                // State will be updated by the 'play' event listener
              } catch (error: any) {
                // Handle specific error types with reduced console spam
                if (error.name === 'AbortError') {
                  // Don't show error to user for AbortError as it's usually due to rapid clicking
                  return;
                } else if (error.name === 'NotAllowedError') {
                  console.warn('[Player] Playback not allowed - user interaction may be required');
                  setError('Playback not allowed. Please interact with the page first.');
                } else if (error.name === 'NotSupportedError') {
                  console.error('[Player] Audio format not supported');
                  setError('Audio format not supported');
                } else if (error.message && error.message.includes('network')) {
                  console.error('[Player] Network error during playback');
                  setError('Network error during playback');
                } else {
                  console.error('[Player] Unknown playback error:', error.message);
                  setError('Failed to resume playback: ' + error.message);
                }
                
                setIsPlaying(false);
              }
            }
          } catch (error) {
            console.error('[Player] Error creating play promise:', error);
            setIsPlaying(false);
            setError('Playback error occurred');
          }
        }
      } catch (error) {
        console.error('[Player] Error in togglePlayPause:', error);
        setIsPlaying(false);
        setError('Playback error occurred');
      }
    }, 150); // Increased debounce to 150ms for better stability
  };

  const playNext = () => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const currentPlaylist = activePlaylistRef.current;
    const currentRepeat = repeatModeRef.current;
    const currentShuffle = isShuffleRef.current;
    
    
    const playlistToUse = currentPlaylist?.tracks || currentQueue;
    let playlistIndex = currentPlaylist?.currentIndex !== undefined ? currentPlaylist.currentIndex : currentIndex;
    
    if (playlistToUse.length > 0 && playlistIndex >= 0) {
      let nextIndex;
      
      if (currentShuffle && playlistToUse.length > 1) {
        if (currentPlaylist?.language) {
          const sameLanguageSongs = playlistToUse
            .map((song, index) => ({ song, index }))
            .filter(({ song }) => song.language === currentPlaylist.language);
          
          if (sameLanguageSongs.length > 1) {
            const currentSongLanguageIndex = sameLanguageSongs.findIndex(({ index }) => index === playlistIndex);
            let nextLanguageSongIndex;
            
            do {
              nextLanguageSongIndex = Math.floor(Math.random() * sameLanguageSongs.length);
            } while (nextLanguageSongIndex === currentSongLanguageIndex && sameLanguageSongs.length > 1);
            
            nextIndex = sameLanguageSongs[nextLanguageSongIndex].index;
          } else {
            nextIndex = playlistIndex + 1;
            if (nextIndex >= playlistToUse.length) {
              nextIndex = 0;
            }
          }
        } else {
          do {
            nextIndex = Math.floor(Math.random() * playlistToUse.length);
          } while (nextIndex === playlistIndex && playlistToUse.length > 1);
        }
      } else {
        nextIndex = playlistIndex + 1;
        
        if (nextIndex >= playlistToUse.length) {
          if (currentRepeat === 'all' || currentRepeat === 'one') {
            nextIndex = 0;
          } else {
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            return;
          }
        }
      }
      
      const nextSong = playlistToUse[nextIndex];
      if (!nextSong) return;
      
      if (currentPlaylist) {
        setActivePlaylist({
          ...currentPlaylist,
          currentIndex: nextIndex
        });
      }
      
      setQueueIndex(nextIndex);
      playSong(nextSong);
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const playPrevious = () => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const currentPlaylist = activePlaylistRef.current;
    const currentRepeat = repeatModeRef.current;
    const currentShuffle = isShuffleRef.current;
    
    const playlistToUse = currentPlaylist?.tracks || currentQueue;
    let playlistIndex = currentPlaylist?.currentIndex !== undefined ? currentPlaylist.currentIndex : currentIndex;
    
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (playlistToUse.length > 0 && playlistIndex >= 0) {
      let prevIndex;
      
      if (currentShuffle && playlistToUse.length > 1) {
        do {
          prevIndex = Math.floor(Math.random() * playlistToUse.length);
        } while (prevIndex === playlistIndex && playlistToUse.length > 1);
      } else {
        prevIndex = playlistIndex - 1;
        
        if (prevIndex < 0) {
          if (currentRepeat === 'all' || currentRepeat === 'one') {
            prevIndex = playlistToUse.length - 1;
          } else {
            prevIndex = 0;
          }
        }
      }
      
      const prevSong = playlistToUse[prevIndex];
      if (!prevSong) return;
      
      if (currentPlaylist) {
        setActivePlaylist({
          ...currentPlaylist,
          currentIndex: prevIndex
        });
      }
      
      setQueueIndex(prevIndex);
      playSong(prevSong);
    }
  };

  // Use refs to avoid re-registering media session handlers on every render
  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);

  useEffect(() => {
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
  }, [playNext, playPrevious]);

  // Register Media Session API handlers for Bluetooth controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNextRef.current();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPreviousRef.current();
        });
      } catch (e) {
        console.warn('Media Session API action handlers could not be set', e);
      }
    }
  }, []); // Run only once to prevent Bluetooth freezing

  // Add the missing setPlaylistAndPlay function
  const setPlaylistAndPlay = (playlist: Song[], index: number) => {
    
    if (!playlist || playlist.length === 0) {
      console.warn('[Player] setPlaylistAndPlay called with empty playlist');
      return;
    }
    
    if (index < 0 || index >= playlist.length) {
      console.warn('[Player] setPlaylistAndPlay called with invalid index', { index, playlistLength: playlist.length });
      return;
    }
    
    // Filter out invalid songs
    const validPlaylist = playlist.filter(song => song && (song.id || (song as any)._id) && (song.name || (song as any).title));
    if (validPlaylist.length === 0) {
      console.error('[Player] No valid songs in playlist');
      setError('No valid songs to play');
      return;
    }
    
    // Adjust index if needed after filtering
    let validIndex = index;
    if (validIndex >= validPlaylist.length) {
      validIndex = 0;
    }
    
    // Create a new active playlist object
    const newActivePlaylist = {
      id: `playlist-${Date.now()}`, // Generate a unique ID
      name: 'Current Playlist',
      tracks: validPlaylist,
      currentIndex: validIndex
    };

    // Set the active playlist
    setActivePlaylist(newActivePlaylist);
    
    // Set the queue and play the selected song
    setQueue(validPlaylist);
    setQueueIndex(validIndex);
    
    // Play the selected song immediately
    const songToPlay = validPlaylist[validIndex];
    playSong(songToPlay);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = time;
      } catch (error) {
        console.error('[Player] Error seeking:', error);
      }
    }
  };

  // Queue management helpers
  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (index < queueIndexRef.current) {
        setQueueIndex(qi => Math.max(0, qi - 1));
      }
      return next;
    });
  };

  const reorderQueue = (from: number, to: number) => {
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const qi = queueIndexRef.current;
      if (from === qi) setQueueIndex(to);
      else if (from < qi && to >= qi) setQueueIndex(qi - 1);
      else if (from > qi && to <= qi) setQueueIndex(qi + 1);
      return next;
    });
  };

  const savePlaylist = (playlist: Playlist) => {    try {
      // Check if playlist already exists
      const existingIndex = savedPlaylists.findIndex(p => p.id === playlist.id);
      
      if (existingIndex >= 0) {
        // Update existing playlist
        const updatedPlaylists = [...savedPlaylists];
        updatedPlaylists[existingIndex] = playlist;
        setSavedPlaylists(updatedPlaylists);
        // Removed verbose logging for cleaner console
      } else {
        // Add new playlist
        setSavedPlaylists(prev => [...prev, playlist]);
        // Removed verbose logging for cleaner console
      }
    } catch (error) {
      console.error('[Playlist] Error saving playlist:', error);
      setError('Failed to save playlist');
    }
  };

  const deletePlaylist = (playlistId: string) => {
    try {
      setSavedPlaylists(prev => prev.filter(p => p.id !== playlistId));
      toast.success('Playlist removed');
    } catch (error) {
      console.error('[Playlist] Error deleting playlist:', error);
    }
  };

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        queueIndex,
        activePlaylist,
        repeatMode,
        isShuffle,
        isSongLiked,
        addToLikedSongs,
        removeFromLikedSongs,
        playSong,
        playNext,
        playPrevious,
        togglePlayPause,
        setQueue,
        setQueueIndex,
        setActivePlaylist,
        setRepeatMode,
        setIsShuffle,
        toggleRepeat,
        toggleShuffle,
        setPlaylistAndPlay,
        savePlaylist,
        deletePlaylist,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        error,
        setError,
        likedSongs,
        savedPlaylists,
        volume,
        setVolume,
        seekTo,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
        // Audio quality and processing
        currentAudioInfo,
        audioProcessingEnabled,
        setAudioProcessingEnabled,
        audioProcessor,
        // Sleep Timer
        sleepTimerOption,
        sleepTimerRemaining,
        setSleepTimerOption,
        cancelSleepTimer,
        extendSleepTimer,
      }}
    >
      <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" className="hidden" />
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};