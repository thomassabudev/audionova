/**
 * Image Utilities
 * Handles image URL normalization and quality selection
 */

export type ImageInput =
  | string
  | string[]
  | Array<{ quality?: string; link: string }>
  | { [key: string]: any }
  | null
  | undefined;

/**
 * Get the highest quality image URL from various input formats
 * 
 * Handles:
 * - Single string URL
 * - Array of string URLs (selects longest/highest resolution)
 * - Array of objects with quality and link properties
 * - Object with quality keys (original, large, medium, small, etc.)
 * 
 * @param img - Image input in various formats
 * @returns Highest quality image URL or null if not available
 */
export const getHighestQualityImage = (img: ImageInput): string | null => {
  if (!img) return null;

  // If API already gives a single URL string
  if (typeof img === 'string' && img.trim()) {
    return img;
  }

  // If image is an array
  if (Array.isArray(img) && img.length > 0) {
    const firstItem = img[0];

    // Array of objects with quality and link
    if (typeof firstItem === 'object' && firstItem !== null && 'link' in firstItem) {
      // Sort by quality (highest first)
      const sortedImages = [...img].sort((a: any, b: any) => {
        const getQualityValue = (quality?: string): number => {
          if (!quality) return 0;
          // Extract numeric values from quality strings like "500x500"
          const match = quality.match(/(\d+)x(\d+)/);
          if (match) {
            const w = parseInt(match[1], 10);
            const h = parseInt(match[2], 10);
            const pixels = w * h;

            // Prioritize square images (album art) over wide banners
            const ratio = w / h;
            const isSquare = ratio >= 0.9 && ratio <= 1.1;

            // Boost score for square images
            return isSquare ? pixels * 2 : pixels;
          }
          return 0;
        };
        return getQualityValue(b.quality) - getQualityValue(a.quality);
      });

      return sortedImages[0]?.link || null;
    }

    // Array of string URLs
    if (typeof firstItem === 'string') {
      // Try to find the highest resolution by parsing URL patterns
      const sortedUrls = [...img].sort((a: any, b: any) => {
        const getResolution = (url: string): number => {
          if (typeof url !== 'string') return 0;
          // Look for resolution patterns like 150x150, 500x500, 1000x1000
          const match = url.match(/(\d+)x(\d+)/);
          if (match) {
            return parseInt(match[1]) * parseInt(match[2]);
          }
          // Fallback: longer URLs often indicate higher quality
          return url.length;
        };
        return getResolution(b) - getResolution(a);
      });

      return sortedUrls[0] || null;
    }
  }

  // If it's an object with keys like 'default', 'small', 'medium', 'large', 'original'
  if (typeof img === 'object' && img !== null) {
    const candidates = ['original', 'large', 'medium', 'small', 'thumbnail', 'default'];
    for (const key of candidates) {
      if ((img as any)[key]) {
        const value = (img as any)[key];
        if (typeof value === 'string' && value.length > 0) {
          return value;
        }
      }
    }

    // Fallback: any string-valued property
    const values = Object.values(img);
    const firstString = values.find(v => typeof v === 'string' && v.length > 0);
    return firstString ? String(firstString) : null;
  }

  return null;
};

/**
 * Normalize a song's image property to a single high-quality URL string
 * 
 * @param song - Song object with image property
 * @returns Song with normalized image as string
 */
export const normalizeSongImage = <T extends { image?: any }>(song: T): T & { image: string | null } => {
  const highQualityUrl = getHighestQualityImage(song.image);

  return {
    ...song,
    image: highQualityUrl
  };
};

/**
 * Normalize an array of songs' images
 * 
 * @param songs - Array of songs
 * @returns Array of songs with normalized images
 */
export const normalizeSongsImages = <T extends { image?: any }>(songs: T[]): Array<T & { image: string | null }> => {
  return songs.map(song => normalizeSongImage(song));
};

/**
 * Get a fallback placeholder image URL
 * 
 * @param text - Optional text to display in placeholder
 * @returns Data URL for SVG placeholder
 */
export const getPlaceholderImage = (text: string = 'No Image'): string => {
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="500"%3E%3Crect fill="%23a855f7" width="500" height="500"/%3E%3Ctext fill="%23ffffff" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
};

/**
 * Get image URL with fallback to placeholder
 * 
 * @param img - Image input
 * @param fallbackText - Text for placeholder if image not available
 * @returns Image URL or placeholder
 */
export const getImageUrlWithFallback = (img: ImageInput, fallbackText?: string): string => {
  const url = getHighestQualityImage(img);
  return url || getPlaceholderImage(fallbackText);
};
