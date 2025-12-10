import { jiosaavnApi } from './jiosaavnApi';
import type { Song } from './jiosaavnApi';
import { gaanaApi } from './gaanaApi';

export interface UnifiedSong extends Song {
  source: 'jiosaavn' | 'gaana';
}

class MusicService {
  /**
   * Search songs across multiple music services
   */
  async searchSongs(query: string, limit: number = 50): Promise<UnifiedSong[]> {
    try {
      // Search using JioSaavn API
      const jiosaavnSongs = await jiosaavnApi.searchSongs(query, limit);
      const unifiedJioSaavnSongs: UnifiedSong[] = jiosaavnSongs.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));

      // Search using Gaana API (currently placeholder)
      const gaanaSongs = await gaanaApi.searchSongs(query, limit);
      const unifiedGaanaSongs: UnifiedSong[] = gaanaSongs.map(song => ({
        ...song,
        source: 'gaana'
      }));

      // Combine results from both services
      // In a real implementation, you might want to implement some ranking or deduplication
      return [...unifiedJioSaavnSongs, ...unifiedGaanaSongs];
    } catch (error) {
      console.error('Error searching songs across services:', error);
      return [];
    }
  }

  /**
   * Get trending songs from multiple services
   */
  async getTrendingSongs(limit: number = 20): Promise<UnifiedSong[]> {
    try {
      // Get trending songs from JioSaavn
      const jiosaavnTrending = await jiosaavnApi.getTrendingSongs();
      console.log('MusicService: JioSaavn returned', jiosaavnTrending.length, 'trending songs');
      
      // Log duration values
      jiosaavnTrending.slice(0, 5).forEach((song, index) => {
        console.log(`Trending song ${index} duration:`, song.duration);
      });
      
      const unifiedJioSaavnSongs: UnifiedSong[] = jiosaavnTrending.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));

      // Get trending songs from Gaana (currently placeholder)
      const gaanaTrending = await gaanaApi.getTrendingSongs();
      const unifiedGaanaSongs: UnifiedSong[] = gaanaTrending.map(song => ({
        ...song,
        source: 'gaana'
      }));

      // Combine and limit results
      const combined = [...unifiedJioSaavnSongs, ...unifiedGaanaSongs];
      console.log('MusicService: Returning', combined.length, 'combined trending songs');
      return combined.slice(0, limit);
    } catch (error) {
      console.error('Error getting trending songs:', error);
      // Fallback to JioSaavn only
      const jiosaavnTrending = await jiosaavnApi.getTrendingSongs();
      return jiosaavnTrending.map(song => ({
        ...song,
        source: 'jiosaavn' as 'jiosaavn' | 'gaana'
      })).slice(0, limit);
    }
  }

  /**
   * Get Malayalam romantic songs from multiple services
   */
  async getMalayalamRomanceSongs(limit: number = 20): Promise<UnifiedSong[]> {
    try {
      console.log('MusicService: Getting Malayalam romance songs...');
      // Get Malayalam romantic songs from JioSaavn
      const jiosaavnRomance = await jiosaavnApi.getMalayalamRomanceSongs();
      console.log('MusicService: JioSaavn returned', jiosaavnRomance.length, 'romance songs');
      
      // Log duration values
      jiosaavnRomance.slice(0, 5).forEach((song, index) => {
        console.log(`Romance song ${index} duration:`, song.duration);
      });
      
      const unifiedJioSaavnSongs: UnifiedSong[] = jiosaavnRomance.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));

      // For Gaana, we would implement similar logic if it had search capabilities
      // For now, we'll just return JioSaavn results
      console.log('MusicService: Returning', unifiedJioSaavnSongs.length, 'unified romance songs');
      return [...unifiedJioSaavnSongs].slice(0, limit);
    } catch (error) {
      console.error('Error getting Malayalam romance songs:', error);
      // Fallback to JioSaavn only
      const jiosaavnRomance = await jiosaavnApi.getMalayalamRomanceSongs();
      return jiosaavnRomance.map(song => ({
        ...song,
        source: 'jiosaavn' as 'jiosaavn' | 'gaana'
      })).slice(0, limit);
    }
  }

  /**
   * Get Tamil romantic songs from multiple services
   */
  async getTamilRomanceSongs(limit: number = 50): Promise<UnifiedSong[]> {
    try {
      console.log('MusicService: Getting Tamil romance songs...');
      // Get Tamil romantic songs from JioSaavn
      const jiosaavnRomance = await jiosaavnApi.getTamilRomanceSongs();
      console.log('MusicService: JioSaavn returned', jiosaavnRomance.length, 'Tamil romance songs');
      
      const unifiedJioSaavnSongs: UnifiedSong[] = jiosaavnRomance.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));

      console.log('MusicService: Returning', unifiedJioSaavnSongs.length, 'unified Tamil romance songs');
      return [...unifiedJioSaavnSongs].slice(0, limit);
    } catch (error) {
      console.error('Error getting Tamil romance songs:', error);
      // Fallback to JioSaavn only
      const jiosaavnRomance = await jiosaavnApi.getTamilRomanceSongs();
      return jiosaavnRomance.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));
    }
  }

  /**
   * Get Hindi romantic songs from multiple services
   */
  async getHindiRomanceSongs(limit: number = 50): Promise<UnifiedSong[]> {
    try {
      console.log('MusicService: Getting Hindi romance songs...');
      // Get Hindi romantic songs from JioSaavn
      const jiosaavnRomance = await jiosaavnApi.getHindiRomanceSongs();
      console.log('MusicService: JioSaavn returned', jiosaavnRomance.length, 'Hindi romance songs');
      
      const unifiedJioSaavnSongs: UnifiedSong[] = jiosaavnRomance.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));

      console.log('MusicService: Returning', unifiedJioSaavnSongs.length, 'unified Hindi romance songs');
      return [...unifiedJioSaavnSongs].slice(0, limit);
    } catch (error) {
      console.error('Error getting Hindi romance songs:', error);
      // Fallback to JioSaavn only
      const jiosaavnRomance = await jiosaavnApi.getHindiRomanceSongs();
      return jiosaavnRomance.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));
    }
  }

  /**
   * Get Hindi trending songs from multiple services
   */
  async getHindiTrendingSongs(limit: number = 50): Promise<UnifiedSong[]> {
    try {
      console.log('MusicService: Getting Hindi trending songs...');
      // Get Hindi trending songs from JioSaavn
      const jiosaavnTrending = await jiosaavnApi.getHindiTrendingSongs();
      console.log('MusicService: JioSaavn returned', jiosaavnTrending.length, 'Hindi trending songs');
      
      const unifiedJioSaavnSongs: UnifiedSong[] = jiosaavnTrending.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));

      console.log('MusicService: Returning', unifiedJioSaavnSongs.length, 'unified Hindi trending songs');
      return [...unifiedJioSaavnSongs].slice(0, limit);
    } catch (error) {
      console.error('Error getting Hindi trending songs:', error);
      // Fallback to JioSaavn only
      const jiosaavnTrending = await jiosaavnApi.getHindiTrendingSongs();
      return jiosaavnTrending.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));
    }
  }

  async getSongById(id: string, source: 'jiosaavn' | 'gaana'): Promise<UnifiedSong | null> {
    try {
      if (source === 'jiosaavn') {
        const song = await jiosaavnApi.getSongById(id);
        return song ? { ...song, source: 'jiosaavn' } : null;
      } else {
        // For Gaana, we would need a different approach since it works with URLs
        // This is a placeholder implementation
        return null;
      }
    } catch (error) {
      console.error(`Error getting song ${id} from ${source}:`, error);
      return null;
    }
  }

  /**
   * Get new releases from the backend API
   */
  async getNewReleases(limit: number = 20, forceRefresh: boolean = false): Promise<UnifiedSong[]> {
    try {
      console.log(`Fetching new releases with limit: ${limit}`);
      
      // Add cache-busting parameter if forceRefresh is true
      const cacheBuster = forceRefresh ? `&_=${new Date().getTime()}` : '';
      
      // First try to get new releases from our backend
      const response = await fetch(`/api/new-releases?limit=${limit}${cacheBuster}`);
      
      // Check if the response is ok
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        // Fallback to JioSaavn API for new releases
        return this.getJioSaavnNewReleases(limit);
      }
      
      const data = await response.json();
      console.log('New releases API response:', data);
      
      if (data.success) {
        // If we have data from our backend, convert it
        if (data.data && data.data.length > 0) {
          // Convert backend song format to UnifiedSong format
          const songs = data.data.map((song: any) => ({
            id: song.external_id,
            name: song.title,
            album: {
              id: '',
              name: song.album,
              url: ''
            },
            year: new Date(song.release_date).getFullYear().toString(),
            releaseDate: song.release_date,
            duration: 0, // Duration not available in this format
            label: '',
            primaryArtists: song.artists,
            primaryArtistsId: '',
            featuredArtists: '',
            featuredArtistsId: '',
            explicitContent: false,
            playCount: 0,
            language: song.language === 'ml' ? 'Malayalam' : song.language === 'ta' ? 'Tamil' : 'Hindi',
            hasLyrics: false,
            url: '',
            copyright: '',
            image: typeof song.metadata === 'string' ? JSON.parse(song.metadata)?.image || [] : song.metadata?.image || [],
            downloadUrl: typeof song.metadata === 'string' ? JSON.parse(song.metadata)?.downloadUrl || [] : song.metadata?.downloadUrl || [],
            source: 'jiosaavn' // Assuming all new releases are from JioSaavn
          }));
          
          console.log(`Successfully converted ${songs.length} new releases from backend`);
          return songs;
        } else {
          // If no data from backend, fallback to JioSaavn API
          console.log('No new releases from backend, falling back to JioSaavn API');
          return this.getJioSaavnNewReleases(limit);
        }
      } else {
        console.error('Error fetching new releases from backend:', data.error);
        // Fallback to JioSaavn API
        return this.getJioSaavnNewReleases(limit);
      }
    } catch (error) {
      console.error('Error fetching new releases from backend:', error);
      // Fallback to JioSaavn API
      return this.getJioSaavnNewReleases(limit);
    }
  }

  /**
   * Get new releases directly from JioSaavn API
   */
  private async getJioSaavnNewReleases(limit: number = 20): Promise<UnifiedSong[]> {
    try {
      console.log('Fetching new releases from JioSaavn API');
      
      // Use the same approach as in jiosaavnApi service to get better songs - INCLUDING ENGLISH
      const [malayalamSongs, tamilSongs, hindiSongs, englishSongs] = await Promise.all([
        jiosaavnApi.getTrendingSongs(), // Malayalam trending
        jiosaavnApi.getTamilTrendingSongs(), // Tamil trending
        jiosaavnApi.getHindiTrendingSongs(), // Hindi trending
        jiosaavnApi.getEnglishNewReleases() // English new releases
      ]);
      
      // Combine all songs
      const combinedSongs = [...malayalamSongs, ...tamilSongs, ...hindiSongs, ...englishSongs];
      
      // Remove duplicates by song ID
      const uniqueSongs = combinedSongs.filter((song, index, self) => 
        index === self.findIndex(s => s.id === song.id)
      );
      
      // Sort by play count (most popular first) and then by release date
      uniqueSongs.sort((a, b) => {
        // First sort by play count
        if (a.playCount && b.playCount) {
          if (b.playCount !== a.playCount) {
            return b.playCount - a.playCount;
          }
        }
        
        // Then sort by release date (newest first)
        if (a.releaseDate && b.releaseDate) {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        
        // Fallback to year if releaseDate is not available
        if (a.year && b.year) {
          return parseInt(b.year) - parseInt(a.year);
        }
        
        return 0;
      });
      
      // Convert to UnifiedSong format
      const unifiedSongs: UnifiedSong[] = uniqueSongs.map(song => ({
        ...song,
        source: 'jiosaavn'
      }));
      
      console.log(`Successfully fetched ${unifiedSongs.length} new releases from JioSaavn`);
      return unifiedSongs.slice(0, limit);
    } catch (error) {
      console.error('Error fetching new releases from JioSaavn:', error);
      // Return sample data only as last resort
      return this.getSampleNewReleases(limit);
    }
  }

  /**
   * Get sample new releases for testing when backend is not available
   */
  private getSampleNewReleases(limit: number = 20): UnifiedSong[] {
    console.log('Returning sample new releases for testing');
    const sampleSongs: UnifiedSong[] = [
      // Malayalam Songs
      {
        id: 'ml_new_1',
        name: 'Chithram Bhalare Chithram',
        album: {
          id: 'album_ml_1',
          name: 'Chithram',
          url: ''
        },
        year: '2025',
        releaseDate: new Date().toISOString(),
        duration: 240,
        label: 'Malayalam Cine Music',
        primaryArtists: 'K. J. Yesudas',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 100000,
        language: 'Malayalam',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/ff6b6b/white?text=Chithram'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/chithram-bhalare-chithram.mp3'
          }
        ],
        source: 'jiosaavn'
      },
      {
        id: 'ml_new_2',
        name: 'Mouna Raagam',
        album: {
          id: 'album_ml_2',
          name: 'Mouna Raagam',
          url: ''
        },
        year: '2025',
        releaseDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        duration: 180,
        label: 'Malayalam Cine Music',
        primaryArtists: 'Malaysia Vasudevan',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 85000,
        language: 'Malayalam',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/4ecdc4/white?text=Mouna+Raagam'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/mouna-raagam.mp3'
          }
        ],
        source: 'jiosaavn'
      },
      {
        id: 'ml_new_3',
        name: 'Nokketha Doorathu Kannum Nattu',
        album: {
          id: 'album_ml_3',
          name: 'Nokketha Doorathu Kannum Nattu',
          url: ''
        },
        year: '2025',
        releaseDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        duration: 210,
        label: 'Malayalam Cine Music',
        primaryArtists: 'K. S. Chithra',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 120000,
        language: 'Malayalam',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/ff9f1c/white?text=Nokketha+Doorathu'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/nokketha-doorathu-kannum-nattu.mp3'
          }
        ],
        source: 'jiosaavn'
      },
      // Tamil Songs
      {
        id: 'ta_new_1',
        name: 'Chinna Chinna Aasai',
        album: {
          id: 'album_ta_1',
          name: 'Roja',
          url: ''
        },
        year: '2025',
        releaseDate: new Date().toISOString(),
        duration: 220,
        label: 'Tamil Cine Music',
        primaryArtists: 'S. P. Balasubrahmanyam',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 150000,
        language: 'Tamil',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/ff6b6b/white?text=Roja'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/chinna-chinna-aasai.mp3'
          }
        ],
        source: 'jiosaavn'
      },
      {
        id: 'ta_new_2',
        name: 'Enna Satham Indha Neram',
        album: {
          id: 'album_ta_2',
          name: 'Punnagai Mannan',
          url: ''
        },
        year: '2025',
        releaseDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        duration: 190,
        label: 'Tamil Cine Music',
        primaryArtists: 'K. S. Chithra',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 95000,
        language: 'Tamil',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/4ecdc4/white?text=Punnagai+Mannan'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/enna-satham-indha-neram.mp3'
          }
        ],
        source: 'jiosaavn'
      },
      // Hindi Songs
      {
        id: 'hi_new_1',
        name: 'Tum Hi Ho',
        album: {
          id: 'album_hi_1',
          name: 'Aashiqui 2',
          url: ''
        },
        year: '2025',
        releaseDate: new Date().toISOString(),
        duration: 260,
        label: 'Hindi Cine Music',
        primaryArtists: 'Arijit Singh',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 200000,
        language: 'Hindi',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/ff6b6b/white?text=Aashiqui+2'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/tum-hi-ho.mp3'
          }
        ],
        source: 'jiosaavn'
      },
      {
        id: 'hi_new_2',
        name: 'Kal Ho Naa Ho',
        album: {
          id: 'album_hi_2',
          name: 'Kal Ho Naa Ho',
          url: ''
        },
        year: '2025',
        releaseDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        duration: 300,
        label: 'Hindi Cine Music',
        primaryArtists: 'Sonu Nigam',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: false,
        playCount: 180000,
        language: 'Hindi',
        hasLyrics: true,
        url: '',
        copyright: '',
        image: [
          {
            quality: '500x500',
            link: 'https://placehold.co/500x500/4ecdc4/white?text=Kal+Ho+Naa+Ho'
          }
        ],
        downloadUrl: [
          {
            quality: '320kbps',
            link: 'https://example.com/kal-ho-naa-ho.mp3'
          }
        ],
        source: 'jiosaavn'
      }
    ];

    return sampleSongs.slice(0, limit);
  }
}

export const musicService = new MusicService();