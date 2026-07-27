import axios from 'axios';
import { makeRateLimitedCall } from '@/utils/apiRateLimit';
import { monitoredApiCall } from '@/utils/apiMonitor';

// Create an axios instance with timeout
const apiClient = axios.create({
  timeout: 10000, // 10 second timeout
});

// Route all JioSaavn calls through the local Express backend proxy.
// This avoids browser CORS blocks and the 402 Payment Required error
// from the external Vercel deployment. Vite proxies /api → localhost:5009.
const API_BASE_URL = '/api/jiosaavn';

// Utility function to get the highest quality image with better deduplication
export const getHighestQualityImage = (images: Array<{ quality?: string; link: string }> | string): string => {
  if (!images) return '';

  // Handle case where images is a string (single URL)
  if (typeof images === 'string') {
    return images;
  }

  // Handle case where images is not an array
  if (!Array.isArray(images)) {
    return '';
  }

  if (images.length === 0) return '';

  // Filter out images with invalid data and suspicious URLs
  const validImages = images.filter(img => {
    if (!img || !img.link || typeof img.link !== 'string') return false;
    
    const url = img.link.toLowerCase();
    const suspiciousPatterns = [
      'placeholder',
      'default',
      'generic',
      'unknown',
      'noimage',
      'no_image',
      'missing',
      'temp',
      'thumbnail_',
      'thumb_',
      'small_',
      '50x50',
      '100x100',
      '150x150',
      'banner',
      'cover_all',
      'playlist'
    ];
    
    // Reject URLs with suspicious patterns
    if (suspiciousPatterns.some(pattern => url.includes(pattern))) {
      return false;
    }
    
    // Reject very short URLs (likely invalid)
    if (img.link.length < 30) {
      return false;
    }
    
    return true;
  });
  
  if (validImages.length === 0) return '';

  // Sort images by quality (highest first) - handle cases where quality might be missing
  const sortedImages = [...validImages].sort((a, b) => {
    // Extract numeric values from quality strings like "500x500"
    const getQualityValue = (quality?: string): number => {
      if (!quality) return 0;
      const match = quality.match(/(\d+)x(\d+)/);
      if (match) {
        const w = parseInt(match[1], 10);
        const h = parseInt(match[2], 10);
        const pixels = w * h;

        // Prioritize square images (album art) over wide banners
        // A ratio close to 1.0 indicates a square
        const ratio = w / h;
        const isSquare = ratio >= 0.9 && ratio <= 1.1;

        // Boost score for square images to prefer 500x500 over 800x400
        return isSquare ? pixels * 2 : pixels;
      }
      return 0;
    };

    return getQualityValue(b.quality) - getQualityValue(a.quality);
  });

  // Return the link of the highest quality image
  return sortedImages[0]?.link || '';
};

export interface Song {
  id: string;
  name: string;
  album: {
    id: string;
    name: string;
    url: string;
  };
  year: string;
  releaseDate: string;
  duration: number;
  label: string;
  primaryArtists: string;
  primaryArtistsId: string;
  featuredArtists: string;
  featuredArtistsId: string;
  explicitContent: boolean;
  playCount: number;
  language: string;
  hasLyrics: boolean;
  url: string;
  copyright: string;
  image: Array<{ quality: string; link: string }>;
  downloadUrl: Array<{ quality: string; link: string }>;
}

export interface Album {
  id: string;
  name: string;
  year: string;
  type: string;
  playCount: string;
  language: string;
  explicitContent: string;
  songCount: string;
  url: string;
  primaryArtists: Array<{ id: string; name: string; url: string; image: Array<{ quality: string; link: string }> }>;
  image: Array<{ quality: string; link: string }>;
}

export interface SearchResult {
  songs?: { results: Song[] };
  albums?: { results: Album[] };
  playlists?: { results: any[] };
}


class JioSaavnAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async searchSongs(query: string, limit: number = 50): Promise<Song[]> {
    try {
      return await monitoredApiCall(
        'search/songs',
        () => makeRateLimitedCall(
          'search/songs',
          async () => {
            const response = await apiClient.get(`${this.baseURL}/search/songs`, {
              params: { query, limit }
            });
            return response.data.data.results || [];
          },
          { maxRetries: 1, retryDelay: 2000 }
        )
      );
    } catch (error) {
      console.error('Error searching songs:', error);
      return [];
    }
  }

  async searchAlbums(query: string, limit: number = 50): Promise<Album[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/search/albums`, {
        params: { query, limit }
      });
      return response.data.data.results || [];
    } catch (error) {
      console.error('Error searching albums:', error);
      return [];
    }
  }

  async searchAll(query: string): Promise<SearchResult> {
    try {
      const response = await apiClient.get(`${this.baseURL}/search/all`, {
        params: { query }
      });
      return response.data.data || {};
    } catch (error) {
      console.error('Error searching all:', error);
      return {};
    }
  }

  async getSongById(id: string): Promise<Song | null> {
    try {
      return await makeRateLimitedCall(
        `songs/${id}`,
        async () => {
          const response = await apiClient.get(`${this.baseURL}/songs/${id}`);
          return response.data.data[0] || null;
        },
        { maxRetries: 1, retryDelay: 1500 }
      );
    } catch (error: any) {
      // Reduce console spam by only logging significant errors
      if (error?.response?.status === 404) {
        // Don't log 404 errors as they're common and expected
        return null;
      } else if (error?.response?.status === 403) {
        console.debug(`[JioSaavn] Rate limited for song: ${id}`);
      } else if (error?.code === 'ECONNABORTED') {
        console.debug(`[JioSaavn] Timeout getting song: ${id}`);
      } else if (error?.response?.status >= 500) {
        console.warn(`[JioSaavn] Server error (${error.response.status}) for song: ${id}`);
      } else {
        console.debug('[JioSaavn] Error getting song:', error?.message || error);
      }
      return null;
    }
  }

  // Alias for getSongById - used for high-res image fetching
  async getSongDetails(id: string): Promise<Song | null> {
    return this.getSongById(id);
  }

  async getAlbumById(id: string): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseURL}/albums`, {
        params: { id }
      });
      return response.data.data || null;
    } catch (error) {
      console.error('Error getting album:', error);
      return null;
    }
  }

  // Helper: fetch fresh songs from real album releases (no compilations)
  private async getFreshSongs(language: string, limit = 30): Promise<Song[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/fresh-songs/${language}`, {
        params: { limit }
      });
      return response.data?.data || [];
    } catch {
      return [];
    }
  }

  async getTrendingSongs(): Promise<Song[]> {
    return this.getFreshSongs('malayalam', 40);
  }

  async getTamilTrendingSongs(): Promise<Song[]> {
    return this.getFreshSongs('tamil', 40);
  }

  async getHindiTrendingSongs(): Promise<Song[]> {
    return this.getFreshSongs('hindi', 40);
  }

  async getMalayalamRomanceSongs(): Promise<Song[]> {
    try {
      // Single targeted request instead of looping 20 queries
      const response = await apiClient.get(`${this.baseURL}/search/songs`, {
        params: { query: 'malayalam romantic love songs', limit: 30 }
      });
      const results = response.data?.data?.results || [];
      const songs: Song[] = Array.isArray(results) ? results : [];
      const filtered = songs.filter((s: Song) => s.language?.toLowerCase().includes('malayalam'));
      return (filtered.length > 0 ? filtered : songs).slice(0, 20);
    } catch (error) {
      console.error('Error getting Malayalam romance songs:', error);
      return [];
    }
  }

  async getTamilRomanceSongs(): Promise<Song[]> {
    try {
      // Single targeted request instead of looping 9 queries
      const response = await apiClient.get(`${this.baseURL}/search/songs`, {
        params: { query: 'tamil romantic love songs', limit: 30 }
      });
      const results = response.data?.data?.results || [];
      const songs: Song[] = Array.isArray(results) ? results : [];
      const filtered = songs.filter((s: Song) => s.language?.toLowerCase().includes('tamil'));
      return (filtered.length > 0 ? filtered : songs).slice(0, 25);
    } catch (error) {
      console.error('Error getting Tamil romance songs:', error);
      return [];
    }
  }

  async getHindiRomanceSongs(): Promise<Song[]> {
    try {
      // Single targeted request instead of looping 9 queries
      const response = await apiClient.get(`${this.baseURL}/search/songs`, {
        params: { query: 'hindi romantic love songs bollywood', limit: 30 }
      });
      const results = response.data?.data?.results || [];
      const songs: Song[] = Array.isArray(results) ? results : [];
      const filtered = songs.filter((s: Song) => s.language?.toLowerCase().includes('hindi'));
      return (filtered.length > 0 ? filtered : songs).slice(0, 25);
    } catch (error) {
      console.error('Error getting Hindi romance songs:', error);
      return [];
    }
  }

  async getEnglishNewReleases(): Promise<Song[]> {
    try {
      // Single targeted request instead of looping 7 queries
      const response = await apiClient.get(`${this.baseURL}/search/songs`, {
        params: { query: 'english pop hits 2025', limit: 50 }
      });
      const results = response.data?.data?.results || [];
      const songs: Song[] = Array.isArray(results) ? results.map((s: any) => ({
        ...s,
        language: s.language || 'English',
      })) : [];
      return songs.filter((s: Song) => s.language?.toLowerCase().includes('english'));
    } catch (error) {
      console.error('Error getting English new releases:', error);
      return [];
    }
  }
}

export const jiosaavnApi = new JioSaavnAPI();

// Standalone function for high-res image fetching
export const getSongDetails = (id: string) => jiosaavnApi.getSongDetails(id);
