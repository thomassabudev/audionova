const axios = require('axios');

// Create an axios instance with timeout
const apiClient = axios.create({
  timeout: 10000, // 10 second timeout
});

const API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';

// Utility function to get the highest quality image
const getHighestQualityImage = (images) => {
  if (!images || images.length === 0) return '';
  
  // Sort images by quality (highest first)
  const sortedImages = [...images].sort((a, b) => {
    // Extract numeric values from quality strings like "500x500"
    const getQualityValue = (quality) => {
      const match = quality.match(/(\d+)x(\d+)/);
      if (match) {
        return parseInt(match[1], 10) * parseInt(match[2], 10);
      }
      return 0;
    };
    
    return getQualityValue(b.quality) - getQualityValue(a.quality);
  });
  
  // Return the link of the highest quality image
  return sortedImages[0]?.link || '';
};

class JioSaavnAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async searchSongs(query, limit = 50) {
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

  async getTrendingSongs() {
    try {
      // Try multiple approaches to get trending Malayalam songs with diverse movies
      const queries = [
        'malayalam songs 2025',
        'mollywood trending 2024',
        'new malayalam releases',
        'malayalam cinema 2025',
        'premalu movie songs',
        'aavesham movie songs',
        '2018 movie songs',
        'kismath movie songs',
        'maharaja movie songs',
        'nna thaam vanne movie songs'
      ];
      
      const allSongs = [];
      
      for (const query of queries) {
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
      
      return uniqueSongs.slice(0, 50);
    } catch (error) {
      console.error('Error getting trending songs:', error);
      return [];
    }
  }
}

module.exports = { JioSaavnAPI, getHighestQualityImage };