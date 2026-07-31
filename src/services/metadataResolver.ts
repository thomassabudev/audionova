import { jiosaavnApi, type Song } from './jiosaavnApi';
import { normalizeSongImage } from '@/utils/songImage';

/**
 * Interface extending Song with a score property for sorting
 */
export interface ScoredSong extends Song {
  metadataScore?: number;
}

/**
 * LRU Cache implementation with TTL
 */
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Refresh position in LRU (Map maintains insertion order)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first key in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
}

/**
 * Concurrency Limiter for async tasks
 */
class ConcurrencyLimiter {
  private activeCount = 0;
  private readonly queue: Array<() => void> = [];

  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    // Use a while loop to prevent race conditions if another task steals the slot
    // while the resolved promise is in the microtask queue.
    while (this.activeCount >= this.limit) {
      await new Promise<void>(resolve => { this.queue.push(resolve); });
    }
    
    this.activeCount++;
    try {
      return await task();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}

/**
 * Metadata Resolver Layer
 */
class MetadataResolver {
  private verifiedCache = new LRUCache<string, Song>(500, 24 * 60 * 60 * 1000);
  private reverseSearchCache = new LRUCache<string, string>(500, 24 * 60 * 60 * 1000);
  private verificationLimiter = new ConcurrencyLimiter(5);

  private static readonly suspiciousKeywords = [
    'playlist', 'compilation', 'collection', 'collections', 'mix', 
    'hits', 'special', 'radio', 'mood', 'viral', "valentine's", 'valentine', 
    'patriotic', 'jukebox', 'top songs', 'top hits', 'world music day', 
    'daily mix', 'weekly mix', 'various artists', "editor's choice",
    'evergreen', 'romantic', 'top', 'daily', 'weekly', 'ultimate', 
    'non stop', 'best of', 'trending', 'greatest hits', 'mixtape'
  ];

