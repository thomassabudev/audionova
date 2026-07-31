import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart, 
  MoreHorizontal, 
  Volume2, 
  Music,
  Search,
  Home,
  Library,
  Radio,
  TrendingUp,
  Clock,
  Plus,
  X,
  Edit3,
  Trash2,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Filter,
  SortAsc,
  User,
  Users,
  Globe,
  Lock,
  Check,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  Minimize2,
  ListMusic,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMusic } from '@/context/MusicContext';
import { useAudioTime } from '@/hooks/useAudioTime';
import PlayingEqualizerBadge from './PlayingEqualizerBadge';
// Import the JioSaavn Song type with an alias to avoid conflicts
import type { Song as JioSaavnSong } from '@/services/jiosaavnApi';
import { getHighestQualityImage } from '@/services/jiosaavnApi';
import { Slider } from '@/components/ui/slider';
import PlaylistEditor from './PlaylistEditor';
import SharePlaylistModal from './SharePlaylistModal';
import LyricsViewer from './LyricsViewer'; // Add this import
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRegisterVisualizer } from '@/hooks/useVisualizerRegistration';

// Define the Playlist interface locally since it's not exported from jiosaavnApi
interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: JioSaavnSong[];
  image?: string;
  createdAt: Date;
  curator?: string;
  followers?: number;
  version: number; // Required property for version control
}

interface EnhancedFullscreenPlaylistViewProps {
  playlist: Playlist;
  onClose: () => void;
}

// Helper function to convert string[] to { quality: string; link: string }[] format
const convertImageArray = (imageArray: any): Array<{ quality: string; link: string }> => {
  // If it's already in the correct format, return as is
  if (Array.isArray(imageArray) && imageArray.length > 0 && typeof imageArray[0] === 'object' && imageArray[0].link) {
    return imageArray;
  }
  // If it's a string array, convert to the correct format
  if (Array.isArray(imageArray) && imageArray.length > 0 && typeof imageArray[0] === 'string') {
    return imageArray.map(link => ({ quality: '500x500', link }));
  }
  // Return empty array if invalid
  return [];
};

// QueueItem component with visualizer
// Helper function to convert JioSaavn Song to MusicContext Song
const convertJioSaavnSongToMusicContextSong = (jioSaavnSong: JioSaavnSong): any => {
  // Extract the highest quality image link
  let imageUrl = '';
  
  if (typeof jioSaavnSong.image === 'string') {
    imageUrl = jioSaavnSong.image;
  } else if (jioSaavnSong.image && Array.isArray(jioSaavnSong.image) && jioSaavnSong.image.length > 0) {
    imageUrl = getHighestQualityImage(jioSaavnSong.image);
  }

  // Prefer direct audio stream from downloadUrl over webpage links
  let streamUrl = '';
  if (jioSaavnSong.downloadUrl) {
    if (Array.isArray(jioSaavnSong.downloadUrl) && jioSaavnSong.downloadUrl.length > 0) {
      const highest = jioSaavnSong.downloadUrl[jioSaavnSong.downloadUrl.length - 1] || jioSaavnSong.downloadUrl[0];
      if (highest?.link) streamUrl = highest.link;
    } else if (typeof jioSaavnSong.downloadUrl === 'string' && (jioSaavnSong.downloadUrl as string).trim()) {
      streamUrl = jioSaavnSong.downloadUrl;
    }
  }

  // Fallback to url if not a spotify webpage link
  if (!streamUrl && jioSaavnSong.url && !jioSaavnSong.url.includes('spotify.com') && !jioSaavnSong.url.includes('spotify:')) {
    streamUrl = jioSaavnSong.url;
  }
  
  return {
    id: jioSaavnSong.id,
    name: jioSaavnSong.name,
    primaryArtists: jioSaavnSong.primaryArtists,
    image: imageUrl || '',
    duration: jioSaavnSong.duration,
    url: streamUrl,
    downloadUrl: jioSaavnSong.downloadUrl,
    album: typeof jioSaavnSong.album === 'string' ? jioSaavnSong.album : (jioSaavnSong.album?.name || ''),
    year: jioSaavnSong.year,
    language: jioSaavnSong.language,
    playCount: jioSaavnSong.playCount,
    releaseDate: jioSaavnSong.releaseDate
  };
};

