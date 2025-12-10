import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface Song {
  id: string;
  name: string;
  primaryArtists: string;
  image: string[] | string | null;
  duration: number;
  url: string;
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
  setPlaylistAndPlay: (playlist: Song[], index: number) => void;
  error: string | null;
  setError: (error: string | null) => void;
  likedSongs: Song[];
  savedPlaylists: Playlist[];
  volume: number;
  setVolume: (volume: number) => void;
  currentTime: number;
  duration: number;
  seekTo: (time: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for accessing current values in callbacks
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const activePlaylistRef = useRef(activePlaylist);

  // Update refs when state changes
  useEffect(() => {
    queueRef.current = queue;
    queueIndexRef.current = queueIndex;
    activePlaylistRef.current = activePlaylist;
  }, [queue, queueIndex, activePlaylist]);

  // Persist liked songs and playlists
  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));
  }, [savedPlaylists]);

  // Audio element setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      console.debug('[Player] audio ended');
      playNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

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

  // Playback methods
  const playSong = (song: Song) => {
    console.debug('[Player] playSong called with', song?.name);
    if (!song) {
      console.warn('[Player] playSong called with invalid song');
      return;
    }
    
    // Validate song has required properties
    if (!song.url || song.url.trim() === '') {
      console.error('[Player] Song has no valid URL:', song);
      setError('Cannot play song: No audio URL available');
      return;
    }
    
    setCurrentSong(song);
    setIsPlaying(true);
    
    if (audioRef.current) {
      try {
        audioRef.current.src = song.url;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(error => {
          console.error('[Player] Failed to play song:', error);
          setIsPlaying(false);
          setError('Failed to play song: ' + error.message);
        });
      } catch (error) {
        console.error('[Player] Error setting up audio:', error);
        setIsPlaying(false);
        setError('Failed to setup audio playback');
      }
    }
  };

  const togglePlayPause = () => {
    if (!currentSong) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play().catch(error => {
        console.error('[Player] Failed to resume playback:', error);
      });
      setIsPlaying(true);
    }
  };

  const playNext = () => {
    console.debug('[Player] playNext called');
    // Use refs to get current values to avoid async state issues
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const currentPlaylist = activePlaylistRef.current;
    
    console.debug('[Player] playNext called with', {
      queueLength: currentQueue.length,
      currentIndex: currentIndex,
      repeatMode: repeatMode,
      isShuffle: isShuffle,
      playlistId: currentPlaylist?.id || null,
      playlistTracks: currentPlaylist?.tracks?.length || 0
    });
    
    // Use the active playlist if available, otherwise fall back to queue
    const playlistToUse = currentPlaylist?.tracks || currentQueue;
    let playlistIndex = currentPlaylist?.currentIndex !== undefined ? currentPlaylist.currentIndex : currentIndex;
    
    if (playlistToUse.length > 0 && playlistIndex >= 0) {
      let nextIndex;
      
      if (isShuffle && playlistToUse.length > 1) {
        // For search results with language filtering
        if (currentPlaylist?.language) {
          // Filter songs by the same language as the current song
          const sameLanguageSongs = playlistToUse
            .map((song, index) => ({ song, index }))
            .filter(({ song }) => song.language === currentPlaylist.language);
          
          if (sameLanguageSongs.length > 1) {
            // Generate a random index from songs with the same language
            const currentSongLanguageIndex = sameLanguageSongs.findIndex(({ index }) => index === playlistIndex);
            let nextLanguageSongIndex;
            
            do {
              nextLanguageSongIndex = Math.floor(Math.random() * sameLanguageSongs.length);
            } while (nextLanguageSongIndex === currentSongLanguageIndex && sameLanguageSongs.length > 1);
            
            nextIndex = sameLanguageSongs[nextLanguageSongIndex].index;
          } else {
            // If there's only one song with the same language, just go to the next song in the playlist
            nextIndex = playlistIndex + 1;
            if (nextIndex >= playlistToUse.length) {
              nextIndex = 0; // Loop back to beginning
            }
          }
        } else {
          // Generate a random index that's not the current one
          do {
            nextIndex = Math.floor(Math.random() * playlistToUse.length);
          } while (nextIndex === playlistIndex && playlistToUse.length > 1);
        }
      } else {
        nextIndex = playlistIndex + 1;
        
        // Handle repeat mode
        if (nextIndex >= playlistToUse.length) {
          if (repeatMode === 'all') {
            nextIndex = 0; // Loop back to beginning
          } else {
            // No more songs to play - this is the correct behavior for repeat: none
            console.debug('[Player] reached end, stopping');
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            return;
          }
        }
      }
      
      console.debug('[Player] playNext -> nextIndex', nextIndex, 'nextTrack', playlistToUse[nextIndex]?.name);
      const nextSong = playlistToUse[nextIndex];
      
      // Update the active playlist if it exists
      if (currentPlaylist) {
        const updatedPlaylist = {
          ...currentPlaylist,
          currentIndex: nextIndex
        };
        setActivePlaylist(updatedPlaylist);
      }
      
      setQueueIndex(nextIndex);
      
      // Play the next song immediately
      console.debug('[Player] playNext calling playSong for next track');
      playSong(nextSong);
    } else {
      // If queue is empty or invalid index, stop playing
      console.debug('[Player] queue is empty or invalid index, stopping playback');
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const playPrevious = () => {
    console.debug('[Player] playPrevious called');
    // Use refs to get current values to avoid async state issues
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const currentPlaylist = activePlaylistRef.current;
    
    // Use the active playlist if available, otherwise fall back to queue
    const playlistToUse = currentPlaylist?.tracks || currentQueue;
    let playlistIndex = currentPlaylist?.currentIndex !== undefined ? currentPlaylist.currentIndex : currentIndex;
    
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (playlistToUse.length > 0 && playlistIndex >= 0) {
      let prevIndex;
      
      if (isShuffle && playlistToUse.length > 1) {
        // Generate a random index that's not the current one
        do {
          prevIndex = Math.floor(Math.random() * playlistToUse.length);
        } while (prevIndex === playlistIndex && playlistToUse.length > 1);
      } else {
        prevIndex = playlistIndex - 1;
        
        // Handle wraparound for repeat all mode
        if (prevIndex < 0) {
          if (repeatMode === 'all') {
            prevIndex = playlistToUse.length - 1; // Go to last song
          } else {
            prevIndex = 0; // Stay at first song
          }
        }
      }
      
      const prevSong = playlistToUse[prevIndex];
      
      // Update the active playlist if it exists
      if (currentPlaylist) {
        const updatedPlaylist = {
          ...currentPlaylist,
          currentIndex: prevIndex
        };
        setActivePlaylist(updatedPlaylist);
      }
      
      setQueueIndex(prevIndex);
      playSong(prevSong);
    }
  };

  // Add the missing setPlaylistAndPlay function
  const setPlaylistAndPlay = (playlist: Song[], index: number) => {
    console.debug('[Player] setPlaylistAndPlay called with', { playlistLength: playlist.length, index });
    
    if (!playlist || playlist.length === 0) {
      console.warn('[Player] setPlaylistAndPlay called with empty playlist');
      return;
    }
    
    if (index < 0 || index >= playlist.length) {
      console.warn('[Player] setPlaylistAndPlay called with invalid index', { index, playlistLength: playlist.length });
      return;
    }
    
    // Filter out invalid songs
    const validPlaylist = playlist.filter(song => song && song.id && song.name);
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
    console.debug('[Player] setPlaylistAndPlay calling playSong for', songToPlay?.name);
    playSong(songToPlay);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
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
        setPlaylistAndPlay,
        error,
        setError,
        likedSongs,
        savedPlaylists,
        volume,
        setVolume,
        currentTime,
        duration,
        seekTo,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
      }}
    >
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