// HomeView.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Library,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMusic } from '@/context/MusicContext';
import { useSettings } from '@/context/SettingsContext';
import type { Song, Album } from '@/services/jiosaavnApi';
import { jiosaavnApi } from '@/services/jiosaavnApi';
import { getHighestQualityImage as getHighestQualityImageUtil, getImageUrlWithFallback } from '@/utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import PlaylistSidebar from '@/components/PlaylistSidebar';
import EnhancedFullscreenPlaylistView from '@/components/EnhancedFullscreenPlaylistView';
import { usePlaylistSidebar } from '@/context/PlaylistSidebarContext';
import { getLangCode, normalizeSongImage as normalizeSongImageUtil, balanceByLanguage, dedupeById } from '@/utils/song';
import { normalizeSongImage, isLikelyWrongImage, getCachedImage, setCachedImage } from '@/utils/songImage';

// Filter songs with bad cover art
const filterBadCovers = (songs: Song[], sectionName: string): Song[] => {
  const beforeCount = songs.length;
  const filtered = songs.filter(song => {
    const imageUrl = normalizeSongImage(song) || normalizeSongImageUtil(song);
    
    if (!imageUrl) {
      console.log(`[${sectionName}] Filtering out (no image):`, song.name);
      return false;
    }
    
    if (isLikelyWrongImage(imageUrl, song)) {
      console.log(`[${sectionName}] Filtering out (bad cover):`, song.name, imageUrl);
      return false;
    }
    
    return true;
  });
  
  console.log(`[${sectionName}] Cover filter: ${beforeCount} → ${filtered.length} (removed ${beforeCount - filtered.length})`);
  return filtered;
};
import { getSongDetails } from '@/services/jiosaavnApi';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/context/AuthContext';
import SongCard from '@/components/SongCard';
import Greeting from '@/components/Greeting';
import TrendingSongsSection from '@/components/TrendingSongsSection';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Song[];
  image?: string;
  createdAt?: Date;
  curator?: string;
  followers?: number;
  version?: number;
}

const MAX_SMALL_GRID = 6;
const MAX_EXPANDED = 30;

// High-res image fetching configuration
const HIGH_RES_BATCH_SIZE = 8;
const PREFETCH_HIGH_RES = true;

const shuffleArray = <T,>(arr: T[]) => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Fetch high-res images for songs with placeholder/wrong images
 */
const fetchHighResImages = async (songs: Song[]): Promise<Song[]> => {
  if (!PREFETCH_HIGH_RES) return songs;

  // Identify songs needing high-res fetch
  const needHighRes = songs
    .filter(s => s && s.id && (isLikelyWrongImage(s.image as any, s) && !getCachedImage(s.id)))
    .slice(0, HIGH_RES_BATCH_SIZE);

  if (needHighRes.length === 0) return songs;

  console.log(`[HighRes] Fetching ${needHighRes.length} song details for better images...`);

  // Batch fetch with error handling
  await Promise.all(
    needHighRes.map(async (song) => {
      try {
        const details = await getSongDetails(song.id);
        if (details) {
          const hiResImage = normalizeSongImage(details) || normalizeSongImage(song) || null;
          if (hiResImage && !isLikelyWrongImage(hiResImage, details)) {
            song.image = hiResImage as any;
            setCachedImage(song.id, hiResImage);
            console.log(`[HighRes] Updated image for: ${song.name}`);
          }
        }
      } catch (err) {
        console.warn(`[HighRes] Failed to fetch details for ${song.id}:`, err);
      }
    })
  );

  // Apply cached images to remaining songs
  songs.forEach(s => {
    if (s && s.id && (!s.image || isLikelyWrongImage(s.image as any, s))) {
      const cached = getCachedImage(s.id);
      if (cached) {
        s.image = cached as any;
      }
    }
  });

  return songs;
};

