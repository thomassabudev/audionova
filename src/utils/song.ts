/**
 * Song Utilities
 * Helpers for language detection, image normalization, and balancing
 */

export type SimpleSong = {
  id?: string;
  name?: string;
  primaryArtists?: string;
  image?: any;          // API shape may vary
  thumbnail?: any;
  releaseDate?: string | null;
  year?: string | number | null;
  language?: string | null;
  playCount?: number | string | null;
  // ...other fields
};

/**
 * Return short language code or null
 */
export const getLangCode = (lang?: string | null): string | null => {
  if (!lang) return null;
  const s = String(lang).trim().toLowerCase();
  if (s.includes('malayalam') || s === 'ml') return 'ML';
  if (s.includes('tamil') || s === 'ta') return 'TA';
  if (s.includes('hindi') || s === 'hi') return 'HI';
  if (s.includes('english') || s.startsWith('eng') || s === 'en') return 'EN';
  if (s.includes('telugu') || s === 'te') return 'TE';
  // fallback two-letter token
  const match = s.match(/\b([a-z]{2})\b/);
  return match ? match[1].toUpperCase() : null;
};

/**
 * Pick the best (highest quality) image URL from various shapes
 */
export const getBestImage = (img?: string | string[] | Record<string, any> | null): string | null => {
  if (!img) return null;

  if (typeof img === 'string' && img.trim()) return img;

  if (Array.isArray(img) && img.length > 0) {
    const firstItem = img[0];
    
    // Array of objects with quality and link (JioSaavn format)
    if (typeof firstItem === 'object' && firstItem !== null && 'link' in firstItem) {
      // Sort by quality (highest first)
      const sortedImages = [...img].sort((a: any, b: any) => {
        const getQualityValue = (quality?: string): number => {
          if (!quality) return 0;
          // Extract numeric values from quality strings like "500x500"
          const match = quality.match(/(\d+)x(\d+)/);
          if (match) {
            return parseInt(match[1], 10) * parseInt(match[2], 10);
          }
          return 0;
        };
        return getQualityValue(b.quality) - getQualityValue(a.quality);
      });
      
      return sortedImages[0]?.link || null;
    }
    
    // Array of string URLs - pick the longest URL as heuristic for highest-res
    if (typeof firstItem === 'string') {
      return img.reduce((best, cur) => (typeof cur === 'string' && cur.length > (best?.length ?? 0) ? cur : best), img[0]);
    }
  }

  if (img && typeof img === 'object' && !Array.isArray(img)) {
    // common priority keys
    const keys = ['original','large','1000x1000','high','medium','small','thumbnail','default'];
    for (const k of keys) {
      const imgObj = img as Record<string, any>;
      if (imgObj[k]) return String(imgObj[k]);
    }
    // fallback: any string-valued property
    for (const val of Object.values(img)) {
      if (typeof val === 'string' && val.length > 0) return val;
    }
  }

  return null;
};

/**
 * Use best available image fields from song and fallback to placeholder
 * Normalizes image as a string URL (or null)
 */
export const normalizeSongImage = (song: SimpleSong): string | null => {
  // check all possible image fields from JioSaavn API
  const candidates = [
    song.image,
    (song as any).images,
    (song as any).more_info?.image,
    (song as any).more_info?.thumbnail,
    (song as any).more_info?.imageUrl,
    song.thumbnail,
    (song as any).album?.image,
    (song as any).album?.thumbnail,
    (song as any).albumArt
  ];
  
  for (const c of candidates) {
    const best = getBestImage(c);
    if (best) return best;
  }
  return null;
};

/**
 * Check if song is new (2025 or recent)
 */
export const isNewSong = (song: SimpleSong, opts?: { targetYear?: number, recentDays?: number, now?: number }) => {
  const targetYear = opts?.targetYear ?? 2025;
  const recentDays = opts?.recentDays ?? 14;
  const now = opts?.now ?? Date.now();
  if (!song) return false;
  if (song.releaseDate) {
    const t = Date.parse(String(song.releaseDate));
    if (!isNaN(t)) {
      const diffDays = (now - t) / (1000 * 60 * 60 * 24);
      if (diffDays <= recentDays) return true;
      if (new Date(t).getFullYear() === targetYear) return true;
      return false;
    }
  }
  if (song.year !== undefined && song.year !== null) {
    const y = Number(song.year);
    return !isNaN(y) && y === targetYear;
  }
  return false;
};

/**
 * Balance songs by language into buckets
 * Returns ordered array length <= totalSlots where songs are arranged as balanced buckets
 */
export const balanceByLanguage = (
  songs: SimpleSong[],
  allowedLangs: string[],
  totalSlots = 25,
  getLang = (s: SimpleSong) => getLangCode(s.language)
): SimpleSong[] => {
  // group by lang
  const groups: Record<string, SimpleSong[]> = {};
  for (const lang of allowedLangs) groups[lang] = [];
  const others: SimpleSong[] = [];
  
  for (const s of songs) {
    const code = getLang(s) || 'UNKN';
    if (allowedLangs.includes(code)) groups[code].push(s);
    else others.push(s);
  }

  // initial quotas: floor
  const base = Math.floor(totalSlots / allowedLangs.length); // e.g. 8
  const remainder = totalSlots - base * allowedLangs.length; // e.g. 1

  // assign quotas deterministically: sort allowedLangs by a priority order or by available length
  // pick languages by available count descending to assign remainder fairly OR keep fixed priority
  // We'll do this: assign remainder to languages with more available songs first.
  const quotas: Record<string, number> = {};
  // Fixed priority order: ['ML','TA','HI'] (or rotate per request)
  const langOrder = [...allowedLangs].sort((a, b) => {
    // If same available count, use fixed priority order
    if (groups[b].length === groups[a].length) {
      const priority: Record<string, number> = { 'ML': 0, 'TA': 1, 'HI': 2 };
      return (priority[a] || 999) - (priority[b] || 999);
    }
    // Otherwise sort by available count descending
    return groups[b].length - groups[a].length;
  });
  
  for (let i = 0; i < allowedLangs.length; i++) {
    quotas[langOrder[i]] = base + (i < remainder ? 1 : 0);
  }

  // fill buckets
  const result: SimpleSong[] = [];
  for (const lang of allowedLangs) { // Maintain fixed order for deterministic results
    const take = Math.min(quotas[lang], groups[lang].length);
    result.push(...groups[lang].slice(0, take));
  }

  // If not enough songs to reach totalSlots, fill from other groups and others
  if (result.length < totalSlots) {
    const remaining = totalSlots - result.length;
    // merge leftover songs from groups (excluding already used)
    const leftovers: SimpleSong[] = [];
    for (const lang of allowedLangs) {
      leftovers.push(...groups[lang].slice(quotas[lang]));
    }
    leftovers.push(...others);
    result.push(...leftovers.slice(0, remaining));
  }

  // final dedupe safeguard by id
  const seen = new Set<string>();
  const final: SimpleSong[] = [];
  for (const s of result) {
    if (!s.id || seen.has(s.id)) continue;
    seen.add(s.id);
    final.push(s);
  }

  return final.slice(0, totalSlots);
};

/**
 * Deduplicate songs by ID
 */
/**
 * Deduplicate songs by ID
 */
export const dedupeById = <T extends { id?: string }>(arr: T[]): T[] => {
  const map = new Map<string, T>();
  for (const s of arr) {
    if (s && s.id) map.set(s.id, s);
  }
  return Array.from(map.values());
};
