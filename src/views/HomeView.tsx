// HomeView.tsx
import { getPublicFeaturedSongs, type FeaturedSong as AdminFeaturedSong } from '@/services/adminApi';
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
import { useScrollOptimization } from '@/hooks/useScrollOptimization';
import { getLangCode, normalizeSongImage as normalizeSongImageUtil, balanceByLanguage, dedupeSongs } from '@/utils/song';
import { normalizeSongImage, isLikelyWrongImage, getCachedImage, setCachedImage } from '@/utils/songImage';

// Filter songs with bad cover art
const filterBadCovers = (songs: Song[], sectionName: string): Song[] => {
  const beforeCount = songs.length;
  const filtered = songs.filter(song => {
    const imageUrl = normalizeSongImage(song) || normalizeSongImageUtil(song);
    
    // Removed verbose logging for cleaner console
    if (!imageUrl) {
      return false;
    }
    
    if (isLikelyWrongImage(imageUrl, song)) {
      return false;
    }
    
    return true;
  });
  
  // Removed verbose logging for cleaner console
  return filtered;
};
import { getSongDetails } from '@/services/jiosaavnApi';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/context/AuthContext';
import SongCard from '@/components/SongCard';
import Greeting from '@/components/Greeting';
import TrendingSongsSection from '@/components/TrendingSongsSection';
import ErrorBoundary, { ErrorFallback } from '@/components/ErrorBoundary';
import NowPlayingSection from '@/components/NowPlayingSection';
import { useSocial } from '@/context/SocialContext';
import { getRecommendations, isDevotionalOrReligious } from '@/services/recommendationService';
import { enforceCrossMovieVariety } from '@/utils/deduplication';

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

// Simple loading skeleton component for better perceived performance
const SongCardSkeleton = () => (
  <div className="bg-white/5 rounded-lg p-4 animate-pulse">
    <div className="aspect-square bg-white/10 rounded-lg mb-3"></div>
    <div className="h-4 bg-white/10 rounded mb-2"></div>
    <div className="h-3 bg-white/10 rounded w-3/4"></div>
  </div>
);

const LoadingGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
    {Array.from({ length: count }, (_, i) => (
      <SongCardSkeleton key={i} />
    ))}
  </div>
);

// High-res image fetching configuration - OPTIMIZED for faster loading
const HIGH_RES_BATCH_SIZE = 4; // Reduced from 8
const PREFETCH_HIGH_RES = false; // Disabled for faster initial load

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

  // Removed verbose logging for cleaner console

  // Batch fetch with improved error handling and delays
  const results = await Promise.allSettled(
    needHighRes.map(async (song, index) => {
      try {
        // Add staggered delay to avoid overwhelming the API
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 200 * index));
        }

        const details = await getSongDetails(song.id);
        if (details) {
          const hiResImage = normalizeSongImage(details) || normalizeSongImage(song) || null;
          if (hiResImage && !isLikelyWrongImage(hiResImage, details)) {
            song.image = hiResImage as any;
            setCachedImage(song.id, hiResImage);
            // Removed verbose logging for cleaner console
            return { success: true, song: song.name };
          }
        }
        return { success: false, song: song.name, reason: 'no_better_image' };
      } catch (err: any) {
        // Handle specific error types gracefully
        if (err?.response?.status === 404) {
          console.warn(`[HighRes] Song not found (404): ${song.name} (${song.id})`);
          // Cache the failure to avoid retrying
          setCachedImage(song.id, 'not_found');
          return { success: false, song: song.name, reason: '404' };
        } else if (err?.response?.status === 403) {
          console.warn(`[HighRes] Rate limited for: ${song.name}`);
          return { success: false, song: song.name, reason: 'rate_limit' };
        } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
          console.warn(`[HighRes] Timeout fetching: ${song.name}`);
          return { success: false, song: song.name, reason: 'timeout' };
        } else {
          console.warn(`[HighRes] Failed to fetch details for ${song.id}:`, err?.message || err);
          return { success: false, song: song.name, reason: 'error' };
        }
      }
    })
  );

  // Log summary of results
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  // Removed verbose logging for cleaner console

  // Apply cached images to remaining songs
  songs.forEach(s => {
    if (s && s.id && (!s.image || isLikelyWrongImage(s.image as any, s))) {
      const cached = getCachedImage(s.id);
      if (cached && cached !== 'not_found') {
        s.image = cached as any;
      }
    }
  });

  return songs;
};

