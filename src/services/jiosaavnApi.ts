import axios from 'axios';

// Create an axios instance with timeout
const apiClient = axios.create({
  timeout: 10000, // 10 second timeout
});

const API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';

// Utility function to get the highest quality image
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

  // Filter out images with invalid data
  const validImages = images.filter(img => img && img.link);
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
      const response = await apiClient.get(`${this.baseURL}/search/songs`, {
        params: { query, limit }
      });
      return response.data.data.results || [];
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
      const response = await apiClient.get(`${this.baseURL}/songs/${id}`);
      return response.data.data[0] || null;
    } catch (error) {
      console.error('Error getting song:', error);
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

  async getTrendingSongs(): Promise<Song[]> {
    try {
      // Get diverse trending Malayalam songs - focusing on 2024-2025 releases
      // Using varied queries to avoid duplicate cover images

      const queries = [
        'malayalam songs 2025 trending',
        'mollywood hits 2025',
        'malayalam top songs 2024',
        'malayalam viral songs',
        'malayalam popular songs 2025',
        'malayalam chart toppers',
        'malayalam latest hits'
      ];
      const allSongs: Song[] = [];
      const currentYear = 2025; // Only 2025 songs
      const seenImages = new Set<string>(); // Track images to avoid duplicates
      const seenNames = new Set<string>(); // Track names to avoid duplicates

      for (const query of queries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 20 }
          });
          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;

            // Process songs and ensure language is set
            const processedSongs = Array.isArray(songs) ? songs.map(song => ({
              ...song,
              // Ensure language is set to Malayalam if not already set
              language: song.language || 'Malayalam'
            })) : [];

            // Filter for Malayalam language songs from 2025 ONLY with unique images and names
            const malayalamSongs = processedSongs.filter(song => {
              const isCorrectLanguage = song.language && song.language.toLowerCase().includes('malayalam');

              // Check if song is from 2025 ONLY
              let is2025 = false;
              if (song.year) {
                const year = parseInt(song.year);
                is2025 = year === currentYear;
              } else if (song.releaseDate) {
                const releaseYear = new Date(song.releaseDate).getFullYear();
                is2025 = releaseYear === currentYear;
              }

              // Check for unique image to avoid duplicate covers
              const imageUrl = song.image?.[0]?.link || song.image?.[0] || '';
              const hasUniqueImage = imageUrl && !seenImages.has(imageUrl);
              if (hasUniqueImage && imageUrl) {
                seenImages.add(imageUrl);
              }

              // Check for unique name to avoid duplicate songs
              const normalizedName = song.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const hasUniqueName = !seenNames.has(normalizedName);
              if (hasUniqueName) {
                seenNames.add(normalizedName);
              }

              return isCorrectLanguage && is2025 && hasUniqueImage && hasUniqueName;
            });

            // Add to collection if we have Malayalam songs
            if (malayalamSongs.length > 0) {
              allSongs.push(...malayalamSongs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      // Shuffle to add variety
      const shuffled = uniqueSongs.sort(() => Math.random() - 0.5);

      console.log('[JioSaavn] Malayalam trending songs (2025 only, unique):', shuffled.length);

      return shuffled.slice(0, 50);
    } catch (error) {
      console.error('Error getting trending songs:', error);
      return [];
    }
  }

  async getMalayalamRomanceSongs(): Promise<Song[]> {
    try {
      // Try multiple approaches to get Malayalam romantic songs with diverse movies

      const romanticQueries = [
        'malayalam love songs',
        'malayalam romantic songs',
        'mollywood romance',
        'malayalam heart touching songs',
        'malayalam emotional songs',
        'malayalam old romantic songs',
        'malayalam classic love songs',
        'malayalam 90s romantic',
        'malayalam 2000s romantic',
        'malayalam new romantic songs',
        'premalu movie songs',
        'aavesham movie songs',
        '2018 movie songs',
        'kismath movie songs',
        'maharaja movie songs',
        'nna thaam vanne movie songs',
        'kumbakonam gopals movie songs',
        'oru adaar love movie songs',
        'hridayam movie songs',
        'june movie songs'
      ];

      const allSongs: Song[] = [];

      for (const query of romanticQueries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 30 }
          });

          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;
            // Filter for Malayalam language songs
            const malayalamSongs = Array.isArray(songs) ? songs.filter(song =>
              song.language && song.language.toLowerCase().includes('malayalam')
            ) : [];

            // Add to collection if we have Malayalam songs
            if (malayalamSongs.length > 0) {
              allSongs.push(...malayalamSongs);
            } else if (Array.isArray(songs) && songs.length > 0) {
              allSongs.push(...songs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      return uniqueSongs.slice(0, 20);
    } catch (error) {
      console.error('Error getting Malayalam romance songs:', error);
      return [];
    }
  }

  async getTamilTrendingSongs(): Promise<Song[]> {
    try {
      // Get diverse trending Tamil songs from 2024-2025
      const queries = [
        'tamil songs 2025 trending',
        'kollywood hits 2025',
        'tamil top songs 2024',
        'tamil viral songs',
        'tamil popular songs 2025',
        'tamil chart toppers',
        'tamil latest hits'
      ];

      const allSongs: Song[] = [];
      const currentYear = 2025; // Only 2025 songs
      const seenImages = new Set<string>(); // Track images to avoid duplicates
      const seenNames = new Set<string>(); // Track names to avoid duplicates

      for (const query of queries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 20 }
          });
          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;

            // Process songs and ensure language is set
            const processedSongs = Array.isArray(songs) ? songs.map(song => ({
              ...song,
              // Ensure language is set to Tamil if not already set
              language: song.language || 'Tamil'
            })) : [];

            // Filter for Tamil language songs from 2025 ONLY with unique images and names
            const tamilSongs = processedSongs.filter(song => {
              const isCorrectLanguage = song.language && song.language.toLowerCase().includes('tamil');

              // Check if song is from 2025 ONLY
              let is2025 = false;
              if (song.year) {
                const year = parseInt(song.year);
                is2025 = year === currentYear;
              } else if (song.releaseDate) {
                const releaseYear = new Date(song.releaseDate).getFullYear();
                is2025 = releaseYear === currentYear;
              }

              // Check for unique image to avoid duplicate covers
              const imageUrl = song.image?.[0]?.link || song.image?.[0] || '';
              const hasUniqueImage = imageUrl && !seenImages.has(imageUrl);
              if (hasUniqueImage && imageUrl) {
                seenImages.add(imageUrl);
              }

              // Check for unique name to avoid duplicate songs
              const normalizedName = song.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const hasUniqueName = !seenNames.has(normalizedName);
              if (hasUniqueName) {
                seenNames.add(normalizedName);
              }

              return isCorrectLanguage && is2025 && hasUniqueImage && hasUniqueName;
            });

            // Add to collection
            if (tamilSongs.length > 0) {
              allSongs.push(...tamilSongs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      // Shuffle to add variety
      const shuffled = uniqueSongs.sort(() => Math.random() - 0.5);

      console.log('[JioSaavn] Tamil trending songs (2025 only, unique):', shuffled.length);

      return shuffled.slice(0, 50);
    } catch (error) {
      console.error('Error getting Tamil trending songs:', error);
      return [];
    }
  }

  async getTamilRomanceSongs(): Promise<Song[]> {
    try {
      // Get Tamil romantic songs from specific Tamil movies
      const queries = [
        'tamil love songs 2025',
        'tamil romantic 2024',
        'kollywood love songs',
        'tamil emotional songs',
        'viswasam movie songs',
        'bigil movie songs',
        'master movie songs',
        'vikram movie songs',
        'kaithi movie songs'
      ];

      const allSongs: Song[] = [];

      for (const query of queries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 30 }
          });
          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;
            // Filter for Tamil language songs
            const tamilSongs = Array.isArray(songs) ? songs.filter(song =>
              song.language && song.language.toLowerCase().includes('tamil')
            ) : [];

            // Add to collection
            if (tamilSongs.length > 0) {
              allSongs.push(...tamilSongs);
            } else if (Array.isArray(songs) && songs.length > 0) {
              allSongs.push(...songs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      return uniqueSongs.slice(0, 25);
    } catch (error) {
      console.error('Error getting Tamil romance songs:', error);
      return [];
    }
  }

  async getHindiTrendingSongs(): Promise<Song[]> {
    try {
      // Get diverse trending Hindi songs from 2024-2025
      const queries = [
        'hindi songs 2025 trending',
        'bollywood hits 2025',
        'hindi top songs 2024',
        'hindi viral songs',
        'hindi popular songs 2025',
        'hindi chart toppers',
        'bollywood latest hits'
      ];

      const allSongs: Song[] = [];
      const currentYear = 2025; // Only 2025 songs
      const seenImages = new Set<string>(); // Track images to avoid duplicates
      const seenNames = new Set<string>(); // Track names to avoid duplicates

      for (const query of queries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 20 }
          });
          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;

            // Process songs and ensure language is set
            const processedSongs = Array.isArray(songs) ? songs.map(song => ({
              ...song,
              // Ensure language is set to Hindi if not already set
              language: song.language || 'Hindi'
            })) : [];

            // Filter for Hindi language songs from 2025 ONLY with unique images and names
            const hindiSongs = processedSongs.filter(song => {
              const isCorrectLanguage = song.language && song.language.toLowerCase().includes('hindi');

              // Check if song is from 2025 ONLY
              let is2025 = false;
              if (song.year) {
                const year = parseInt(song.year);
                is2025 = year === currentYear;
              } else if (song.releaseDate) {
                const releaseYear = new Date(song.releaseDate).getFullYear();
                is2025 = releaseYear === currentYear;
              }

              // Check for unique image to avoid duplicate covers
              const imageUrl = song.image?.[0]?.link || song.image?.[0] || '';
              const hasUniqueImage = imageUrl && !seenImages.has(imageUrl);
              if (hasUniqueImage && imageUrl) {
                seenImages.add(imageUrl);
              }

              // Check for unique name to avoid duplicate songs
              const normalizedName = song.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const hasUniqueName = !seenNames.has(normalizedName);
              if (hasUniqueName) {
                seenNames.add(normalizedName);
              }

              return isCorrectLanguage && is2025 && hasUniqueImage && hasUniqueName;
            });

            // Add to collection
            if (hindiSongs.length > 0) {
              allSongs.push(...hindiSongs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      // Shuffle to add variety
      const shuffled = uniqueSongs.sort(() => Math.random() - 0.5);

      console.log('[JioSaavn] Hindi trending songs (2025 only, unique):', shuffled.length);

      return shuffled.slice(0, 50);
    } catch (error) {
      console.error('Error getting Hindi trending songs:', error);
      return [];
    }
  }

  async getHindiRomanceSongs(): Promise<Song[]> {
    try {
      // Get Hindi romantic songs from specific Bollywood movies
      const queries = [
        'hindi love songs 2025',
        'hindi romantic 2024',
        'bollywood love songs 2024',
        'saiyaara movie songs',
        'hindi emotional songs 2025',
        'shamshera movie songs',
        'raksha bandhan movie songs',
        'janhit mein jaari movie songs',
        'bheed movie songs'
      ];

      const allSongs: Song[] = [];

      for (const query of queries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 30 }
          });
          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;
            // Filter for Hindi language songs
            const hindiSongs = Array.isArray(songs) ? songs.filter(song =>
              song.language && song.language.toLowerCase().includes('hindi')
            ) : [];

            // Add to collection
            if (hindiSongs.length > 0) {
              allSongs.push(...hindiSongs);
            } else if (Array.isArray(songs) && songs.length > 0) {
              allSongs.push(...songs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      return uniqueSongs.slice(0, 25);
    } catch (error) {
      console.error('Error getting Hindi romance songs:', error);
      return [];
    }
  }

  async getEnglishNewReleases(): Promise<Song[]> {
    try {
      // Get diverse English songs from 2024-2025
      const queries = [
        'english songs 2025 trending',
        'pop hits 2025',
        'english top songs 2024',
        'english viral songs',
        'english popular songs 2025',
        'english chart toppers',
        'latest english hits'
      ];

      const allSongs: Song[] = [];
      const currentYear = 2025;
      const previousYear = 2024;
      const seenImages = new Set<string>(); // Track images to avoid duplicates

      for (const query of queries) {
        try {
          const response = await apiClient.get(`${this.baseURL}/search/songs`, {
            params: { query, limit: 25 }
          });
          if (response.data && response.data.data && response.data.data.results) {
            const songs = response.data.data.results;

            // Process songs and ensure language is set
            const processedSongs = Array.isArray(songs) ? songs.map(song => ({
              ...song,
              // Ensure language is set to English if not already set
              language: song.language || 'English'
            })) : [];

            // Filter for English language songs from 2024-2025 with unique images
            const englishSongs = processedSongs.filter(song => {
              const isCorrectLanguage = song.language && song.language.toLowerCase().includes('english');

              // Check if song is from 2024 or 2025
              let isRecent = false;
              if (song.year) {
                const year = parseInt(song.year);
                isRecent = year === currentYear || year === previousYear;
              } else if (song.releaseDate) {
                const releaseYear = new Date(song.releaseDate).getFullYear();
                isRecent = releaseYear === currentYear || releaseYear === previousYear;
              }

              // Check for unique image to avoid duplicate covers
              const imageUrl = song.image?.[0]?.link || song.image?.[0] || '';
              const hasUniqueImage = imageUrl && !seenImages.has(imageUrl);
              if (hasUniqueImage && imageUrl) {
                seenImages.add(imageUrl);
              }

              return isCorrectLanguage && isRecent && hasUniqueImage;
            });

            // Add to collection
            if (englishSongs.length > 0) {
              allSongs.push(...englishSongs);
            }
          }
        } catch (err) {
          continue;
        }
      }

      // Remove duplicates by song ID
      const uniqueSongs = allSongs.filter((song, index, self) =>
        index === self.findIndex(s => s.id === song.id)
      );

      // Shuffle to add variety
      const shuffled = uniqueSongs.sort(() => Math.random() - 0.5);

      console.log('[JioSaavn] English new releases (2024-2025, unique covers):', shuffled.length);

      return shuffled.slice(0, 50);
    } catch (error) {
      console.error('Error getting English new releases:', error);
      return [];
    }
  }
}

export const jiosaavnApi = new JioSaavnAPI();

// Standalone function for high-res image fetching
export const getSongDetails = (id: string) => jiosaavnApi.getSongDetails(id);