const QueueItem = ({ 
  song, 
  index, 
  isCurrent, 
  currentSong, 
  isPlaying, 
  onPlaySong,
  formatDuration,
  audioRef
}: { 
  song: any; 
  index: number; 
  isCurrent: boolean; 
  currentSong: any; 
  isPlaying: boolean; 
  onPlaySong: (song: any) => void;
  formatDuration: (seconds: number) => string;
  audioRef: React.RefObject<HTMLAudioElement>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Register visualizer
  useRegisterVisualizer(canvasRef, isCurrent && isPlaying, audioRef);
  
  return (
    <div 
      className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-accent ${
        isCurrent ? 'bg-red-500/10' : ''
      }`}
      onClick={() => onPlaySong(song)}
    >
      <div className="text-sm text-muted-foreground w-6 flex items-center justify-center">
        {isCurrent ? (
          <PlayingEqualizerBadge size="sm" isPlaying={isPlaying} />
        ) : (
          index + 1
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-red-500' : 'text-foreground'}`}>
          {song.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{song.primaryArtists}</p>
      </div>
      <div className="text-xs text-muted-foreground">
        {song.duration ? formatDuration(Number(song.duration)) : '0:00'}
      </div>
    </div>
  );
};

// Move the SongItem component definition here, before the main component
const SongItem = React.memo(({ 
  song, 
  playlistId, 
  isCurrent, 
  displayIndex, 
  songImage, 
  onPlaySong,
  onLikeToggle,
  isSongLiked,
  formatDuration,
  isPlaying,
  audioRef
}: { 
  song: any; 
  playlistId: string; 
  isCurrent: boolean; 
  displayIndex: number; 
  songImage: string; 
  onPlaySong: (song: any) => void;
  onLikeToggle: (song: any, e: React.MouseEvent) => void;
  isSongLiked: (id: string) => boolean;
  formatDuration: (seconds: number) => string;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Register visualizer for currently playing song
  useRegisterVisualizer(canvasRef, isCurrent && isPlaying, audioRef);
  
  return (
    <motion.div 
      className={`grid grid-cols-12 gap-2 md:gap-4 px-3 md:px-4 py-3 hover:bg-accent/50 transition-colors group ${
        isCurrent ? 'bg-red-500/10 border-l-4 border-red-500' : ''
      }`}
      onClick={() => onPlaySong(song)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: 0.9 + displayIndex * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="col-span-1 flex items-center min-w-0">
        {isCurrent ? (
          <PlayingEqualizerBadge size="sm" isPlaying={isPlaying} />
        ) : (
          <span className="text-muted-foreground text-xs md:text-sm group-hover:hidden">{displayIndex}</span>
        )}
        <button 
          className={`hidden group-hover:block ${isCurrent ? 'text-red-500' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlaySong(song);
          }}
          aria-label={`Play ${song.name}`}
        >
          <Play className="w-4 h-4 fill-current" />
        </button>
      </div>
      
      <div className="col-span-9 md:col-span-5 flex items-center gap-2.5 min-w-0">
        {songImage && (
          <img 
            src={songImage} 
            alt={song.name} 
            className="w-10 h-10 rounded object-cover flex-shrink-0"
            crossOrigin="anonymous"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-xs md:text-sm truncate ${isCurrent ? 'text-red-500 font-semibold' : 'text-foreground'}`}>
            {song.name}
          </p>
          <p className="text-[11px] md:text-xs text-muted-foreground truncate">
            {song.primaryArtists}
          </p>
        </div>
      </div>
      
      <div className="hidden md:flex col-span-3 items-center min-w-0">
        <p className="text-muted-foreground text-sm truncate">{song.album?.name || song.album || 'Unknown Album'}</p>
      </div>
      
      <div className="hidden md:flex col-span-2 items-center min-w-0">
        <p className="text-muted-foreground text-sm truncate">
          {song.year || new Date().getFullYear()}
        </p>
      </div>
      
      <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1.5 min-w-0">
        <button 
          onClick={(e) => onLikeToggle(song, e)}
          className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
          aria-label={isSongLiked(song.id) ? "Unlike song" : "Like song"}
        >
          <Heart 
            className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
              isSongLiked(song.id) ? 'fill-red-500 text-red-500' : ''
            }`} 
          />
        </button>
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground">
          {song.duration ? formatDuration(Number(song.duration)) : '0:00'}
        </span>
        <button 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.song.id === nextProps.song.id &&
    prevProps.playlistId === nextProps.playlistId &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.displayIndex === nextProps.displayIndex &&
    prevProps.songImage === nextProps.songImage &&
    prevProps.isPlaying === nextProps.isPlaying
  );
});

SongItem.displayName = 'SongItem';

const EnhancedFullscreenPlaylistView: React.FC<EnhancedFullscreenPlaylistViewProps> = ({ 
  playlist: initialPlaylist, 
  onClose
}) => {
  const { 
    currentSong, 
    isPlaying, 
    volume,
    isSongLiked,
    playSong, 
    setQueue, 
    togglePlayPause,
    seekTo,
    setVolume,
    addToLikedSongs,
    removeFromLikedSongs,
    setPlaylistAndPlay, // Add the new method
    repeatMode, // Add missing variable
    setRepeatMode, // Add missing variable
    isShuffle,
    setIsShuffle,
    toggleShuffle,
    playNext, // Add missing variable
    playPrevious, // Add missing variable
    audioRef,
    savePlaylist
  } = useMusic();
  
  const { currentTime, duration } = useAudioTime(audioRef);

  // Initialize playlist with version if not present
  const playlistWithVersion = {
    ...initialPlaylist,
    version: initialPlaylist.version || 1
  };
  
  const [playlist, setPlaylist] = useState(playlistWithVersion);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShuffled, setIsShuffled] = useState(false);
  const [originalPlaylistOrder, setOriginalPlaylistOrder] = useState(playlistWithVersion.tracks);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false); // Add this state
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeStartY, setSwipeStartY] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const lastPlayedSongRef = useRef<string | null>(null);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  // Add new refs for scroll optimization
  const rafRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Add refs for frequently accessed values
  const playlistRef = useRef(playlist);
  const currentSongRef = useRef(currentSong);

  // Update refs when values change
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Reset autoplay state when component unmounts
  useEffect(() => {
    // Set loading state to false after a short delay to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => {
      clearTimeout(timer);
      setIsAutoplayEnabled(false);
    };
  }, [playlist]);
  
  // Handle scroll for header shrinking - optimized with requestAnimationFrame
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      // Clear any existing scroll idle timer
      if (scrollIdleTimerRef.current) {
        clearTimeout(scrollIdleTimerRef.current);
      }
      
      // Use requestAnimationFrame to batch visual updates
      if (rafRef.current) return;
      
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = scrollContainer.scrollTop;
        setIsHeaderShrunk(scrollTop > 100);
        rafRef.current = null;
      });
      
      // Set a new scroll idle timer to delay heavy operations
      scrollIdleTimerRef.current = setTimeout(() => {
        // Scroll has stabilized, safe to do heavier operations if needed
        // This is where we could trigger prefetching or other non-urgent updates
      }, 150);
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollIdleTimerRef.current) {
        clearTimeout(scrollIdleTimerRef.current);
      }
    };
  }, []);

  // Handle swipe gestures for mobile dismiss
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!scrollContainerRef.current) return;
      
      const scrollTop = scrollContainerRef.current.scrollTop;
      // Only allow swipe to dismiss when at the top of the scroll
      if (scrollTop === 0) {
        setIsSwiping(true);
        setSwipeStartY(e.touches[0].clientY);
        touchStartYRef.current = e.touches[0].clientY;
        touchStartTimeRef.current = Date.now();
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping || !scrollContainerRef.current) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - swipeStartY;
      
      // Only allow downward swipe
      if (deltaY > 0) {
        e.preventDefault();
        setSwipeOffset(deltaY);
      }
    };
    
    const handleTouchEnd = () => {
      if (!isSwiping) return;
      
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTimeRef.current;
      const deltaY = swipeOffset;
      
      // Calculate velocity (pixels per millisecond)
      const velocity = deltaY / touchDuration;
      
      // Close if swipe is fast enough or far enough
      if (velocity > 0.5 || deltaY > 150) {
        onClose();
      } else {
        // Reset position
        setSwipeOffset(0);
      }
      
      setIsSwiping(false);
    };
    
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('touchstart', handleTouchStart);
      scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
      scrollContainer.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', handleTouchStart);
        scrollContainer.removeEventListener('touchmove', handleTouchMove);
        scrollContainer.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isSwiping, swipeStartY, swipeOffset, onClose]);
  
  // Trap focus inside modal and prevent body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Prevent body scroll when fullscreen playlist is open
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [onClose]);
  
  // Filter songs based on search query - create a new array to avoid mutation
  const filteredSongs = [...playlist.tracks].filter((song: any) => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.primaryArtists.toLowerCase().includes(searchQuery.toLowerCase())
  );
  


  // Wrap event handlers with useCallback to prevent re-creation on each render
  const handleLikeToggle = useCallback((song: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSongLiked(song.id)) {
      removeFromLikedSongs(song.id);
    } else {
      addToLikedSongs(song);
    }
  }, [isSongLiked, removeFromLikedSongs, addToLikedSongs]);

  const getSongImage = useCallback((song: any) => {
    if (!song.image) return '';
    
    // If image is already a string (normalized), use it directly
    if (typeof song.image === 'string') {
      return song.image;
    }
    
    // If image is an array, handle legacy format
    if (Array.isArray(song.image) && song.image.length > 0) {
      return getHighestQualityImage(convertImageArray(song.image));
    }
    
    return '';
  }, []);

  // Helper function to convert JioSaavn Song to MusicContext Song
  const convertJioSaavnSongToMusicContextSong = (jioSaavnSong: any): any => {
    // Removed verbose logging for cleaner console
    
    // Extract the highest quality image link
    const imageUrl = typeof jioSaavnSong.image === 'string'
      ? jioSaavnSong.image
      : (jioSaavnSong.image && Array.isArray(jioSaavnSong.image) && jioSaavnSong.image.length > 0
          ? getHighestQualityImage(convertImageArray(jioSaavnSong.image))
          : '');
    
    // Get the best quality download URL
    let audioUrl = '';
    
    // Check if downloadUrl exists and is an array
    if (jioSaavnSong.downloadUrl && Array.isArray(jioSaavnSong.downloadUrl) && jioSaavnSong.downloadUrl.length > 0) {
      // Removed verbose logging for cleaner console
      // Sort by quality and get the highest quality URL
      const sortedUrls = [...jioSaavnSong.downloadUrl].sort((a, b) => {
        const qualityA = parseInt(a.quality || '0');
        const qualityB = parseInt(b.quality || '0');
        return qualityB - qualityA;
      });
      audioUrl = sortedUrls[0]?.link || '';
      // Removed verbose logging for cleaner console
    }
    
    // Fallback to url property if downloadUrl is not available
    if (!audioUrl && jioSaavnSong.url) {
      audioUrl = jioSaavnSong.url;
      // Removed verbose logging for cleaner console
    }
    
    // Log warning if no audio URL found
    if (!audioUrl) {
      console.error('[EnhancedPlaylist] ⚠️ NO AUDIO URL FOUND for song:', jioSaavnSong.name);
      console.error('[EnhancedPlaylist] Song data:', {
        id: jioSaavnSong.id,
        name: jioSaavnSong.name,
        hasDownloadUrl: !!jioSaavnSong.downloadUrl,
        downloadUrlLength: jioSaavnSong.downloadUrl?.length,
        hasUrl: !!jioSaavnSong.url,
        url: jioSaavnSong.url
      });
    }
    
    const convertedSong = {
      id: jioSaavnSong.id,
      name: jioSaavnSong.name,
      primaryArtists: jioSaavnSong.primaryArtists,
      image: imageUrl ? [imageUrl] : [],
      duration: jioSaavnSong.duration,
      url: audioUrl,
      album: jioSaavnSong.album?.name || jioSaavnSong.album,
      year: jioSaavnSong.year,
      language: jioSaavnSong.language,
      playCount: jioSaavnSong.playCount,
      releaseDate: jioSaavnSong.releaseDate
    };
    
    return convertedSong;
  };

  // Play a song from the playlist
  const playSongFromPlaylist = useCallback((song: any) => {
    // Find the index of the song in the playlist using ref
    const songIndex = playlistRef.current.tracks.findIndex(track => track.id === song.id);
    
    if (songIndex !== -1) {
      // Convert tracks to MusicContext Song format before passing
      const convertedTracks = playlistRef.current.tracks.map(convertJioSaavnSongToMusicContextSong);
      
      // Check if any songs have valid URLs
      const songsWithUrls = convertedTracks.filter(t => t.url && t.url.trim() !== '');
      
      if (songsWithUrls.length === 0) {
        alert('Audio playback is not available for these songs.');
        return;
      }
        
      // Use the new method to set the playlist and play the specific song
      setPlaylistAndPlay(convertedTracks, songIndex);
    } else {
      // Fallback to the old method if song not found
      const convertedTracks = playlistRef.current.tracks.map(convertJioSaavnSongToMusicContextSong);
        
      setQueue(convertedTracks);
      const convertedSong = convertJioSaavnSongToMusicContextSong(song);
      playSong(convertedSong);
    }
  }, [setPlaylistAndPlay, setQueue, playSong]);

  // Wrap formatDuration with useCallback
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Play the next song in the playlist
  const playNextSong = () => {
    if (!currentSong) return;
    
    // Find the current song index
    const currentIndex = playlist.tracks.findIndex(track => track.id === currentSong.id);
    
    // If there's a next song, play it
    if (currentIndex >= 0 && currentIndex < playlist.tracks.length - 1) {
      // Use the global playNext function instead of setting queue manually
      playNext();
    }
  };
  
  // Play the previous song in the playlist
  const playPreviousSong = () => {
    if (!currentSong) return;
    
    // Find the current song index
    const currentIndex = playlist.tracks.findIndex(track => track.id === currentSong.id);
    
    // If there's a previous song, play it
    if (currentIndex > 0) {
      // Use the global playPrevious function instead of setting queue manually
      playPrevious();
    }
  };
  
  // Handle seek functionality
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !currentSong) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    
    // Use the seekTo function from MusicContext
    seekTo(newTime);
  };
  
  // Handle seek start (for drag functionality)
  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !currentSong) return;
    
    const handleSeekMove = (moveEvent: MouseEvent) => {
      const progressBar = e.currentTarget as HTMLDivElement;
      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newTime = percent * duration;
      
      // Update the seek position during drag
      seekTo(newTime);
    };
    
    const handleSeekEnd = () => {
      document.removeEventListener('mousemove', handleSeekMove);
      document.removeEventListener('mouseup', handleSeekEnd);
    };
    
    document.addEventListener('mousemove', handleSeekMove);
    document.addEventListener('mouseup', handleSeekEnd);
  };
  
  // Skeleton loader for tracks
  const renderSkeletonTracks = () => {
    return Array.from({ length: 10 }).map((_, index) => (
      <div key={index} className="grid grid-cols-12 gap-4 px-4 py-3">
        <div className="col-span-1 flex items-center">
          <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="col-span-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
        <div className="col-span-3 flex items-center">
          <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
        </div>
        <div className="col-span-2 flex items-center">
          <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="col-span-1 flex items-center justify-end">
          <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
        </div>
      </div>
    ));
  };

  // Improve queue toggle to prevent opening during scroll
  const toggleQueueWithScrollCheck = useCallback(() => {
    // Clear any existing scroll idle timer
    if (scrollIdleTimerRef.current) {
      clearTimeout(scrollIdleTimerRef.current);
    }
    
    // Set a new scroll idle timer to delay queue opening
    scrollIdleTimerRef.current = setTimeout(() => {
      setIsQueueOpen(prev => !prev);
    }, 150);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-background overflow-hidden">
      {/* Solid backdrop to completely cover background content */}
      <div className="absolute inset-0 bg-background z-0"></div>
      
      {/* Main fullscreen container with scroll isolation */}
      <div className="relative z-10 h-screen w-screen flex flex-col overflow-hidden">
        
        {/* Fixed Close buttons - always visible at top */}
        <div className="absolute top-6 left-6 z-50 flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
      </div>
      
      {/* Header with parallax effect - always show in fullscreen mode */}
      <motion.div 
        ref={headerRef}
        className="relative h-1/3 min-h-[300px] flex items-end flex-shrink-0 overflow-hidden z-10"
        initial={{ 
          height: '100px',
          scale: 0.8,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        }}
        animate={{ 
          height: isHeaderShrunk ? '80px' : '33.333%',
          scale: 1,
          x: 0,
          y: 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          height: { duration: 0.3 }
        }}
      >
        {/* Blurred background with parallax */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: playlist.image ? `url(${playlist.image})` : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(1.1) translateY(${isHeaderShrunk ? '-20px' : '0'})`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        
        <div className="relative z-10 w-full p-6 pb-8 pt-16">
          
          <div className="flex items-end gap-6">
            {/* Playlist image with animation */}
            <motion.div 
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: isHeaderShrunk ? 0.5 : 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                transformOrigin: 'top left',
                position: isHeaderShrunk ? 'absolute' : 'relative',
                left: isHeaderShrunk ? '0' : 'auto',
                top: isHeaderShrunk ? '16px' : 'auto',
                zIndex: isHeaderShrunk ? 10 : 'auto'
              }}
            >
              {playlist.image ? (
                <img 
                  src={playlist.image} 
                  alt={playlist.name} 
                  className="w-48 h-48 rounded shadow-lg object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-48 h-48 bg-gradient-to-br from-purple-500 to-blue-500 rounded shadow-lg flex items-center justify-center">
                  <div className="bg-black/20 rounded-full p-4">
                    <Play className="w-12 h-12 text-white fill-current" />
                  </div>
                </div>
              )}
            </motion.div>
            
            {/* Playlist info */}
            <div className={`pb-2 transition-all duration-300 ${isHeaderShrunk ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
              <p className="text-sm font-semibold text-white/90">Playlist</p>
              <motion.h1 
                className="text-5xl font-bold text-white mb-2 truncate max-w-2xl"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {playlist.name}
              </motion.h1>
              {playlist.curator && (
                <motion.p 
                  className="text-white/90 flex items-center gap-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <User className="w-4 h-4" />
                  {playlist.curator}
                </motion.p>
              )}
              <motion.div 
                className="flex items-center gap-4 text-white/70 mt-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {playlist.followers && (
                  <span>{playlist.followers.toLocaleString()} followers</span>
                )}
                <span>{playlist.tracks.length} song{playlist.tracks.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{formatDuration(playlist.tracks.reduce((total, song) => total + (Number(song.duration) || 0), 0))}</span>
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* Mini Player - Positioned under the right side */}
        <AnimatePresence>
          {isMiniPlayerOpen && currentSong && (
            <motion.div
              className="absolute top-32 right-6 w-80 bg-card/90 backdrop-blur-lg rounded-lg border border-border shadow-xl z-20"
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3">
                <div className="flex items-center gap-3">
                  {currentSong.image ? (
                    <img 
                      src={typeof currentSong.image === 'string' ? currentSong.image : getHighestQualityImage(convertImageArray(currentSong.image))} 
                      alt={currentSong.name} 
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{currentSong.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{currentSong.primaryArtists}</p>
                  </div>
                  <button 
                    onClick={() => setIsMiniPlayerOpen(false)}
                    className="p-1 rounded-full hover:bg-accent"
                    aria-label="Minimize player"
                  >
                    <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Progress Bar with Seek Functionality */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <div 
                    className="w-full h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                    onClick={handleSeek}
                    onMouseDown={handleSeekStart}
                  >
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreviousSong();
                    }}
                    className="p-2 rounded-full hover:bg-accent"
                    aria-label="Previous song"
                  >
                    <SkipBack className="w-4 h-4 text-foreground" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="p-2 rounded-full bg-primary hover:bg-primary/90"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    )}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playNextSong();
                    }}
                    className="p-2 rounded-full hover:bg-accent"
                    aria-label="Next song"
                  >
                    <SkipForward className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Controls - removed sidebar-specific styling */}
      <div className="px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 relative z-10 overflow-x-auto scrollbar-none max-w-full flex-nowrap">
        <button 
          onClick={() => {
            // If we're already playing a song from this playlist, toggle play/pause
            // Otherwise, play the first song
            if (isPlaying && currentSong && playlist.tracks.some(track => track.id === currentSong.id)) {
              togglePlayPause();
            } else if (currentSong && playlist.tracks.some(track => track.id === currentSong.id)) {
              togglePlayPause();
            } else {
              playSongFromPlaylist(playlist.tracks[0]);
            }
          }}
          className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg hover:bg-emerald-600"
          aria-label={isPlaying && currentSong && playlist.tracks.some(track => track.id === currentSong.id) ? "Pause" : "Play"}
        >
          {isPlaying && currentSong && playlist.tracks.some(track => track.id === currentSong.id) ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>
        
        {/* Shuffle Button */}
        <button
          onClick={() => {
            const nextShuffleState = !isShuffle;
            setIsShuffle(nextShuffleState);
            
            if (nextShuffleState) {
              // Enable Shuffle: save original order, shuffle tracks & start playback from index 0
              setOriginalPlaylistOrder(playlist.tracks);
              const shuffledTracks = [...playlist.tracks].sort(() => Math.random() - 0.5);
              const convertedTracks = shuffledTracks.map(convertJioSaavnSongToMusicContextSong);
              
              setPlaylistAndPlay(convertedTracks, 0);
              setIsShuffled(true);
              toast.success('Shuffling & playing playlist 🔀');
            } else {
              // Disable Shuffle: restore original order
              if (originalPlaylistOrder.length > 0) {
                setPlaylist(prev => ({ ...prev, tracks: originalPlaylistOrder }));
              }
              setIsShuffled(false);
              toast.success('Shuffle disabled ➡️');
            }
          }}
          className={`px-4 py-2 flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-2 transition-all ${
            isShuffle || isShuffled 
              ? 'bg-red-600 text-white font-semibold shadow-md' 
              : 'bg-card border border-border text-foreground hover:bg-accent'
          }`}
          aria-label={isShuffle || isShuffled ? "Disable shuffle" : "Enable shuffle"}
        >
          <Shuffle className="w-4 h-4" />
          <span className="text-sm font-medium">Shuffle</span>
          <div className={`w-2 h-2 rounded-full ${isShuffle || isShuffled ? 'bg-white' : 'bg-muted-foreground'}`} />
        </button>
        
        {/* Edit Button - always show in fullscreen mode */}
        <button
          onClick={() => setIsEditorOpen(true)}
          className="px-4 py-2 flex-shrink-0 whitespace-nowrap rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          aria-label="Edit playlist"
        >
          <Edit3 className="w-4 h-4" />
          <span className="text-sm font-medium">Edit</span>
        </button>
        
        {/* Follow Button */}
        <button
          className="px-4 py-2 flex-shrink-0 whitespace-nowrap rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          onClick={() => {
            console.log('playlist_follow', { playlistId: playlist.id, playlistName: playlist.name });
          }}
          aria-label="Follow playlist"
        >
          <Heart className="w-4 h-4" />
          <span className="text-sm font-medium">Follow</span>
        </button>
        
        {/* Download Button */}
        <button
          className="p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors"
          aria-label="Download playlist"
        >
          <Download className="w-5 h-5" />
        </button>
        
        {/* Share Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors"
          aria-label="Share playlist"
        >
          <Share2 className="w-5 h-5" />
        </button>
        
        {/* Queue Toggle Button */}
        {currentSong && (
          <button
            onClick={toggleQueueWithScrollCheck}
            className="p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors"
            aria-label={isQueueOpen ? "Close queue" : "Open queue"}
          >
            <ListMusic className="w-5 h-5" />
          </button>
        )}
        
        {/* Mini Player Toggle Button */}
        {currentSong && (
          <button
            onClick={() => setIsMiniPlayerOpen(!isMiniPlayerOpen)}
            className="p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors"
            aria-label={isMiniPlayerOpen ? "Minimize player" : "Expand player"}
          >
            {isMiniPlayerOpen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Lyrics Toggle Button */}
        {currentSong && (
          <button
            onClick={() => setIsLyricsOpen(!isLyricsOpen)}
            className={`p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors ${
              isLyricsOpen ? 'bg-primary text-primary-foreground' : ''
            }`}
            aria-label={isLyricsOpen ? "Close lyrics" : "Show lyrics"}
          >
            <Music className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Search Bar */}
      <div className="px-4 md:px-6 py-2 border-b border-border relative z-10">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in playlist"
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            aria-label="Search in playlist"
          />
        </div>
      </div>
      
      {/* Songs List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 md:px-6 pb-32 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-red-500/30"
        style={{
          overscrollBehavior: 'contain',
          overscrollBehaviorY: 'contain',
          height: 'auto', // Let flex-1 handle the height
          contain: 'layout style paint',
          isolation: 'isolate' // Ensure scroll isolation
        }}
        onScroll={(e) => {
          // Prevent scroll propagation to parent elements
          e.stopPropagation();
        }}
        onWheel={(e) => {
          // Prevent wheel events from propagating to parent
          e.stopPropagation();
        }}
      >
        <div className="bg-background rounded-lg overflow-hidden border border-border mt-4 min-h-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 md:gap-4 px-3 md:px-4 py-3 border-b border-border text-muted-foreground text-xs md:text-sm font-medium sticky top-0 bg-card/90 backdrop-blur z-10">
            <div className="col-span-1">#</div>
            <div className="col-span-9 md:col-span-5">Title</div>
            <div className="hidden md:flex col-span-3 items-center">Album</div>
            <div className="hidden md:flex col-span-2 items-center">Date Added</div>
            <div className="col-span-2 md:col-span-1 flex justify-end items-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          
          {/* Songs or Skeleton */}
          <AnimatePresence>
            {isLoading ? (
              renderSkeletonTracks()
            ) : (
              <>
                {filteredSongs.map((song: any, mapIndex: number) => {
                  // Use mapIndex to find the actual position in the original playlist
                  // We need to count how many times we've seen this song before in the filtered list
                  let occurrenceCount = 0;
                  for (let i = 0; i < mapIndex; i++) {
                    if (filteredSongs[i].id === song.id) {
                      occurrenceCount++;
                    }
                  }
                  
                  // Find the nth occurrence of this song in the original playlist
                  let foundCount = 0;
                  let originalIndex = -1;
                  for (let i = 0; i < playlist.tracks.length; i++) {
                    if (playlist.tracks[i].id === song.id) {
                      if (foundCount === occurrenceCount) {
                        originalIndex = i;
                        break;
                      }
                      foundCount++;
                    }
                  }
                  
                  const displayIndex = originalIndex !== -1 ? originalIndex + 1 : mapIndex + 1;
                  
                  const isCurrent = Boolean(
                    currentSong && (
                      (currentSong.id && song.id && String(currentSong.id) === String(song.id)) ||
                      (currentSong.name && song.name && currentSong.name.toLowerCase().trim() === song.name.toLowerCase().trim())
                    )
                  );
                  const songImage = getSongImage(song);
                  
                  // Use a unique key combining playlist ID, map index, and song ID
                  // mapIndex ensures uniqueness even when the same song appears multiple times
                  const uniqueKey = `playlist-${playlist.id}-idx-${mapIndex}-${song.id}`;
                  
                  return (
                    <SongItem
                      key={uniqueKey}
                      song={song}
                      playlistId={playlist.id}
                      isCurrent={isCurrent}
                      displayIndex={displayIndex}
                      songImage={songImage}
                      onPlaySong={playSongFromPlaylist}
                      onLikeToggle={handleLikeToggle}
                      isSongLiked={isSongLiked}
                      formatDuration={formatDuration}
                      isPlaying={isPlaying}
                      audioRef={audioRef}
                    />
                  );
                })}
                
                {/* End of playlist indicator to prevent scroll bleed-through */}
                <div className="p-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Music className="w-8 h-8 opacity-50" />
                    <p className="text-sm">End of playlist</p>
                    <p className="text-xs opacity-75">{filteredSongs.length} songs total</p>
                  </div>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Lyrics Viewer Panel */}
      <AnimatePresence>
        {isLyricsOpen && currentSong && (
          <motion.div
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-50 shadow-xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ right: isQueueOpen ? '20rem' : '0' }}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Lyrics</h3>
                <button 
                  onClick={() => setIsLyricsOpen(false)}
                  className="p-2 rounded-full hover:bg-accent"
                  aria-label="Close lyrics"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <LyricsViewer 
                  currentSong={currentSong as any}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onReportLyrics={() => console.log('Report lyrics clicked')}
                  onContributeLyrics={() => console.log('Contribute lyrics clicked')}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Panel - positioned above other content */}
      <AnimatePresence>
        {isQueueOpen && (
          <motion.div
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-50 shadow-xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ right: isLyricsOpen ? '20rem' : '0' }}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Queue</h3>
              <button 
                onClick={() => setIsQueueOpen(false)}
                className="p-2 rounded-full hover:bg-accent"
                aria-label="Close queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {playlist.tracks.map((song: any, index: any) => {
                const isCurrent = currentSong?.id === song.id;
                const playing = isCurrent && isPlaying;
                
                // Use a unique key combining playlist ID, index, and song ID
                const uniqueKey = `queue-${playlist.id}-track-${index}-${song.id}`;
                
                return (
                  <QueueItem
                    key={uniqueKey}
                    song={song}
                    index={index}
                    isCurrent={isCurrent}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlaySong={playSongFromPlaylist}
                    formatDuration={formatDuration}
                    audioRef={audioRef}
                  />
                );
              })}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      </div>
      
      {/* Playlist Editor */}
      <PlaylistEditor
        playlist={playlist}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={(updatedPlaylist) => {
          savePlaylist(updatedPlaylist as any);
          setPlaylist(updatedPlaylist);
          setIsEditorOpen(false);
        }}
        onAddTrack={(track) => {
          // In a real app, this would make an API call to add the track
          setPlaylist(prev => ({
            ...prev,
            tracks: [...prev.tracks, track],
            version: (prev.version || 0) + 1
          }));
        }}
        onRemoveTrack={(trackId) => {
          // In a real app, this would make an API call to remove the track
          setPlaylist(prev => ({
            ...prev,
            tracks: prev.tracks.filter(track => track.id !== trackId),
            version: (prev.version || 0) + 1
          }));
        }}
      />

      {/* Share Playlist Modal */}
      <SharePlaylistModal
        playlist={playlist}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};

export default EnhancedFullscreenPlaylistView;