const HomeView: React.FC = () => {
  const {
    currentSong,
    setPlaylistAndPlay,
  } = useMusic();

  // Add scroll optimization
  useScrollOptimization();


  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Data states
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [romanceSongs, setRomanceSongs] = useState<Song[]>([]);
  const [mixedRomanceSongs, setMixedRomanceSongs] = useState<Song[]>([]);
  const [malayalamSongs, setMalayalamSongs] = useState<Song[]>([]);
  const [tamilSongs, setTamilSongs] = useState<Song[]>([]);

  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPlaylistSidebarOpen, togglePlaylistSidebar } = usePlaylistSidebar();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [, setSidebarAnimating] = useState(false);

  // Loading & refreshing flags
  const [isNewReleasesLoading, setIsNewReleasesLoading] = useState(false);
  const [, setIsTrendingLoading] = useState(false);
  const [isMalayalamLoading, setIsMalayalamLoading] = useState(false);
  const [isTamilLoading, setIsTamilLoading] = useState(false);
  const [, setIsRomanceLoading] = useState(false);
  const [, setIsMixedRomanceLoading] = useState(false);

  const [isRefreshingNewReleases, setIsRefreshingNewReleases] = useState(false);
  const [, setIsRefreshingTrending] = useState(false);
  const [isRefreshingMalayalam, setIsRefreshingMalayalam] = useState(false);
  const [isRefreshingTamil, setIsRefreshingTamil] = useState(false);
  const [, setIsRefreshingRomance] = useState(false);
  const [, setIsRefreshingMixedRomance] = useState(false);

  // Show-all toggles
  const [showAllNewReleases, setShowAllNewReleases] = useState(false);
  const [showAllRecentlyPlayed, setShowAllRecentlyPlayed] = useState(false);
  const [showAllForYou, setShowAllForYou] = useState(false);

  // ── For You Recommendations ────────────────────────────────────────────
  const { likedSongs } = useMusic();
  const { recentlyPlayed: socialHistory } = useSocial();
  const [forYouSongs, setForYouSongs] = useState<any[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);

  // ── Featured Songs (Admin curated) ──────────────────────────────────────
  const [featuredSongs, setFeaturedSongs] = useState<AdminFeaturedSong[]>([]);

  useEffect(() => {
    getPublicFeaturedSongs()
      .then(res => { if (res.success) setFeaturedSongs(res.songs); })
      .catch(() => {});
  }, []);

  const fetchForYou = useCallback(async () => {
    setForYouLoading(true);
    try {
      const recs = await getRecommendations(likedSongs as any, socialHistory, 20);
      const secularRecs = recs.filter(s => !isDevotionalOrReligious(s));
      const variedRecs = enforceCrossMovieVariety(secularRecs as any);
      setForYouSongs(variedRecs.slice(0, 20));
    } catch {
      setForYouSongs([]);
    } finally {
      setForYouLoading(false);
    }
  }, [likedSongs, socialHistory]);

  useEffect(() => {
    // Initial fetch for "For You"
    const timer = setTimeout(() => fetchForYou(), 1500);

    // Auto refresh recommendations every 10 minutes for fresh content rotation
    const interval = setInterval(() => {
      fetchForYou();
    }, 600000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchForYou]);

  const [showAllMalayalam, setShowAllMalayalam] = useState(false);
  const [showAllTamil, setShowAllTamil] = useState(false);

  // Local development duplicate detector (optional) - DISABLED for better performance
  // useEffect(() => {
  //   const warnDuplicates = (arr: Song[], name: string) => {
  //     if (!arr || arr.length === 0) return;
  //     const keys = arr.map(s => s.id);
  //     const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  //     if (dup.length) {
  //       console.warn(`[Duplicate keys detected in ${name}]`, Array.from(new Set(dup)).slice(0, 20));
  //     }
  //   };
  //   warnDuplicates(newReleases, 'newReleases');
  //   warnDuplicates(trendingSongs, 'trendingSongs');
  //   warnDuplicates(recentlyPlayed, 'recentlyPlayed');
  //   warnDuplicates(romanceSongs, 'romanceSongs');
  //   warnDuplicates(mixedRomanceSongs, 'mixedRomanceSongs');
  // }, [newReleases, trendingSongs, recentlyPlayed, romanceSongs, mixedRomanceSongs]);





  // Fetch helpers - OPTIMIZED for faster loading
  const fetchNewReleasesData = useCallback(async () => {
    setIsNewReleasesLoading(true);
    try {
      // OPTIMIZED: Fetch only Malayalam trending first (fastest)
      const mal = await jiosaavnApi.getTrendingSongs?.() ?? [];
      
      // Removed verbose logging for cleaner console

      // Remove duplicates using enhanced deduplication
      const unique = dedupeSongs(mal);

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

      // Removed verbose logging for cleaner console

      // Take first 25 songs for faster loading
      let balanced = newReleasesCandidates.slice(0, 25);

      // Skip high-res image fetching for faster initial load
      // balanced = await fetchHighResImages(balanced as Song[]);

      // Filter out songs with bad cover art
      balanced = filterBadCovers(balanced as Song[], 'NewReleases') as any;

      // Removed verbose logging for cleaner console
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
      // OPTIMIZED: Fetch only Malayalam trending for faster loading
      const mal = await jiosaavnApi.getTrendingSongs?.() ?? [];

      // Remove duplicates using enhanced deduplication
      const unique = dedupeSongs(mal);

      // Normalize images for all songs
      const normalized = unique.map(s => ({
        ...s,
        image: normalizeSongImage(s) || normalizeSongImageUtil(s) || (s as any).image || null
      }));

      // Filter out short songs
      const fullLengthSongs = normalized.filter(s => {
        const duration = Number(s.duration) || 0;
        return duration >= 90;
      });

      // Removed verbose logging for cleaner console

      // Take first 25 songs for faster loading
      let balanced = fullLengthSongs.slice(0, 25);

      // Skip high-res image fetching for faster initial load
      // balanced = await fetchHighResImages(balanced as Song[]);

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
      const all = dedupeSongs([...(mal || []), ...(hi || []), ...(ta || [])]);

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
      // OPTIMIZED: Fetch only trending Malayalam songs for faster loading
      const trending = await jiosaavnApi.getTrendingSongs?.() ?? [];

      // Normalize images for all songs
      const normalized = trending.map(s => ({
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

      // Removed verbose logging for cleaner console

      // Shuffle and limit to 25 for faster loading
      let shuffled = shuffleArray(malayalamOnly).slice(0, 25) as Song[];

      // Skip high-res image fetching for faster initial load
      // shuffled = await fetchHighResImages(shuffled);

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
      // OPTIMIZED: Fetch only Tamil trending songs for faster loading
      const trending = await jiosaavnApi.getTamilTrendingSongs?.() ?? [];

      // Normalize images for all songs
      const normalized = trending.map(s => ({
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

      // Removed verbose logging for cleaner console

      // Shuffle and limit to 25 for faster loading
      let shuffled = shuffleArray(tamilOnly).slice(0, 25) as Song[];

      // Skip high-res image fetching for faster initial load
      // shuffled = await fetchHighResImages(shuffled);

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
            // Removed verbose logging for cleaner console
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

  // Fetch all on mount - OPTIMIZED: Load essential content first, then secondary content
  useEffect(() => {
    const fetchEssentialContent = async () => {
      setLoading(true);
      try {
        // Load only the most important content first (trending songs)
        await Promise.all([
          fetchTrendingSongsData(),
          fetchRecentlyPlayedData(), // This is fast as it's from localStorage
        ]);
        
        // Load secondary content after a short delay to improve perceived performance
        setTimeout(async () => {
          try {
            await Promise.all([
              fetchNewReleasesData(),
              fetchMalayalamSongsData(),
              fetchTamilSongsData(),
            ]);
            
            // Load romance content last (least priority)
            setTimeout(async () => {
              try {
                await Promise.all([
                  fetchRomanceSongsData(),
                  fetchMixedRomanceSongsData(),
                ]);
              } catch (err) {
                console.error('Romance content fetch failed', err);
              }
            }, 500);
          } catch (err) {
            console.error('Secondary content fetch failed', err);
          }
        }, 200);
        
      } catch (err) {
        console.error('Essential content fetch failed', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    fetchEssentialContent();
  }, []); // Remove dependencies to prevent unnecessary re-fetching

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
      {/* Fullscreen Playlist View - Render at top level when active */}
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

      {/* Main content - OPTIMIZED: Reduced animations for better scroll performance */}
      {!selectedPlaylist && (
        <div
          className="flex-1 overflow-auto scrollbar-hide"
          style={{ 
            marginRight: isPlaylistSidebarOpen ? 320 : 0,
            scrollBehavior: 'auto', // Remove smooth scrolling for better performance
            contain: 'layout style paint', // Optimize rendering
            overscrollBehavior: 'contain' // Prevent overscroll bounce
          }}
        >

        {/* OPTIMIZED: Simplified sticky header without heavy backdrop blur */}
        <div className="sticky top-0 z-30 bg-background border-b border-border px-6 md:px-8 lg:px-12 py-4">
          <Greeting />
        </div>

        {/* Content wrapper with horizontal padding */}
        <div className="px-6 md:px-8 lg:px-12">
          {/* OPTIMIZED: Reduced hero animations */}
          <div className="relative rounded-2xl bg-gradient-to-r from-red-600 to-purple-700 p-4 md:p-6 text-white shadow-lg mt-6">
            <div className="flex justify-between items-start mb-3">
              <div className="max-w-2xl flex-1">
                <h1 className="text-xl md:text-2xl font-bold mb-1">Discover Your Music</h1>
                <p className="text-red-100 mb-4 text-sm md:text-base">Listen to millions of songs, anytime, anywhere</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleSidebar}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${isPlaylistSidebarOpen
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    }`}
                >
                  <div
                    style={{ transform: isPlaylistSidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <Library className="w-5 h-5" />
                  </div>
                  <span className="hidden sm:inline">
                    {isPlaylistSidebarOpen ? 'Hide Library' : 'Your Library'}
                  </span>
                </button>

                {/* Profile Dropdown */}
                <ProfileDropdown
                  userName={user?.displayName || 'Music Lover'}
                  userEmail={user?.email || 'user@musicapp.com'}
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
          </div>

          {/* Now Playing Section - Glassmorphism */}
          <div className="mt-8">
            <NowPlayingSection />
          </div>

          {/* ── Featured by Admin ────────────────────────────────────── */}
          {featuredSongs.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⭐</span>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">Featured Picks</h2>
                  <p className="text-sm text-muted-foreground">Handpicked by the AudioNova team</p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {featuredSongs.map(song => {
                  const imgSrc = typeof song.image === 'string'
                    ? song.image
                    : Array.isArray(song.image)
                      ? (typeof song.image[song.image.length - 1] === 'string'
                          ? song.image[song.image.length - 1]
                          : (song.image[song.image.length - 1] as any)?.link)
                      : null;
                  return (
                    <div
                      key={song._id}
                      className="flex-shrink-0 w-36 cursor-pointer group"
                      onClick={() => {
                        if (song.songId) {
                          setPlaylistAndPlay([
                            {
                              id: song.songId,
                              name: song.name,
                              primaryArtists: song.primaryArtists || '',
                              image: song.image as any,
                              url: song.url || '',
                              downloadUrl: song.downloadUrl as any,
                              duration: song.duration || 0,
                            }
                          ], 0);
                        }
                      }}
                    >
                      <div className="relative mb-2">
                        <div className="w-36 h-36 rounded-xl overflow-hidden bg-white/5 shadow-lg">
                          {imgSrc ? (
                            <img src={imgSrc} alt={song.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                          )}
                        </div>
                        <div className="absolute top-1.5 left-1.5">
                          <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md">⭐ Admin Pick</span>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold truncate">{song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.primaryArtists}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── For You – Personalized Recommendations ──────────────────── */}
          {(forYouSongs.length > 0 || forYouLoading) && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                    <span>🎵</span> For You
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Recommended based on your listening</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchForYou}
                    disabled={forYouLoading}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Refresh recommendations"
                  >
                    {forYouLoading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-red-500/30 border-l-red-500 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>

                  {forYouSongs.length > 6 && (
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setShowAllForYou(!showAllForYou)}
                    >
                      {showAllForYou ? 'Show Less' : 'See All'}
                    </Button>
                  )}
                </div>
              </div>
              {forYouLoading ? (
                <LoadingGrid count={6} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {(showAllForYou ? forYouSongs : forYouSongs.slice(0, 6)).map((song, i) => (
                    <SongCard
                      key={`foryou-${song.id}-${i}`}
                      song={song}
                      playlist={forYouSongs}
                      index={i}
                      showNewBadge={false}
                      showLanguageBadge={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trending Now - Grid Layout with Sophisticated Features */}
          <div className="mt-8">
            <ErrorBoundary 
              section="Trending Songs"
              onRetry={() => window.location.reload()}
            >
              <TrendingSongsSection 
                limit={25}
                initialShowCount={6}
                autoRefresh={true}
                refreshInterval={60000}
              />
            </ErrorBoundary>
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
                      className="w-4 h-4 border-2 border-red-500/30 border-l-red-500 rounded-full"
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
              <LoadingGrid count={MAX_SMALL_GRID} />
            ) : error ? (
              <ErrorFallback 
                error={new Error(error)}
                onRetry={fetchNewReleasesData}
                message="Failed to load new releases"
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {newReleases.slice(0, showAllNewReleases ? MAX_EXPANDED : MAX_SMALL_GRID).map((song, idx) => (
                    <SongCard
                      key={`new-${song.id}-${idx}`}
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
                  key={`recent-${song.id}-${idx}`}
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
                    className="w-4 h-4 border-2 border-red-500/30 border-l-red-500 rounded-full"
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
            <LoadingGrid count={MAX_SMALL_GRID} />
          ) : malayalamSongs.length === 0 ? (
            <ErrorFallback 
              onRetry={fetchMalayalamSongsData}
              message="No Malayalam songs available"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {malayalamSongs.slice(0, showAllMalayalam ? 50 : MAX_SMALL_GRID).map((song, idx) => (
                <SongCard
                  key={`malayalam-${song.id}-${idx}`}
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
                    className="w-4 h-4 border-2 border-red-500/30 border-l-red-500 rounded-full"
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
            <LoadingGrid count={MAX_SMALL_GRID} />
          ) : tamilSongs.length === 0 ? (
            <ErrorFallback 
              onRetry={fetchTamilSongsData}
              message="No Tamil songs available"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tamilSongs.slice(0, showAllTamil ? 50 : MAX_SMALL_GRID).map((song, idx) => (
                <SongCard
                  key={`tamil-${song.id}-${idx}`}
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
        </div>
      )}

      {/* Playlist Sidebar - Only show when fullscreen playlist is not open */}
      {!selectedPlaylist && (
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
      )}
    </div>
  );
};

export default HomeView;