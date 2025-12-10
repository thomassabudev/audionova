/**
 * Trending Service
 * Handles fetching, caching, and processing of trending songs data
 */

import { jiosaavnApi } from './jiosaavnApi';
import {
  computeTrendScore,
  determineBadges,
  mergeAndDedupe,
  calculateDeltas,
  DEFAULT_TRENDING_CONFIG,
  type TrendingSong,
  type SongHistory,
  type TrendingConfig,
} from '@/utils/trending';
import { isLikelyWrongImage, normalizeSongImage } from '@/utils/songImage';

const CACHE_KEY = 'trending_songs_v2'; // Incremented to force cache invalidation
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
    const { limit = 25, forceRefresh = false, languages } = options || {}; // Changed default to 25

    // If force refresh, clear ALL caches (memory + localStorage)
    if (forceRefresh) {
      console.log('[TrendingService] Force refresh - clearing ALL caches');
      this.clearCache(); // Use the clearCache method
    }

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      console.log('[TrendingService] Returning cached data');
      let songs = this.cache.songs;
      
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
      console.log('[TrendingService] Fetch in progress, waiting...');
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
      console.log('[TrendingService] Fetching trending songs from APIs...');
      
      // Fetch from all language endpoints in parallel
      const [mal, ta, hi, en] = await Promise.all([
        jiosaavnApi.getTrendingSongs().catch(() => []),
        jiosaavnApi.getTamilTrendingSongs().catch(() => []),
        jiosaavnApi.getHindiTrendingSongs().catch(() => []),
        jiosaavnApi.getEnglishNewReleases().catch(() => []),
      ]);

      console.log('[TrendingService] Fetched:', {
        malayalam: mal.length,
        tamil: ta.length,
        hindi: hi.length,
        english: en.length,
      });

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

      console.log('[TrendingService] Shuffled arrays for variety');

      // Balance languages - take equal amounts from each language
      // For 3 main languages (Malayalam, Tamil, Hindi) - skip English for now
      const songsPerLanguage = Math.ceil(limit / 3); // Divide equally among 3 languages
      
      const balancedMal = shuffleMal.slice(0, songsPerLanguage);
      const balancedTa = shuffleTa.slice(0, songsPerLanguage);
      const balancedHi = shuffleHi.slice(0, songsPerLanguage);

      console.log('[TrendingService] Balanced selection (3 languages):', {
        malayalam: balancedMal.length,
        tamil: balancedTa.length,
        hindi: balancedHi.length,
      });

      // Combine balanced selections and deduplicate by ID AND name
      const combined = [...balancedMal, ...balancedTa, ...balancedHi];
      
      // Enhanced deduplication - by ID and similar names
      const uniqueMap = new Map<string, any>();
      const seenNames = new Set<string>();
      
      for (const song of combined) {
        // Skip if we've seen this ID
        if (uniqueMap.has(song.id)) continue;
        
        // Normalize name for comparison (lowercase, remove special chars)
        const normalizedName = song.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Skip if we've seen a very similar name
        if (seenNames.has(normalizedName)) {
          console.log('[TrendingService] Skipping duplicate name:', song.name);
          continue;
        }
        
        uniqueMap.set(song.id, song);
        seenNames.add(normalizedName);
      }
      
      let unique = Array.from(uniqueMap.values());

      // Enhanced filtering: Cover art + Recency + Quality
      const beforeFilterCount = unique.length;
      const currentYear = new Date().getFullYear();
      const twoYearsAgo = currentYear - 2;
      
      unique = unique.filter(song => {
        // 1. Cover art verification
        const imageUrl = normalizeSongImage(song);
        if (!imageUrl) {
          console.log('[TrendingService] Filtering out (no image):', song.name);
          return false;
        }
        if (isLikelyWrongImage(imageUrl, song)) {
          console.log('[TrendingService] Filtering out (bad cover):', song.name);
          return false;
        }
        
        // 2. Recency check - Remove songs older than 2 years
        const releaseYear = song.year ? parseInt(song.year) : null;
        const releaseDate = song.releaseDate ? new Date(song.releaseDate).getFullYear() : null;
        const songYear = releaseYear || releaseDate;
        
        if (songYear && songYear < twoYearsAgo) {
          console.log('[TrendingService] Filtering out (too old):', song.name, `(${songYear})`);
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
          console.log('[TrendingService] Filtering out (reupload/dubbed):', song.name);
          return false;
        }
        
        // 4. Quality check - Ensure minimum play count if available
        const playCount = parseInt(song.playCount) || 0;
        if (playCount > 0 && playCount < 1000) {
          console.log('[TrendingService] Filtering out (low plays):', song.name, `(${playCount})`);
          return false;
        }
        
        return true;
      });
      
      console.log(`[TrendingService] Enhanced filter: ${beforeFilterCount} → ${unique.length} songs (removed ${beforeFilterCount - unique.length})`);

      console.log('[TrendingService] Combined unique songs:', unique.length);

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

      console.log('[TrendingService] Strict interleaved distribution:', {
        malayalam: malayalamSelected.length,
        tamil: tamilSelected.length,
        hindi: hindiSelected.length,
        total: interleaved.length,
        targetPerLanguage,
      });

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

      console.log('[TrendingService] Processed trending songs:', withDeltas.length);

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
        console.log('[TrendingService] Returning stale cached data due to error');
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
    console.log('[TrendingService] All caches cleared');
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
        console.log('[TrendingService] Loaded cache from localStorage');
      }

      const historyData = localStorage.getItem(HISTORY_KEY);
      if (historyData) {
        this.history = JSON.parse(historyData);
        console.log('[TrendingService] Loaded history from localStorage');
      }
    } catch (error) {
      console.warn('[TrendingService] Failed to load from localStorage:', error);
    }
  }
}

// Export singleton instance
export const trendingService = new TrendingService();