const HomeView: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    playSong,
    playNext,
    playPrevious,
    togglePlayPause,
    setQueue,
    isSongLiked,
    addToLikedSongs,
    removeFromLikedSongs,
    volume,
    setVolume,
    currentTime,
    duration,
    seekTo,
    setPlaylistAndPlay,
  } = useMusic();

  const { settings } = useSettings();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Data states
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [romanceSongs, setRomanceSongs] = useState<Song[]>([]);
  const [mixedRomanceSongs, setMixedRomanceSongs] = useState<Song[]>([]);
  const [malayalamSongs, setMalayalamSongs] = useState<Song[]>([]);
  const [tamilSongs, setTamilSongs] = useState<Song[]>([]);

  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPlaylistSidebarOpen, togglePlaylistSidebar } = usePlaylistSidebar();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [sidebarAnimating, setSidebarAnimating] = useState(false);

  // Loading & refreshing flags
  const [isNewReleasesLoading, setIsNewReleasesLoading] = useState(false);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [isMalayalamLoading, setIsMalayalamLoading] = useState(false);
  const [isTamilLoading, setIsTamilLoading] = useState(false);
  const [isRomanceLoading, setIsRomanceLoading] = useState(false);
  const [isMixedRomanceLoading, setIsMixedRomanceLoading] = useState(false);

  const [isRefreshingNewReleases, setIsRefreshingNewReleases] = useState(false);
  const [isRefreshingTrending, setIsRefreshingTrending] = useState(false);
  const [isRefreshingMalayalam, setIsRefreshingMalayalam] = useState(false);
  const [isRefreshingTamil, setIsRefreshingTamil] = useState(false);
  const [isRefreshingRomance, setIsRefreshingRomance] = useState(false);
  const [isRefreshingMixedRomance, setIsRefreshingMixedRomance] = useState(false);

  // Show-all toggles
  const [showAllNewReleases, setShowAllNewReleases] = useState(false);
  const [showAllRecentlyPlayed, setShowAllRecentlyPlayed] = useState(false);
  const [showAllMixedRomance, setShowAllMixedRomance] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [showAllRomance, setShowAllRomance] = useState(false);
  const [showAllMalayalam, setShowAllMalayalam] = useState(false);
  const [showAllTamil, setShowAllTamil] = useState(false);

  // Local development duplicate detector (optional)
  useEffect(() => {
    const warnDuplicates = (arr: Song[], name: string) => {
      if (!arr || arr.length === 0) return;
      const keys = arr.map(s => s.id);
      const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
      if (dup.length) {
        console.warn(`[Duplicate keys detected in ${name}]`, Array.from(new Set(dup)).slice(0, 20));
      }
    };
    warnDuplicates(newReleases, 'newReleases');
    warnDuplicates(trendingSongs, 'trendingSongs');
    warnDuplicates(recentlyPlayed, 'recentlyPlayed');
    warnDuplicates(romanceSongs, 'romanceSongs');
    warnDuplicates(mixedRomanceSongs, 'mixedRomanceSongs');
  }, [newReleases, trendingSongs, recentlyPlayed, romanceSongs, mixedRomanceSongs]);

  // Helper to filter out short songs (previews/snippets)
  const filterFullLengthSongs = (songs: Song[]): Song[] => {
    return songs.filter(song => {
      const duration = Number(song.duration) || 0;
      return duration >= 90; // At least 1.5 minutes
    });
  };

  // Fetch helpers (kept simple; adapt to your services)
  const fetchNewReleasesData = useCallback(async () => {
    setIsNewReleasesLoading(true);
    try {
      // Fetch from multiple language sources including English
      const [mal, ta, hi, en] = await Promise.all([
        jiosaavnApi.getTrendingSongs?.() ?? [],
        jiosaavnApi.getTamilTrendingSongs?.() ?? [],
        jiosaavnApi.getHindiTrendingSongs?.() ?? [],
        (jiosaavnApi as any).getEnglishNewReleases?.() ?? []
      ]);

      console.log('Fetched songs by language:', {
        malayalam: mal.length,
        tamil: ta.length,
        hindi: hi.length,
        english: en.length
      });

      // Combine all results
      const combined = [...(mal || []), ...(ta || []), ...(hi || []), ...(en || [])];

      // Remove duplicates
      const unique = dedupeById(combined);

      console.log('Combined unique songs:', unique.length);

      // Normalize images for all songs
      const normalized = unique.map(s => ({
        ...s,
        image: normalizeSongImage(s) || normalizeSongImageUtil(s) || (s as any).image || null
      }));

      // Filter out English songs and short songs
      const newReleasesCandidates = normalized.filter(s => {
        const isNotEnglish = getLangCode(s.language) !== 'EN';
        const duration = Number(s.duration) || 0;
        const isFullLength = duration >= 90;
        return isNotEnglish && isFullLength;
      });

      console.log('[NewReleases] After filtering:', normalized.length, '→', newReleasesCandidates.length);

      // Balance languages: ML, TA, HI only
      const allowed = ['ML', 'TA', 'HI'];
      let balanced = balanceByLanguage(newReleasesCandidates, allowed, 25);

      // Fetch high-res images for songs with placeholders
      balanced = await fetchHighResImages(balanced as Song[]);

      // Filter out songs with bad cover art
      balanced = filterBadCovers(balanced as Song[], 'NewReleases') as any;

      setNewReleases(balanced as Song[]);
    } catch (err) {
      console.error('Failed to fetch new releases:', err);
      setError('Failed to load new releases');
      setNewReleases([]);
    } finally {
      setIsNewReleasesLoading(false);
    }
  }, []);

  const fetchTrendingSongsData = useCallback(async () => {
    setIsTrendingLoading(true);
    try {
      const [mal, ta, hi] = await Promise.all([
        jiosaavnApi.getTrendingSongs?.() ?? [],
        jiosaavnApi.getTamilTrendingSongs?.() ?? [],
        jiosaavnApi.getHindiTrendingSongs?.() ?? [],
      ]);

      // Combine and dedupe
      const combined = dedupeById([...(mal || []), ...(ta || []), ...(hi || [])]);

      // Normalize images for all songs
      const normalized = combined.map(s => ({
        ...s,
        image: normalizeSongImage(s) || normalizeSongImageUtil(s) || (s as any).image || null
      }));

      // Filter out short songs
      const fullLengthSongs = normalized.filter(s => {
        const duration = Number(s.duration) || 0;
        return duration >= 90;
      });

      console.log('[Trending] After filtering:', normalized.length, '→', fullLengthSongs.length);

      // Balance languages: ML, TA, HI only (exclude English)
      const allowed = ['ML', 'TA', 'HI'];
      let balanced = balanceByLanguage(fullLengthSongs, allowed, 25);

      // Fetch high-res images for songs with placeholders
      balanced = await fetchHighResImages(balanced as Song[]);

      setTrendingSongs(balanced as Song[]);
    } catch (err) {
      console.error('Failed to fetch trending songs:', err);
      setError('Failed to load trending songs');
      setTrendingSongs([]);
    } finally {
      setIsTrendingLoading(false);
    }
  }, []);

  const fetchRomanceSongsData = useCallback(async () => {
    setIsRomanceLoading(true);
    try {
      const mal = await jiosaavnApi.getMalayalamRomanceSongs?.() ?? [];

      // Filter out short songs
      const fullLength = mal.filter(s => {
        const duration = Number(s.duration) || 0;
        return duration >= 90;
      });

      const shuffled = shuffleArray(fullLength).slice(0, 50);
      const filtered = filterBadCovers(shuffled, 'Romance');
      setRomanceSongs(filtered);
    } catch (err) {
      console.error('Failed to fetch romance songs:', err);
      setError('Failed to load romantic hits');
    } finally {
      setIsRomanceLoading(false);
    }
  }, []);

  const fetchMixedRomanceSongsData = useCallback(async () => {
    setIsMixedRomanceLoading(true);
    try {
      const [mal, hi, ta] = await Promise.all([
        jiosaavnApi.getMalayalamRomanceSongs?.() ?? [],
        jiosaavnApi.getHindiRomanceSongs?.() ?? [],
        jiosaavnApi.getTamilRomanceSongs?.() ?? [],
      ]);
      const all = dedupeById([...(mal || []), ...(hi || []), ...(ta || [])]);

      // Filter out short songs
      const fullLength = all.filter(s => {
        const duration = Number(s.duration) || 0;
        return duration >= 90;
      });

      setMixedRomanceSongs(shuffleArray(fullLength).slice(0, 25) as Song[]);
    } catch (err) {
      console.error('Failed to fetch mixed romance songs:', err);
      setError('Failed to load mixed romance songs');
    } finally {
      setIsMixedRomanceLoading(false);
    }
  }, []);

  const fetchMalayalamSongsData = useCallback(async () => {
    setIsMalayalamLoading(true);
    try {
      // Fetch Malayalam songs from trending and romance
      const [trending, romance] = await Promise.all([
        jiosaavnApi.getTrendingSongs?.() ?? [],
        jiosaavnApi.getMalayalamRomanceSongs?.() ?? [],
      ]);

      // Combine and dedupe
      const combined = dedupeById([...(trending || []), ...(romance || [])]);

      // Normalize images for all songs
      const normalized = combined.map(s => ({
        ...s,
        image: normalizeSongImage(s) || normalizeSongImageUtil(s) || (s as any).image || null
      }));

      // Filter for Malayalam language only and full-length songs
      const malayalamOnly = normalized.filter(s => {
        const isMalayalam = getLangCode(s.language) === 'ML';
        const duration = Number(s.duration) || 0;
        const isFullLength = duration >= 90;
        return isMalayalam && isFullLength;
      });

      console.log('[Malayalam] After filtering:', normalized.length, '→', malayalamOnly.length);

      // Shuffle and limit
      let shuffled = shuffleArray(malayalamOnly).slice(0, 50) as Song[];

      // Fetch high-res images for songs with placeholders
      shuffled = await fetchHighResImages(shuffled);

      // Filter out songs with bad cover art
      shuffled = filterBadCovers(shuffled, 'Malayalam');

      setMalayalamSongs(shuffled);
    } catch (err) {
      console.error('Failed to fetch Malayalam songs:', err);
      setError('Failed to load Malayalam hits');
      setMalayalamSongs([]);
    } finally {
      setIsMalayalamLoading(false);
    }
  }, []);

  const fetchTamilSongsData = useCallback(async () => {
    setIsTamilLoading(true);
    try {
      // Fetch Tamil songs from trending and romance
      const [trending, romance] = await Promise.all([
        jiosaavnApi.getTamilTrendingSongs?.() ?? [],
        jiosaavnApi.getTamilRomanceSongs?.() ?? [],
      ]);

      // Combine and dedupe
      const combined = dedupeById([...(trending || []), ...(romance || [])]);

      // Normalize images for all songs
      const normalized = combined.map(s => ({
        ...s,
        image: normalizeSongImage(s) || normalizeSongImageUtil(s) || (s as any).image || null
      }));

      // Filter for Tamil language only and full-length songs
      const tamilOnly = normalized.filter(s => {
        const isTamil = getLangCode(s.language) === 'TA';
        const duration = Number(s.duration) || 0;
        const isFullLength = duration >= 90;
        return isTamil && isFullLength;
      });

      console.log('[Tamil] After filtering:', normalized.length, '→', tamilOnly.length);

      // Shuffle and limit
      let shuffled = shuffleArray(tamilOnly).slice(0, 50) as Song[];

      // Fetch high-res images for songs with placeholders
      shuffled = await fetchHighResImages(shuffled);

      // Filter out songs with bad cover art
      shuffled = filterBadCovers(shuffled, 'Tamil');

      setTamilSongs(shuffled);
    } catch (err) {
      console.error('Failed to fetch Tamil songs:', err);
      setError('Failed to load Tamil hits');
      setTamilSongs([]);
    } finally {
      setIsTamilLoading(false);
    }
  }, []);

  const fetchRecentlyPlayedData = useCallback(async () => {
    // Read from localStorage and migrate to high-quality images
    try {
      const saved = localStorage.getItem('recentlyPlayed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrate: normalize all images to highest quality
          let changed = false;
          const normalized = parsed.map((song: Song) => {
            const highQualityUrl = getHighestQualityImageUtil(song.image);
            const currentImage = typeof song.image === 'string' ? song.image : null;

            // Check if normalization changed the image
            if (highQualityUrl !== currentImage) {
              changed = true;
            }

            return {
              ...song,
              image: highQualityUrl || currentImage || null
            };
          });

          // If any images were upgraded, save back to localStorage
          if (changed) {
            console.log('[RecentlyPlayed] Migrated', normalized.length, 'songs to high-quality images');
            try {
              localStorage.setItem('recentlyPlayed', JSON.stringify(normalized));
            } catch (e) {
              console.error('[RecentlyPlayed] Failed to save migrated data', e);
            }
          }

          setRecentlyPlayed(normalized as unknown as Song[]);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to parse recently played from localStorage', err);
      // Clear corrupted data
      localStorage.removeItem('recentlyPlayed');
    }

    // If no recently played songs, populate with some trending songs as suggestions
    try {
      const trending = await jiosaavnApi.getTrendingSongs?.() ?? [];
      if (trending.length > 0) {
        const suggestions = trending.slice(0, 6);
        setRecentlyPlayed(suggestions);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions for recently played', err);
    }
  }, []);

  // Fetch all on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchNewReleasesData(),
          fetchTrendingSongsData(),
          fetchRomanceSongsData(),
          fetchMixedRomanceSongsData(),
          fetchRecentlyPlayedData(),
          fetchMalayalamSongsData(),
          fetchTamilSongsData(),
        ]);
      } catch (err) {
        console.error('Initial fetch failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [
    fetchNewReleasesData,
    fetchTrendingSongsData,
    fetchRomanceSongsData,
    fetchMixedRomanceSongsData,
    fetchRecentlyPlayedData,
    fetchMalayalamSongsData,
    fetchTamilSongsData,
  ]);

  // Save recently played when currentSong changes - with image normalization
  useEffect(() => {
    if (!currentSong) return;

    // Normalize current song image to highest quality before saving
    const normalizedCurrentSong = {
      ...currentSong,
      image: getHighestQualityImageUtil(currentSong.image) || currentSong.image || null
    };

    setRecentlyPlayed(prev => {
      // Remove duplicates
      const filtered = prev.filter(song => song.id !== normalizedCurrentSong.id);
      // Add to beginning and limit to 50
      const updated = [normalizedCurrentSong, ...filtered].slice(0, 50);

      // Save to localStorage with normalized images
      try {
        localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recently played', e);
      }

      return updated as Song[];
    });
  }, [currentSong]);

  // Refresh handlers
  const handleRefreshNewReleases = async () => {
    setIsRefreshingNewReleases(true);
    try {
      await fetchNewReleasesData();
    } finally {
      setIsRefreshingNewReleases(false);
    }
  };

  const handleRefreshTrending = async () => {
    setIsRefreshingTrending(true);
    try {
      await fetchTrendingSongsData();
    } finally {
      setIsRefreshingTrending(false);
    }
  };

  const handleRefreshMalayalam = async () => {
    setIsRefreshingMalayalam(true);
    try {
      await fetchMalayalamSongsData();
    } finally {
      setIsRefreshingMalayalam(false);
    }
  };

  const handleRefreshTamil = async () => {
    setIsRefreshingTamil(true);
    try {
      await fetchTamilSongsData();
    } finally {
      setIsRefreshingTamil(false);
    }
  };

  // Helper function to get image URL from song - always returns highest quality
  const getSongImageUrl = (song: Song): string => {
    try {
      // Always use the utility function to get highest quality image
      // This provides defensive rendering even if normalization was missed
      return getImageUrlWithFallback(song.image, 'No Image');
    } catch (error) {
      console.error('[getSongImageUrl] Error:', error, song);
      return getImageUrlWithFallback(null, 'Error');
    }
  };

  // Convert songs to compatible format for the player
  const convertSongsForPlayer = (songs: Song[]): any[] => {
    return songs.map(song => {
      // Get the best quality download URL
      let audioUrl = '';
      if ((song as any).downloadUrl && Array.isArray((song as any).downloadUrl)) {
        // Sort by quality and get the highest quality URL
        const sortedUrls = [...(song as any).downloadUrl].sort((a, b) => {
          const qualityA = parseInt(a.quality || '0');
          const qualityB = parseInt(b.quality || '0');
          return qualityB - qualityA;
        });
        audioUrl = sortedUrls[0]?.link || '';
      }

      // Fallback to url property if downloadUrl is not available
      if (!audioUrl) {
        audioUrl = (song as any).url || '';
      }

      // Log if no audio URL found
      if (!audioUrl) {
        console.warn('[convertSongsForPlayer] No audio URL found for song:', song.name, 'Song data:', song);
      }

      // Process images - keep the normalized string format
      let imageUrl = '';

      // If image is already a normalized string (from our normalization), use it directly
      if (typeof (song as any).image === 'string') {
        imageUrl = (song as any).image;
      }
      // If image is still an array (legacy format), normalize it
      else if (Array.isArray((song as any).image) && (song as any).image.length > 0) {
        const images = (song as any).image;

        // If images are objects with quality and link
        if (typeof images[0] === 'object' && images[0] !== null && 'link' in images[0]) {
          // Sort by quality (highest first) and extract the best link
          const sortedImages = [...images].sort((a, b) => {
            const getQualityValue = (quality?: string): number => {
              if (!quality) return 0;
              const match = quality.match(/(\d+)x(\d+)/);
              if (match) {
                return parseInt(match[1], 10) * parseInt(match[2], 10);
              }
              return 0;
            };
            return getQualityValue(b.quality) - getQualityValue(a.quality);
          });
          imageUrl = sortedImages[0]?.link || '';
        } else if (typeof images[0] === 'string') {
          // If images are strings, pick the first one
          imageUrl = images[0];
        }
      }

      const convertedSong = {
        ...song,
        image: imageUrl || '', // Keep as string, not array
        url: audioUrl,
        duration: (song as any).duration || 0
      };

      // Log the converted song for debugging
      if (!audioUrl) {
        console.error('[convertSongsForPlayer] Converted song has no URL:', convertedSong);
      }

      return convertedSong;
    });
  };

  // Enhanced sidebar toggle with animation states
  const handleToggleSidebar = () => {
    setSidebarAnimating(true);
    togglePlaylistSidebar();
    // Reset animation state after transition completes
    setTimeout(() => setSidebarAnimating(false), 300);
  };

  return (
    <div className="flex w-full h-full">
      {/* Main content - responsive to playlist sidebar with smooth attached animation */}
      <motion.div
        className="flex-1 overflow-auto scrollbar-hide"
        style={{ willChange: 'margin-right' }}
        animate={{
          marginRight: isPlaylistSidebarOpen ? 320 : 0,
        }}
        transition={{
          duration: 0.25,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {selectedPlaylist && (
          <EnhancedFullscreenPlaylistView
            playlist={{
              ...selectedPlaylist,
              description: selectedPlaylist.description || '',
              createdAt: selectedPlaylist.createdAt || new Date(),
              version: selectedPlaylist.version || 1
            }}
            onClose={() => setSelectedPlaylist(null)}
          />
        )}

        {/* Fixed Greeting at top */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 md:px-8 lg:px-12 py-4">
          <Greeting />
        </div>

        {/* Content wrapper with horizontal padding */}
        <div className="px-6 md:px-8 lg:px-12">
          {/* Hero & Search */}
          <motion.div
            className="relative rounded-2xl bg-gradient-to-r from-red-600 to-purple-700 p-6 md:p-8 text-white shadow-lg mt-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="max-w-2xl flex-1">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">Discover Your Music</h1>
                <p className="text-red-100 mb-6">Listen to millions of songs, anytime, anywhere</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={handleToggleSidebar}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${isPlaylistSidebarOpen
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    backgroundColor: isPlaylistSidebarOpen ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                    color: isPlaylistSidebarOpen ? '#ffffff' : '#ffffff'
                  }}
                >
                  <motion.div
                    animate={{ rotate: isPlaylistSidebarOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Library className="w-5 h-5" />
                  </motion.div>
                  <span className="hidden sm:inline">
                    {isPlaylistSidebarOpen ? 'Hide Library' : 'Your Library'}
                  </span>
                </motion.button>

                {/* Profile Dropdown */}
                <ProfileDropdown
                  userName={user?.displayName || 'Music Lover'}
                  userEmail={user?.email || 'user@musicapp.com'}
                  userAvatar={user?.photoURL || undefined}
                  userId={user?.uid}
                  onLogout={async () => {
                    try {
                      await logout();
                      navigate('/login');
                    } catch (error) {
                      console.error('Logout failed:', error);
                    }
                  }}
                />
              </div>
            </div>

            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/search/${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search songs, artists, or playlists..."
                className="w-full pl-12 pr-4 py-2 rounded-lg bg-white bg-opacity-10 placeholder-gray-200"
              />
            </div>
          </motion.div>

          {/* Trending Now - Grid Layout with Sophisticated Features */}
          <div className="mt-8">
            <TrendingSongsSection 
              limit={25}
              initialShowCount={6}
              autoRefresh={true}
              refreshInterval={60000}
            />
          </div>

          {/* New Releases */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">New Releases</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshNewReleases}
                  disabled={isRefreshingNewReleases}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  {isRefreshingNewReleases ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>

                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowAllNewReleases(!showAllNewReleases)}>
                  {showAllNewReleases ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>

            {isNewReleasesLoading ? (
              <div className="flex justify-center items-center h-32">
                <motion.div
                  className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={fetchNewReleasesData}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {newReleases.slice(0, showAllNewReleases ? MAX_EXPANDED : MAX_SMALL_GRID).map((song, idx) => (
                    <SongCard
                      key={`new-${song.id}`}
                      song={song}
                      playlist={convertSongsForPlayer(newReleases)}
                      index={idx}
                      showNewBadge={true}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recently Played */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Recently Played</h2>
              <div className="flex items-center gap-2">
                {recentlyPlayed.length > 0 && (
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setRecentlyPlayed([]);
                      localStorage.removeItem('recentlyPlayed');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowAllRecentlyPlayed(!showAllRecentlyPlayed)}>
                  {showAllRecentlyPlayed ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recentlyPlayed.slice(0, showAllRecentlyPlayed ? 50 : MAX_SMALL_GRID).map((song, idx) => (
                <SongCard
                  key={`recent-${song.id}`}
                  song={song}
                  playlist={convertSongsForPlayer(recentlyPlayed)}
                  index={idx}
                />
              ))}
            </div>
          </div>

        {/* Malayalam */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Malayalam Hits</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshMalayalam}
                disabled={isRefreshingMalayalam}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                {isRefreshingMalayalam ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowAllMalayalam(!showAllMalayalam)}>
                {showAllMalayalam ? 'Show Less' : 'See All'}
              </Button>
            </div>
          </div>

          {isMalayalamLoading ? (
            <div className="flex justify-center items-center h-32">
              <motion.div
                className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : malayalamSongs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No Malayalam songs available</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchMalayalamSongsData}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {malayalamSongs.slice(0, showAllMalayalam ? 50 : MAX_SMALL_GRID).map((song, idx) => (
                <SongCard
                  key={`malayalam-${song.id}`}
                  song={song}
                  playlist={convertSongsForPlayer(malayalamSongs)}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tamil */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Tamil Hits</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshTamil}
                disabled={isRefreshingTamil}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                {isRefreshingTamil ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowAllTamil(!showAllTamil)}>
                {showAllTamil ? 'Show Less' : 'See All'}
              </Button>
            </div>
          </div>

          {isTamilLoading ? (
            <div className="flex justify-center items-center h-32">
              <motion.div
                className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : tamilSongs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No Tamil songs available</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchTamilSongsData}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tamilSongs.slice(0, showAllTamil ? 50 : MAX_SMALL_GRID).map((song, idx) => (
                <SongCard
                  key={`tamil-${song.id}`}
                  song={song}
                  playlist={convertSongsForPlayer(tamilSongs)}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
        {/* End content wrapper */}
      </div>
      </motion.div>

      {/* Playlist Sidebar - Attached to the right without blur */}
      <PlaylistSidebar
        isOpen={isPlaylistSidebarOpen}
        onClose={handleToggleSidebar}
        onPlaylistSelect={(playlist) => {
          setSelectedPlaylist({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            tracks: playlist.tracks,
            image: playlist.image,
            createdAt: playlist.createdAt,
            version: playlist.version
          });
        }}
      />
    </div>
  );
};

export default HomeView;