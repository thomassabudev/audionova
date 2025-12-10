// src/services/lyricsProvider.ts
// Service for fetching synced lyrics from licensed providers

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

// Fetch lyrics from backend proxy (to keep provider keys secure)
export async function fetchSyncedLyrics(trackId: string): Promise<LyricsResponse | null> {
  try {
    // Call our backend proxy which will then call the licensed lyrics provider
    const response = await fetch(`/api/lyrics?songId=${encodeURIComponent(trackId)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch lyrics:', error);
    return null;
  }
}

// Translate lyrics text (for display only - do not store)
export async function translateLyrics(text: string, targetLanguage: string): Promise<string> {
  try {
    // In a real implementation, this would call a translation API
    // For now, we'll return the original text
    return text;
  } catch (error) {
    console.warn('Failed to translate lyrics:', error);
    return text;
  }
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