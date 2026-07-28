// src/services/lyricsProvider.ts
// Service for fetching synced lyrics from licensed providers
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : `${import.meta.env.VITE_API_BASE_URL}/api`;
interface LyricsLine {
  time: number; // seconds
  text: string;
}

interface LyricsResponse {
  providerId: string;
  providerName: string;
  lines: LyricsLine[] | null;
  attribution: string;
  externalUrl?: string;
}

interface LyricsMetadata {
  trackId: string;
  providerLyricsId: string;
  cachedAt: number; // timestamp
}

// Parse LRC format to array of timed lines
export function parseLRC(lrcText: string): LyricsLine[] {
  if (!lrcText) return [];

  const lines: LyricsLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  lrcText.split('\n').forEach(line => {
    const timeMatches = [...line.matchAll(timeRegex)];

    if (timeMatches.length > 0 && line.includes(']')) {
      const text = line.substring(line.lastIndexOf(']') + 1).trim();

      timeMatches.forEach(match => {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
        const time = minutes * 60 + seconds + milliseconds / 1000;

        if (text) {
          lines.push({ time, text });
        }
      });
    }
  });

  // Sort by time
  return lines.sort((a, b) => a.time - b.time);
}

// Fetch lyrics from backend proxy
export async function fetchSyncedLyrics(
  trackId: string,
  songName?: string,
  artistName?: string,
  hasLyrics?: boolean
): Promise<LyricsResponse | null> {
  try {
    const params = new URLSearchParams({ songId: trackId });
    if (songName) params.set('songName', songName);
    if (artistName) params.set('artistName', artistName);
    if (hasLyrics !== undefined) params.set('hasLyrics', String(hasLyrics));

    const response = await fetch(`${API_BASE_URL}/lyrics?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch lyrics:', error);
    return null;
  }
}

// Cache in-memory for instant language switching
const translationCache = new Map<string, string[]>();

// Translate batch of lyric lines with backend API (supports Sing Mode transliteration & Meaning Mode)
export async function translateLyricsBatch(
  lines: string[],
  targetLanguage: string = 'ml',
  mode: 'sing_ml' | 'sing_en' | 'meaning' = 'sing_ml'
): Promise<string[]> {
  if (!lines || lines.length === 0) return [];

  const cacheKey = `${mode}_${targetLanguage}_${lines.join('|||')}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    // 1. Try backend API endpoint first
    const response = await fetch(`${API_BASE_URL}/lyrics/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, mode, targetLang: targetLanguage }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.translatedLines && Array.isArray(data.translatedLines)) {
        translationCache.set(cacheKey, data.translatedLines);
        return data.translatedLines;
      }
    }
  } catch (backendError) {
    console.warn('[Lyrics] Backend translation failed, trying client fallback:', backendError);
  }

  // 2. Client-side fallback using free Google GTX translate API directly
  try {
    const fullText = lines.join('\n');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(fullText)}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data[0])) {
        const translatedFullText = data[0]
          .map((chunk: any) => (chunk && chunk[0]) ? chunk[0] : '')
          .join('');
        const translatedLines = translatedFullText.split('\n').map((l: string, i: number) => l.trim() || lines[i]);
        translationCache.set(cacheKey, translatedLines);
        return translatedLines;
      }
    }
  } catch (clientError) {
    console.warn('[Lyrics] Client-side translation fallback error:', clientError);
  }

  return lines;
}

// Single text line translation wrapper
export async function translateLyrics(text: string, targetLanguage: string = 'ml'): Promise<string> {
  const result = await translateLyricsBatch([text], targetLanguage, 'sing_ml');
  return result[0] || text;
}

// Save lyrics metadata (not the full text)
export function saveLyricsMetadata(metadata: LyricsMetadata): void {
  try {
    const key = `lyrics_metadata_${metadata.trackId}`;
    localStorage.setItem(key, JSON.stringify(metadata));
  } catch (error) {
    console.warn('Failed to save lyrics metadata:', error);
  }
}

// Get lyrics metadata
export function getLyricsMetadata(trackId: string): LyricsMetadata | null {
  try {
    const key = `lyrics_metadata_${trackId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to get lyrics metadata:', error);
    return null;
  }
}

// Check if lyrics are cached and still valid (24h TTL)
export function isLyricsCacheValid(trackId: string): boolean {
  const metadata = getLyricsMetadata(trackId);
  if (!metadata) return false;

  const now = Date.now();
  const ttl = 24 * 60 * 60 * 1000; // 24 hours
  return (now - metadata.cachedAt) < ttl;
}

export type { LyricsLine, LyricsResponse, LyricsMetadata };