/**
 * Trending Service
 * Handles fetching, caching, and processing of trending songs data
 */
import { jiosaavnApi } from './jiosaavnApi';
import { isDevotionalOrReligious } from './recommendationService';
import {
  computeTrendScore,
  determineBadges,
  calculateDeltas,
  DEFAULT_TRENDING_CONFIG,
  type TrendingSong,
  type SongHistory,
  type TrendingConfig,
} from '@/utils/trending';
import { isLikelyWrongImage, normalizeSongImage } from '@/utils/songImage';
import { metadataResolver } from './metadataResolver';

const CACHE_KEY = 'trending_songs_v2';
const HISTORY_KEY = 'trending_history_v2';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const HISTORY_RETENTION = 72 * 60 * 60 * 1000; // 72 hours

interface CachedTrending {
  songs: TrendingSong[];
  timestamp: number;
  version: string;
}

interface HistoryStore {
  [songId: string]: SongHistory[];
}

class TrendingService {
  private config: TrendingConfig = DEFAULT_TRENDING_CONFIG;
  private cache: CachedTrending | null = null;
  private history: HistoryStore = {};
  private isFetching = false;
  private fetchPromise: Promise<TrendingSong[]> | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Get trending songs (with caching)
   */
  async getTrendingSongs(options?: {
    limit?: number;
    forceRefresh?: boolean;
    languages?: string[];
  }): Promise<TrendingSong[]> {
    const { limit = 25, forceRefresh = false, languages } = options || {};

    // If force refresh, clear ALL caches (memory + localStorage)
    if (forceRefresh) {
      this.clearCache();
    }

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      // Synchronously apply any verified data that completed in the background
      let songs = metadataResolver.verifyHomePageMetadata(this.cache.songs);
      
      // Filter by languages if specified
      if (languages && languages.length > 0) {
        songs = songs.filter(song => 
          languages.some(lang => 
            song.language?.toLowerCase().includes(lang.toLowerCase())
          )
        );
      }
      return songs.slice(0, limit);
    }

    // If already fetching and not force refresh, return the existing promise
    if (this.isFetching && this.fetchPromise && !forceRefresh) {
      return this.fetchPromise;
    }

