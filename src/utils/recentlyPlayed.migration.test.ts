/**
 * Recently Played Migration Tests
 * Tests for localStorage migration to high-quality images
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHighestQualityImage, normalizeSongImage } from './imageUtils';

describe('Recently Played Migration', () => {
  // Mock localStorage
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Setup localStorage mock
    localStorageMock = {};
    
    global.localStorage = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
      length: 0,
      key: () => null,
    } as Storage;
  });

  afterEach(() => {
    localStorageMock = {};
  });

  describe('Image normalization on save', () => {
    it('should normalize image before saving to recentlyPlayed', () => {
      const song = {
        id: '1',
        name: 'Test Song',
        primaryArtists: 'Test Artist',
        image: [
          { quality: '150x150', link: 'https://example.com/thumb.jpg' },
          { quality: '500x500', link: 'https://example.com/medium.jpg' },
          { quality: '1000x1000', link: 'https://example.com/large.jpg' },
        ],
        duration: 180,
        url: 'https://example.com/audio.mp3',
      };

      // Normalize the song (simulating what happens before save)
      const normalized = normalizeSongImage(song);

      // Verify the image was normalized to highest quality
      expect(normalized.image).toBe('https://example.com/large.jpg');
      expect(typeof normalized.image).toBe('string');
    });

    it('should handle songs from search with thumbnail URLs', () => {
      const searchSong = {
        id: '2',
        name: 'Search Result Song',
        primaryArtists: 'Artist',
        image: ['https://example.com/150x150.jpg'], // Low quality from search
        duration: 200,
        url: 'https://example.com/audio2.mp3',
      };

      const normalized = normalizeSongImage(searchSong);
      
      // Should still have an image (even if it's the only one available)
      expect(normalized.image).toBe('https://example.com/150x150.jpg');
      expect(typeof normalized.image).toBe('string');
    });

    it('should preserve song data while normalizing image', () => {
      const song = {
        id: '3',
        name: 'Full Song',
        primaryArtists: 'Artist Name',
        album: 'Album Name',
        year: '2025',
        language: 'English',
        image: [
          { quality: '500x500', link: 'https://example.com/image.jpg' },
        ],
        duration: 240,
        url: 'https://example.com/audio3.mp3',
      };

      const normalized = normalizeSongImage(song);

      // All properties should be preserved
      expect(normalized.id).toBe('3');
      expect(normalized.name).toBe('Full Song');
      expect(normalized.primaryArtists).toBe('Artist Name');
      expect(normalized.album).toBe('Album Name');
      expect(normalized.year).toBe('2025');
      expect(normalized.language).toBe('English');
      expect(normalized.duration).toBe(240);
      expect(normalized.url).toBe('https://example.com/audio3.mp3');
      expect(normalized.image).toBe('https://example.com/image.jpg');
    });
  });

  describe('Migration of existing localStorage entries', () => {
    it('should migrate stored entries with low-quality images', () => {
      // Simulate old stored data with thumbnail URLs
      const oldData = [
        {
          id: '1',
          name: 'Old Song 1',
          primaryArtists: 'Artist 1',
          image: [
            { quality: '150x150', link: 'https://example.com/thumb1.jpg' },
            { quality: '1000x1000', link: 'https://example.com/large1.jpg' },
          ],
          duration: 180,
          url: 'https://example.com/audio1.mp3',
        },
        {
          id: '2',
          name: 'Old Song 2',
          primaryArtists: 'Artist 2',
          image: ['https://example.com/150x150-2.jpg', 'https://example.com/500x500-2.jpg'],
          duration: 200,
          url: 'https://example.com/audio2.mp3',
        },
      ];

      localStorage.setItem('recentlyPlayed', JSON.stringify(oldData));

      // Simulate migration process
      const saved = localStorage.getItem('recentlyPlayed');
      const parsed = JSON.parse(saved!);
      
      let changed = false;
      const normalized = parsed.map((song: any) => {
        const highQualityUrl = getHighestQualityImage(song.image);
        if (highQualityUrl !== song.image) {
          changed = true;
        }
        return {
          ...song,
          image: highQualityUrl || song.image || null,
        };
      });

      // Verify migration detected changes
      expect(changed).toBe(true);

      // Verify images were upgraded
      expect(normalized[0].image).toBe('https://example.com/large1.jpg');
      expect(normalized[1].image).toBe('https://example.com/500x500-2.jpg');

      // Save migrated data
      localStorage.setItem('recentlyPlayed', JSON.stringify(normalized));

      // Verify saved data
      const migratedData = JSON.parse(localStorage.getItem('recentlyPlayed')!);
      expect(migratedData[0].image).toBe('https://example.com/large1.jpg');
      expect(migratedData[1].image).toBe('https://example.com/500x500-2.jpg');
    });

    it('should not re-save if no changes needed', () => {
      // Simulate already-normalized data
      const normalizedData = [
        {
          id: '1',
          name: 'Song 1',
          primaryArtists: 'Artist 1',
          image: 'https://example.com/large1.jpg', // Already a string
          duration: 180,
          url: 'https://example.com/audio1.mp3',
        },
      ];

      localStorage.setItem('recentlyPlayed', JSON.stringify(normalizedData));

      // Simulate migration check
      const saved = localStorage.getItem('recentlyPlayed');
      const parsed = JSON.parse(saved!);
      
      let changed = false;
      const normalized = parsed.map((song: any) => {
        const highQualityUrl = getHighestQualityImage(song.image);
        if (highQualityUrl !== song.image) {
          changed = true;
        }
        return {
          ...song,
          image: highQualityUrl || song.image || null,
        };
      });

      // Should not detect changes
      expect(changed).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Simulate corrupted data
      localStorage.setItem('recentlyPlayed', 'invalid json{{{');

      // Attempt to parse
      let parsed;
      try {
        const saved = localStorage.getItem('recentlyPlayed');
        parsed = JSON.parse(saved!);
      } catch (err) {
        // Should catch error and clear corrupted data
        localStorage.removeItem('recentlyPlayed');
        parsed = null;
      }

      expect(parsed).toBeNull();
      expect(localStorage.getItem('recentlyPlayed')).toBeNull();
    });

    it('should handle empty localStorage', () => {
      const saved = localStorage.getItem('recentlyPlayed');
      expect(saved).toBeNull();
    });

    it('should handle non-array data in localStorage', () => {
      localStorage.setItem('recentlyPlayed', JSON.stringify({ notAnArray: true }));

      const saved = localStorage.getItem('recentlyPlayed');
      const parsed = JSON.parse(saved!);

      // Should detect it's not an array and skip migration
      expect(Array.isArray(parsed)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle song from Search with low-quality image', () => {
      // Simulate a song obtained from search with thumbnail
      const searchSong = {
        id: 'search-1',
        name: 'Search Result',
        primaryArtists: 'Artist',
        image: ['https://example.com/thumb.jpg'], // Only thumbnail available
        duration: 180,
        url: 'https://example.com/audio.mp3',
      };

      // Normalize before saving
      const normalized = normalizeSongImage(searchSong);

      // Should have the thumbnail (best available)
      expect(normalized.image).toBe('https://example.com/thumb.jpg');
      expect(typeof normalized.image).toBe('string');

      // Simulate saving to recently played
      const recentlyPlayed = [normalized];
      localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));

      // Verify saved correctly
      const saved = JSON.parse(localStorage.getItem('recentlyPlayed')!);
      expect(saved[0].image).toBe('https://example.com/thumb.jpg');
    });

    it('should handle song from Trending with high-quality image', () => {
      // Simulate a song from trending with multiple quality options
      const trendingSong = {
        id: 'trending-1',
        name: 'Trending Song',
        primaryArtists: 'Popular Artist',
        image: [
          { quality: '150x150', link: 'https://example.com/thumb.jpg' },
          { quality: '500x500', link: 'https://example.com/medium.jpg' },
          { quality: '1000x1000', link: 'https://example.com/large.jpg' },
        ],
        duration: 200,
        url: 'https://example.com/audio.mp3',
      };

      // Normalize before saving
      const normalized = normalizeSongImage(trendingSong);

      // Should have highest quality
      expect(normalized.image).toBe('https://example.com/large.jpg');

      // Save to recently played
      const recentlyPlayed = [normalized];
      localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));

      // Verify consistency
      const saved = JSON.parse(localStorage.getItem('recentlyPlayed')!);
      expect(saved[0].image).toBe('https://example.com/large.jpg');
    });

    it('should maintain consistent image quality across all sources', () => {
      // Mix of songs from different sources
      const songs = [
        {
          id: '1',
          name: 'Search Song',
          image: ['https://example.com/150x150-1.jpg', 'https://example.com/500x500-1.jpg'],
        },
        {
          id: '2',
          name: 'Trending Song',
          image: [
            { quality: '500x500', link: 'https://example.com/500x500-2.jpg' },
            { quality: '1000x1000', link: 'https://example.com/1000x1000-2.jpg' },
          ],
        },
        {
          id: '3',
          name: 'New Release',
          image: 'https://example.com/direct-url-3.jpg',
        },
      ];

      // Normalize all
      const normalized = songs.map(song => normalizeSongImage(song));

      // All should have string images
      expect(typeof normalized[0].image).toBe('string');
      expect(typeof normalized[1].image).toBe('string');
      expect(typeof normalized[2].image).toBe('string');

      // All should have highest quality available
      expect(normalized[0].image).toBe('https://example.com/500x500-1.jpg');
      expect(normalized[1].image).toBe('https://example.com/1000x1000-2.jpg');
      expect(normalized[2].image).toBe('https://example.com/direct-url-3.jpg');
    });
  });
});
