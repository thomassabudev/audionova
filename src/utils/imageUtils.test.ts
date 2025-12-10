/**
 * Image Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getHighestQualityImage,
  normalizeSongImage,
  normalizeSongsImages,
  getPlaceholderImage,
  getImageUrlWithFallback,
} from './imageUtils';

describe('imageUtils', () => {
  describe('getHighestQualityImage', () => {
    it('should return null for null or undefined input', () => {
      expect(getHighestQualityImage(null)).toBeNull();
      expect(getHighestQualityImage(undefined)).toBeNull();
    });

    it('should return the same string for single string URL', () => {
      const url = 'https://example.com/image.jpg';
      expect(getHighestQualityImage(url)).toBe(url);
    });

    it('should return null for empty string', () => {
      expect(getHighestQualityImage('')).toBeNull();
      expect(getHighestQualityImage('   ')).toBeNull();
    });

    it('should select highest resolution from string array', () => {
      const urls = [
        'https://example.com/150x150.jpg',
        'https://example.com/500x500.jpg',
        'https://example.com/1000x1000.jpg',
      ];
      expect(getHighestQualityImage(urls)).toBe('https://example.com/1000x1000.jpg');
    });

    it('should select longest URL when no resolution pattern found', () => {
      const urls = [
        'https://example.com/a.jpg',
        'https://example.com/very-long-url-name.jpg',
        'https://example.com/b.jpg',
      ];
      expect(getHighestQualityImage(urls)).toBe('https://example.com/very-long-url-name.jpg');
    });

    it('should handle array of objects with quality and link', () => {
      const images = [
        { quality: '150x150', link: 'https://example.com/small.jpg' },
        { quality: '500x500', link: 'https://example.com/medium.jpg' },
        { quality: '1000x1000', link: 'https://example.com/large.jpg' },
      ];
      expect(getHighestQualityImage(images)).toBe('https://example.com/large.jpg');
    });

    it('should handle objects without quality property', () => {
      const images = [
        { link: 'https://example.com/image1.jpg' },
        { link: 'https://example.com/image2.jpg' },
      ];
      expect(getHighestQualityImage(images)).toBe('https://example.com/image1.jpg');
    });

    it('should select from object with quality keys', () => {
      const imageObj = {
        thumbnail: 'https://example.com/thumb.jpg',
        small: 'https://example.com/small.jpg',
        medium: 'https://example.com/medium.jpg',
        large: 'https://example.com/large.jpg',
        original: 'https://example.com/original.jpg',
      };
      expect(getHighestQualityImage(imageObj)).toBe('https://example.com/original.jpg');
    });

    it('should fallback to first string property in object', () => {
      const imageObj = {
        someKey: 'https://example.com/image.jpg',
        anotherKey: 123,
      };
      expect(getHighestQualityImage(imageObj)).toBe('https://example.com/image.jpg');
    });

    it('should return null for empty array', () => {
      expect(getHighestQualityImage([])).toBeNull();
    });

    it('should handle mixed quality formats', () => {
      const images = [
        { quality: '50x50', link: 'https://example.com/tiny.jpg' },
        { quality: '500x500', link: 'https://example.com/medium.jpg' },
        { quality: '2000x2000', link: 'https://example.com/huge.jpg' },
      ];
      expect(getHighestQualityImage(images)).toBe('https://example.com/huge.jpg');
    });
  });

  describe('normalizeSongImage', () => {
    it('should normalize song with array of image objects', () => {
      const song = {
        id: '1',
        name: 'Test Song',
        image: [
          { quality: '150x150', link: 'https://example.com/small.jpg' },
          { quality: '500x500', link: 'https://example.com/large.jpg' },
        ],
      };

      const normalized = normalizeSongImage(song);
      expect(normalized.image).toBe('https://example.com/large.jpg');
    });

    it('should normalize song with string array', () => {
      const song = {
        id: '1',
        name: 'Test Song',
        image: [
          'https://example.com/150x150.jpg',
          'https://example.com/500x500.jpg',
        ],
      };

      const normalized = normalizeSongImage(song);
      expect(normalized.image).toBe('https://example.com/500x500.jpg');
    });

    it('should handle song with no image', () => {
      const song = {
        id: '1',
        name: 'Test Song',
        image: null,
      };

      const normalized = normalizeSongImage(song);
      expect(normalized.image).toBeNull();
    });

    it('should preserve other song properties', () => {
      const song = {
        id: '1',
        name: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        image: 'https://example.com/image.jpg',
      };

      const normalized = normalizeSongImage(song);
      expect(normalized.id).toBe('1');
      expect(normalized.name).toBe('Test Song');
      expect(normalized.artist).toBe('Test Artist');
      expect(normalized.duration).toBe(180);
      expect(normalized.image).toBe('https://example.com/image.jpg');
    });
  });

  describe('normalizeSongsImages', () => {
    it('should normalize array of songs', () => {
      const songs = [
        {
          id: '1',
          name: 'Song 1',
          image: [
            { quality: '150x150', link: 'https://example.com/1-small.jpg' },
            { quality: '500x500', link: 'https://example.com/1-large.jpg' },
          ],
        },
        {
          id: '2',
          name: 'Song 2',
          image: 'https://example.com/2.jpg',
        },
      ];

      const normalized = normalizeSongsImages(songs);
      expect(normalized[0].image).toBe('https://example.com/1-large.jpg');
      expect(normalized[1].image).toBe('https://example.com/2.jpg');
    });

    it('should handle empty array', () => {
      const normalized = normalizeSongsImages([]);
      expect(normalized).toEqual([]);
    });
  });

  describe('getPlaceholderImage', () => {
    it('should return SVG data URL', () => {
      const placeholder = getPlaceholderImage();
      expect(placeholder).toContain('data:image/svg+xml');
      expect(placeholder).toContain('No Image');
    });

    it('should include custom text', () => {
      const placeholder = getPlaceholderImage('Custom Text');
      expect(placeholder).toContain('Custom%20Text');
    });
  });

  describe('getImageUrlWithFallback', () => {
    it('should return image URL when available', () => {
      const url = 'https://example.com/image.jpg';
      expect(getImageUrlWithFallback(url)).toBe(url);
    });

    it('should return placeholder when image is null', () => {
      const result = getImageUrlWithFallback(null);
      expect(result).toContain('data:image/svg+xml');
      expect(result).toContain('No Image');
    });

    it('should use custom fallback text', () => {
      const result = getImageUrlWithFallback(null, 'Error Loading');
      expect(result).toContain('Error%20Loading');
    });

    it('should select highest quality and fallback if none', () => {
      const images = [
        { quality: '150x150', link: 'https://example.com/small.jpg' },
        { quality: '500x500', link: 'https://example.com/large.jpg' },
      ];
      expect(getImageUrlWithFallback(images)).toBe('https://example.com/large.jpg');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed image objects', () => {
      const malformed = { notAValidKey: 123 };
      expect(getHighestQualityImage(malformed)).toBeNull();
    });

    it('should handle array with null/undefined elements', () => {
      const images = [null, undefined, 'https://example.com/valid.jpg'];
      // Should not crash and should handle gracefully
      const result = getHighestQualityImage(images as any);
      expect(result).toBeTruthy();
    });

    it('should handle very large resolution numbers', () => {
      const images = [
        { quality: '5000x5000', link: 'https://example.com/huge.jpg' },
        { quality: '500x500', link: 'https://example.com/small.jpg' },
      ];
      expect(getHighestQualityImage(images)).toBe('https://example.com/huge.jpg');
    });
  });
});