    // Fetch new data
    this.isFetching = true;
    this.fetchPromise = this.fetchAndProcess(limit, languages);
    
    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      this.isFetching = false;
      this.fetchPromise = null;
    }
  }

  /**
   * Fetch and process trending songs
   */
  private async fetchAndProcess(
    limit: number,
    languages?: string[]
  ): Promise<TrendingSong[]> {
    try {
      // Fetch from all language endpoints with better error handling
      const [mal, ta, hi, en] = await Promise.all([
        jiosaavnApi.getTrendingSongs().catch((err) => {
          console.warn('[TrendingService] Malayalam fetch failed:', err?.message);
          return [];
        }),
        jiosaavnApi.getTamilTrendingSongs().catch((err) => {
          console.warn('[TrendingService] Tamil fetch failed:', err?.message);
          return [];
        }),
        jiosaavnApi.getHindiTrendingSongs().catch((err) => {
          console.warn('[TrendingService] Hindi fetch failed:', err?.message);
          return [];
        }),
        jiosaavnApi.getEnglishNewReleases().catch((err) => {
          console.warn('[TrendingService] English fetch failed:', err?.message);
          return [];
        }),
      ]);

      // Check if we have any data at all
      const totalFetched = mal.length + ta.length + hi.length + en.length;
      if (totalFetched === 0) {
        console.warn('[TrendingService] No data fetched from any API');
        // Return cached data if available
        if (this.cache && this.cache.songs.length > 0) {
          return this.cache.songs.slice(0, limit);
        }
        throw new Error('No trending data available from any source');
      }

      // Aggressive shuffling to ensure different songs on each refresh
      const shuffleMal = [...mal]
        .sort(() => Math.random() - 0.5)
        .sort(() => Math.random() - 0.5); // Double shuffle for more randomness
      const shuffleTa = [...ta]
        .sort(() => Math.random() - 0.5)
        .sort(() => Math.random() - 0.5);
      const shuffleHi = [...hi]
        .sort(() => Math.random() - 0.5)
        .sort(() => Math.random() - 0.5);

      // Balance languages - take equal amounts from each language
      // For 3 main languages (Malayalam, Tamil, Hindi) - skip English for now
      const songsPerLanguage = Math.ceil(limit / 3); // Divide equally among 3 languages
      const balancedMal = shuffleMal.slice(0, songsPerLanguage);
      const balancedTa = shuffleTa.slice(0, songsPerLanguage);
      const balancedHi = shuffleHi.slice(0, songsPerLanguage);

      // Combine balanced selections and deduplicate
      const combined = [...balancedMal, ...balancedTa, ...balancedHi];

      // Enhanced deduplication - using metadataResolver
      let unique = metadataResolver.resolveDuplicates(combined);

      // Enhanced filtering: Cover art + Recency + Quality
      const currentYear = new Date().getFullYear();
      const twoYearsAgo = currentYear - 2;

      unique = unique.filter(song => {
        // Exclude religious, devotional, or caste songs
        if (isDevotionalOrReligious(song)) return false;

        // 1. Cover art verification
        const imageUrl = normalizeSongImage(song);
        if (!imageUrl) {
          return false;
        }
        if (isLikelyWrongImage(imageUrl, song)) {
          return false;
        }

        // 2. Recency check - Remove songs older than 2 years
        const releaseYear = song.year ? parseInt(song.year) : null;
        const releaseDate = song.releaseDate ? new Date(song.releaseDate).getFullYear() : null;
        const songYear = releaseYear || releaseDate;
        
        if (songYear && songYear < twoYearsAgo) {
          return false;
        }

        // 3. Filter out obvious reuploads/dubbed versions
        const name = song.name?.toLowerCase() || '';
        const suspiciousPatterns = [
          'reupload',
          're-upload',
          're upload',
          'reuploaded',
          'dubbed',
          'dub version',
          'remix version',
          '(old)',
          '(remastered)',
          'lyric video',
          'lyrics video',
          'audio only',
          'official audio',
          'visualizer',
        ];
        
        if (suspiciousPatterns.some(pattern => name.includes(pattern))) {
          return false;
        }

        // 4. Quality check - Ensure minimum play count if available
        const playCount = typeof song.playCount === 'string' ? parseInt(song.playCount, 10) : (song.playCount || 0);
        if (playCount > 0 && playCount < 1000) {
          return false;
        }

        return true;
      });

      // Compute scores and enrich with metadata
      const scoringYear = new Date().getFullYear();
      const scored: TrendingSong[] = unique.map(song => {
        const history = this.getHistory(song.id);
        const { score, velocity } = computeTrendScore(song, history, this.config);
        const badges = determineBadges(song, score, velocity, this.config);

        // Apply recency boost - prioritize recent songs
        let finalScore = score;
        const releaseYear = song.year ? parseInt(song.year) : null;
        const releaseDate = song.releaseDate ? new Date(song.releaseDate).getFullYear() : null;
        const songYear = releaseYear || releaseDate;

        if (songYear) {
          if (songYear === scoringYear) {
            // 20% boost for current year songs
            finalScore *= 1.2;
          } else if (songYear === scoringYear - 1) {
            // 10% boost for last year songs
            finalScore *= 1.1;
          }
        }

        return {
          ...song,
          score: finalScore,
          rank: 0, // Will be set after sorting
          delta: 0, // Will be calculated
          velocity,
          badges,
          lastUpdated: Date.now(),
        };
      });

      // Group by language for balanced sorting (3 languages only)
      const malayalamSongs = scored.filter(s => s.language?.toLowerCase().includes('malayalam'));
      const tamilSongs = scored.filter(s => s.language?.toLowerCase().includes('tamil'));
      const hindiSongs = scored.filter(s => s.language?.toLowerCase().includes('hindi'));

      // Sort each language group by score
      malayalamSongs.sort((a, b) => b.score - a.score);
      tamilSongs.sort((a, b) => b.score - a.score);
      hindiSongs.sort((a, b) => b.score - a.score);

      // Strict interleaving - exactly equal distribution
      const interleaved: TrendingSong[] = [];
      const targetPerLanguage = Math.floor(limit / 3); // Exact division

      // Take exactly targetPerLanguage from each language
      const malayalamSelected = malayalamSongs.slice(0, targetPerLanguage);
      const tamilSelected = tamilSongs.slice(0, targetPerLanguage);
      const hindiSelected = hindiSongs.slice(0, targetPerLanguage);

      // Interleave in strict rotation
      for (let i = 0; i < targetPerLanguage; i++) {
        if (i < malayalamSelected.length) interleaved.push(malayalamSelected[i]);
        if (i < tamilSelected.length) interleaved.push(tamilSelected[i]);
        if (i < hindiSelected.length) interleaved.push(hindiSelected[i]);
      }

      // Calculate rank deltas
      const previousSongs = this.cache?.songs || [];
      const withDeltas = calculateDeltas(interleaved, previousSongs);

      // Update history
      this.updateHistory(withDeltas);

      // Cache the results
      this.cache = {
        songs: withDeltas,
        timestamp: Date.now(),
        version: '1.0',
      };
      this.saveToLocalStorage();

      // Trigger progressive metadata verification for home page
      metadataResolver.verifyHomePageMetadata(withDeltas);

      // Filter by languages if specified
      let result = withDeltas;
      if (languages && languages.length > 0) {
        result = result.filter(song =>
          languages.some(lang =>
            song.language?.toLowerCase().includes(lang.toLowerCase())
          )
        );
      }

      return result.slice(0, limit);
    } catch (error) {
      console.error('[TrendingService] Error fetching trending songs:', error);
      // Return cached data if available (stale data is better than no data)
      if (this.cache) {
        return this.cache.songs.slice(0, limit);
      }
      throw error;
    }
  }

  /**
   * Get history for a song
   */
  private getHistory(songId: string): SongHistory[] {
    return this.history[songId] || [];
  }

  /**
   * Update history with new data
   */
  private updateHistory(songs: TrendingSong[]): void {
    const now = Date.now();
    const cutoff = now - HISTORY_RETENTION;

    songs.forEach(song => {
      const playCount = Number(song.playCount) || 0;
      
      if (!this.history[song.id]) {
        this.history[song.id] = [];
      }

      // Add new snapshot
      this.history[song.id].push({
        songId: song.id,
        playCount,
        timestamp: now,
      });

      // Remove old snapshots
      this.history[song.id] = this.history[song.id].filter(
        h => h.timestamp > cutoff
      );

      // Keep only last 100 snapshots per song
      if (this.history[song.id].length > 100) {
        this.history[song.id] = this.history[song.id].slice(-100);
      }
    });
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    const age = Date.now() - this.cache.timestamp;
    return age < CACHE_TTL;
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(): number {
    if (!this.cache) return Infinity;
    return Date.now() - this.cache.timestamp;
  }

  /**
   * Check if data is stale
   */
  isStale(): boolean {
    return !this.isCacheValid();
  }

  /**
   * Get last update timestamp
   */
  getLastUpdateTime(): number {
    return this.cache?.timestamp || 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TrendingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      weights: {
        ...this.config.weights,
        ...(config.weights || {}),
      },
      thresholds: {
        ...this.config.thresholds,
        ...(config.thresholds || {}),
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.history = {};
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    // Also clear old cache versions
    localStorage.removeItem('trending_songs_v1');
    localStorage.removeItem('trending_history_v1');
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      if (this.cache) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.warn('[TrendingService] Failed to save to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
      }

      const historyData = localStorage.getItem(HISTORY_KEY);
      if (historyData) {
        this.history = JSON.parse(historyData);
      }
    } catch (error) {
      console.warn('[TrendingService] Failed to load from localStorage:', error);
    }
  }
}

// Export singleton instance
export const trendingService = new TrendingService();