  /**
   * Normalize a string for comparison (lowercase, remove special chars and extra spaces)
   */
  private normalizeString(str: string | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Determine the resolution score of an image URL to compare qualities
   */
  private getImageResolutionScore(url: string | undefined | null): number {
    if (!url) return 0;
    const match = url.match(/(\d+)x(\d+)/);
    if (match) {
      return parseInt(match[1], 10) * parseInt(match[2], 10);
    }
    // Fallbacks based on common keywords
    if (url.includes('original')) return 1000000;
    if (url.includes('large')) return 500000;
    if (url.includes('medium')) return 250000;
    return 10000; // default low score
  }

  /**
   * Calculate a confidence score for a song based on its album and artwork
   */
  public scoreCandidate(song: Song): number {
    let score = 0;
    const albumName = (song.album?.name || '').toLowerCase();
    const songName = (song.name || '').toLowerCase();

    // Album Bonuses
    if (albumName && songName && albumName === songName) {
      // High chance it's a single or the title track of an original album
      score += 90; 
    } else if (albumName) {
      // General original album (not guaranteed, but assumed baseline)
      score += 70;
    }

    // Penalties for suspicious compilation/playlist albums
    const isCompilation = MetadataResolver.suspiciousKeywords.some(kw => albumName.includes(kw));
    
    // Check if the song name naturally includes the keyword (e.g. a song actually called "The Best of Me")
    const songHasKeyword = MetadataResolver.suspiciousKeywords.some(kw => songName.includes(kw));

    if (isCompilation && !songHasKeyword) {
      score -= 100;
    }

    // Artwork check (penalty for placeholders/compilation images)
    const image = normalizeSongImage(song);
    if (!image) {
      score -= 50;
    } else {
      const imgLower = image.toLowerCase();
      if (imgLower.includes('placeholder') || imgLower.includes('default') || imgLower.includes('noimage')) {
        score -= 50;
      }
    }

    // High quality image bonus
    if (this.getImageResolutionScore(image) > 100000) {
      score += 10;
    }

    return score;
  }

  /**
   * Deduplicate a list of songs by normalized title, artist, language, and duration.
   * Keeps the highest confidence version.
   */
  public resolveDuplicates<T extends Song>(songs: T[]): T[] {
    const groups = new Map<string, T[]>();

    for (const song of songs) {
      const title = this.normalizeString(song.name);
      
      // Handle artists parsing safely without strict narrowing to 'never'
      let artistStr = '';
      const rawArtists: any = song.primaryArtists;
      if (typeof rawArtists === 'string') {
        artistStr = rawArtists.split(',')[0]; // Use first artist
      } else if (Array.isArray(rawArtists) && rawArtists.length > 0) {
        artistStr = rawArtists[0]?.name || '';
      }
      const artist = this.normalizeString(artistStr);
      
      const language = this.normalizeString(song.language);
      
      const dur = typeof song.duration === 'string' ? parseInt(song.duration) : (song.duration || 0);
      
      let matchedKey = null;
      for (const [key, _] of groups.entries()) {
        const [kTitle, kArtist, kLang, kDur] = key.split('|');
        if (kTitle === title && kArtist === artist && kLang === language) {
          const durDiff = Math.abs(parseInt(kDur) - dur);
          if (durDiff <= 2) {
            matchedKey = key;
            break;
          }
        }
      }

      if (matchedKey) {
        groups.get(matchedKey)!.push(song);
      } else {
        const newKey = `${title}|${artist}|${language}|${dur}`;
        groups.set(newKey, [song]);
      }
    }

    // For each group, pick the highest scoring candidate
    const resolved: T[] = [];
    for (const group of groups.values()) {
      if (group.length === 1) {
        resolved.push(group[0]);
      } else {
        const scoredGroup = group.map(s => ({ song: s, score: this.scoreCandidate(s) }));
        scoredGroup.sort((a, b) => b.score - a.score);
        resolved.push(scoredGroup[0].song);
      }
    }

    return resolved;
  }

  /**
   * Re-rank search results. Takes top 10 results, calculates score, and re-orders.
   */
  public rankSearchResults<T extends Song>(query: string, results: T[]): T[] {
    if (!results || results.length === 0) return results;

    const normQuery = this.normalizeString(query);
    const topResults = results.slice(0, 10);
    const remainingResults = results.slice(10);

    const scored = topResults.map(song => {
      let matchScore = 0;
      const normTitle = this.normalizeString(song.name);
      let normArtist = '';
      const rawArtists: any = song.primaryArtists;
      if (typeof rawArtists === 'string') {
        normArtist = this.normalizeString(rawArtists);
      } else if (Array.isArray(rawArtists) && rawArtists.length > 0) {
        normArtist = this.normalizeString(rawArtists[0]?.name || '');
      }

      // Exact title match
      if (normTitle === normQuery) matchScore += 50;
      else if (normTitle.includes(normQuery)) matchScore += 20;

      // Artist match
      if (normArtist.includes(normQuery)) matchScore += 30;

      // Play count bonus
      const playCount = typeof song.playCount === 'string' ? parseInt(song.playCount) : (song.playCount || 0);
      if (playCount > 1000000) matchScore += 15;
      else if (playCount > 100000) matchScore += 5;

      // Recency bonus
      const releaseYear = song.year ? parseInt(song.year) : 0;
      const currentYear = new Date().getFullYear();
      if (releaseYear === currentYear) matchScore += 10;
      else if (releaseYear === currentYear - 1) matchScore += 5;

      const metadataScore = this.scoreCandidate(song);
      
      return {
        song,
        finalScore: matchScore + metadataScore
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    return [...scored.map(s => s.song), ...remainingResults];
  }

  public verifyHomePageMetadata<T extends Song>(songs: T[]): T[] {
    // 1. Synchronously apply any already-cached verified metadata directly to the objects
    for (const song of songs) {
      const cached = this.verifiedCache.get(song.id);
      if (cached) {
        this.applyVerifiedData(song, cached);
      }
    }

    // 2. Perform background verification without blocking UI
    setTimeout(() => {
      this.performBackgroundVerification(songs).catch(err => {
        console.error('[MetadataResolver] Background verification failed', err);
      });
    }, 0);

    return songs;
  }

  private async performBackgroundVerification<T extends Song>(songs: T[]): Promise<void> {
    const verificationThreshold = 50; // threshold for confidence score
    
    const tasks = songs.map(async (song) => {
      // 1. Check if we need to verify
      const score = this.scoreCandidate(song);
      const isSuspicious = score < verificationThreshold;
      const image = normalizeSongImage(song);
      const isImageMissing = !image;
      
      if (!isSuspicious && !isImageMissing) {
        return; // No need to verify
      }

      // 2. Check if already verified and in cache
      const cached = this.verifiedCache.get(song.id);
      if (cached) {
        return; // Already in cache, no need to verify again
      }

      // 3. Determine target ID (Reverse search if suspicious)
      let targetId = song.id;
      
      if (isSuspicious) {
        const cachedOriginalId = this.reverseSearchCache.get(song.id);
        if (cachedOriginalId) {
          targetId = cachedOriginalId;
        } else {
          try {
            // Perform reverse search
            let artistStr = '';
            const rawArtists: any = song.primaryArtists;
            if (typeof rawArtists === 'string') {
              artistStr = rawArtists.split(',')[0];
            } else if (Array.isArray(rawArtists) && rawArtists.length > 0) {
              artistStr = rawArtists[0]?.name || '';
            }
            
            const query = `${song.name} ${artistStr}`.trim();
            const searchResults = await this.verificationLimiter.run(() => 
              jiosaavnApi.searchSongs(query, 20)
            );
            
            let bestCandidate = null;
            let bestScore = score; // baseline must be beaten

            for (const cand of searchResults) {
              const candScore = this.scoreCandidate(cand);
              let rejectedReason = '';
              
              const candAlbum = (cand.album?.name || '').toLowerCase();
              const isCandCompilation = MetadataResolver.suspiciousKeywords.some(kw => candAlbum.includes(kw));
              const isOrigAlbumName = candAlbum === (cand.name || '').toLowerCase();
              
              const candTitle = this.normalizeString(cand.name);
              const origTitle = this.normalizeString(song.name);
              const titleMatches = candTitle.includes(origTitle) || origTitle.includes(candTitle);
              
              let candArtistStr = '';
              const cRawArts: any = cand.primaryArtists;
              if (typeof cRawArts === 'string') candArtistStr = cRawArts.split(',')[0];
              else if (Array.isArray(cRawArts) && cRawArts.length > 0) candArtistStr = cRawArts[0]?.name || '';
              
              const candArtist = this.normalizeString(candArtistStr);
              const origArtist = this.normalizeString(artistStr);
              const artistMatches = !origArtist || candArtist.includes(origArtist) || origArtist.includes(candArtist);
              
              const candLang = this.normalizeString(cand.language);
              const origLang = this.normalizeString(song.language);
              const langMatches = !origLang || !candLang || candLang === origLang;
              
              const candDur = parseInt(cand.duration as any) || 0;
              const origDur = parseInt(song.duration as any) || 0;
              const durDiff = (candDur && origDur) ? Math.abs(candDur - origDur) : 0;
              const durMatches = !candDur || !origDur || durDiff <= 2;
              
              if (isCandCompilation && !isOrigAlbumName) {
                rejectedReason = 'Compilation Album';
              } else if (!titleMatches) {
                rejectedReason = 'Wrong Title';
              } else if (!artistMatches) {
                rejectedReason = 'Wrong Artist';
              } else if (!langMatches) {
                rejectedReason = 'Language Mismatch';
              } else if (!durMatches) {
                rejectedReason = 'Duration Mismatch';
              } else if (candScore <= bestScore) {
                rejectedReason = 'Lower/Equal Confidence';
              }
              
              if (!rejectedReason) {
                bestScore = candScore;
                bestCandidate = cand;
              }
            }
            
            if (bestCandidate) {
              console.log(`[MetadataResolver] Upgrading compilation ${song.id} to original movie: ${bestCandidate.album?.name}`);
              targetId = bestCandidate.id;
            }

            this.reverseSearchCache.set(song.id, targetId);
          } catch (e) {
            console.error('[MetadataResolver] Search failed', e);
          }
        }
      }

      // 4. Fetch from API with concurrency limit
      try {
        const verifiedSong = await this.verificationLimiter.run(() => 
          jiosaavnApi.getSongDetails(targetId)
        );
        
        if (verifiedSong) {
          // Note: If we reverse-searched, we map the ORIGINAL song ID to the VERIFIED better song
          this.verifiedCache.set(song.id, verifiedSong);
          // Progressively apply to the in-memory array so components updating in the future see it
          this.applyVerifiedData(song, verifiedSong);
        }
      } catch (e) {
        // Silently ignore verification failures
      }
    });

    await Promise.all(tasks);
  }

  private applyVerifiedData(target: any, verified: Song) {
    const verifiedAlbumName = (verified.album?.name || '').toLowerCase();
    const verifiedSongName = (verified.name || '').toLowerCase();
    
    // Ensure the verified song is actually an original album, not another compilation
    const isOriginal = !MetadataResolver.suspiciousKeywords.some(kw => verifiedAlbumName.includes(kw)) || 
                       (verifiedAlbumName === verifiedSongName);

    if (isOriginal) {
      // Completely overwrite the bad compilation object with the full original movie object
      // This correctly replaces album, artwork, id, downloadUrl, and playCount.
      Object.assign(target, verified);
    }
  }
}

export const metadataResolver = new MetadataResolver();
