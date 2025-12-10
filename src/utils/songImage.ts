/**
 * Song Image Utilities
 * Auto-detect placeholder/incorrect cover images and load original/high-quality artwork
 */

export type APIAnySong = any;

/**
 * Heuristic: detect if a URL is likely a placeholder/playlist/banner/album image.
 * Add or tweak tokens based on your CDN & observed patterns.
 * STRICT MODE: Prefer false negatives (hide borderline) over false positives (show wrong covers)
 */
export const isLikelyWrongImage = (url?: string | null, song?: APIAnySong): boolean => {
  if (!url) return true;

  const s = url.toLowerCase();
  
  // Strict tokens - reject anything suspicious
  const tokens = [
    'placeholder',
    'default',
    'banner',
    'cover_all',
    'playlist',
    'thumb',
    'thumbnail',
    'small',
    '150x',
    '200x',
    'logo',
    'splash',
    '50x50',
    '150x150',
    'landscape',
    'wide',
    'unknown',
    'compilation',
    'various',
    'mixtape',
    'album_art', // Generic album art
    'cover_generic',
    'no_image',
    'noimage',
    'missing',
    'temp',
    'temporary',
    '100x100',
    '120x120',
    'icon',
    'avatar',
    'profile',
  ];

  if (tokens.some(t => s.includes(t))) return true;

  // If URL is too short, likely invalid
  if (s.length < 20) return true;

  // Reject very small images (likely thumbnails)
  if (s.match(/\b(50|100|120|150|200)x\1\b/)) return true;

  // Check for generic patterns in path
  if (s.includes('/generic/') || s.includes('/default/') || s.includes('/placeholder/')) return true;

  // If song name is provided, check for mismatches
  if (song && song.name) {
    const songName = song.name.toLowerCase();
    // If URL contains "various" or "compilation" but song is not a compilation, likely wrong
    if ((s.includes('various') || s.includes('compilation')) && 
        !songName.includes('various') && !songName.includes('compilation')) {
      return true;
    }
  }

  return false;
};

const pickFromObject = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null;

  const keys = ['original', 'large', 'high', 'medium', 'small', 'default', '1000x1000', '500x500'];
  for (const k of keys) {
    if (obj[k]) return String(obj[k]);
  }

  // fallback to any string property
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && v.length > 0) return v;
  }

  return null;
};

/**
 * Normalize song image to a single high-quality URL
 */
export function normalizeSongImage(song: APIAnySong): string | null {
  if (!song) return null;

  // quick accessors
  const safe = (v: any) => (v === undefined || v === null) ? null : v;

  const candidates = [
    safe(song.image),
    safe(song.images),
    safe(song.thumbnail),
    safe(song.more_info && song.more_info.image),
    safe(song.more_info && song.more_info.thumbnail),
    safe(song.album && song.album.image),
    safe(song.album && song.album.thumbnail),
    safe(song.media && song.media.image),
  ];

  for (const c of candidates) {
    if (!c) continue;

    if (typeof c === 'string' && c.trim()) return c;

    if (Array.isArray(c) && c.length) {
      // If array of objects with quality and link
      if (typeof c[0] === 'object' && c[0] !== null && 'link' in c[0]) {
        // Sort by quality (highest first)
        const sorted = [...c].sort((a: any, b: any) => {
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
        return sorted[0]?.link || null;
      }

      // prefer longest string (heuristic for higher-res urls)
      const arr = c.filter(x => typeof x === 'string');
      if (arr.length) return arr.reduce((a, b) => a.length >= b.length ? a : b);
    }

    if (typeof c === 'object') {
      const pick = pickFromObject(c);
      if (pick) return pick;
    }
  }

  return null;
}

/**
 * High-res image cache management
 */
const HIGH_RES_CACHE_KEY = 'highResImageCache_v1';

export const highResImageCache = new Map<string, string>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(HIGH_RES_CACHE_KEY) || '[]');
    } catch {
      return [];
    }
  })()
);

export const saveCache = () => {
  try {
    localStorage.setItem(
      HIGH_RES_CACHE_KEY,
      JSON.stringify(Array.from(highResImageCache.entries()))
    );
  } catch (e) {
    console.warn('Failed to save image cache:', e);
  }
};

export const getCachedImage = (songId: string): string | null => {
  return highResImageCache.get(songId) || null;
};

export const setCachedImage = (songId: string, imageUrl: string) => {
  highResImageCache.set(songId, imageUrl);
  saveCache();
};
