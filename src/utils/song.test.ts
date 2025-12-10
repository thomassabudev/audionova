/**
 * Song Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getLangCode,
  getBestImage,
  normalizeSongImage,
  isNewSong,
  balanceByLanguage,
  dedupeById,
} from './song';

describe('getLangCode', () => {
  it('should return ML for Malayalam', () => {
    expect(getLangCode('Malayalam')).toBe('ML');
    expect(getLangCode('malayalam')).toBe('ML');
    expect(getLangCode('ml')).toBe('ML');
  });

  it('should return TA for Tamil', () => {
    expect(getLangCode('Tamil')).toBe('TA');
    expect(getLangCode('tamil')).toBe('TA');
    expect(getLangCode('ta')).toBe('TA');
  });

  it('should return HI for Hindi', () => {
    expect(getLangCode('Hindi')).toBe('HI');
    expect(getLangCode('hindi')).toBe('HI');
    expect(getLangCode('hi')).toBe('HI');
  });

  it('should return EN for English', () => {
    expect(getLangCode('English')).toBe('EN');
    expect(getLangCode('english')).toBe('EN');
    expect(getLangCode('en')).toBe('EN');
  });

  it('should return null for empty/null', () => {
    expect(getLangCode(null)).toBeNull();
    expect(getLangCode(undefined)).toBeNull();
    expect(getLangCode('')).toBeNull();
  });
});

describe('getBestImage', () => {
  it('should return string URL as-is', () => {
    const url = 'https://example.com/image.jpg';
    expect(getBestImage(url)).toBe(url);
  });

  it('should return null for empty input', () => {
    expect(getBestImage(null)).toBeNull();
    expect(getBestImage(undefined)).toBeNull();
    expect(getBestImage('')).toBeNull();
  });

  it('should pick highest quality from object array', () => {
    const images = [
      { quality: '150x150', link: 'https://example.com/small.jpg' },
      { quality: '500x500', link: 'https://example.com/medium.jpg' },
      { quality: '1000x1000', link: 'https://example.com/large.jpg' },
    ];
    expect(getBestImage(images)).toBe('https://example.com/large.jpg');
  });

  it('should pick longest URL from string array', () => {
    const urls = [
      'https://example.com/a.jpg',
      'https://example.com/very-long-url.jpg',
      'https://example.com/b.jpg',
    ];
    expect(getBestImage(urls)).toBe('https://example.com/very-long-url.jpg');
  });

  it('should pick from object with priority keys', () => {
    const obj = {
      thumbnail: 'https://example.com/thumb.jpg',
      medium: 'https://example.com/medium.jpg',
      original: 'https://example.com/original.jpg',
    };
    expect(getBestImage(obj)).toBe('https://example.com/original.jpg');
  });
});

describe('normalizeSongImage', () => {
  it('should extract image from song.image', () => {
    const song = {
      id: '1',
      name: 'Test',
      image: 'https://example.com/image.jpg',
    };
    expect(normalizeSongImage(song)).toBe('https://example.com/image.jpg');
  });

  it('should handle array of images', () => {
    const song = {
      id: '1',
      name: 'Test',
      image: [
        { quality: '500x500', link: 'https://example.com/large.jpg' },
        { quality: '150x150', link: 'https://example.com/small.jpg' },
      ],
    };
    expect(normalizeSongImage(song)).toBe('https://example.com/large.jpg');
  });

  it('should return null if no image found', () => {
    const song = { id: '1', name: 'Test' };
    expect(normalizeSongImage(song)).toBeNull();
  });
});

describe('isNewSong', () => {
  it('should return true for 2025 songs', () => {
    const song = { id: '1', name: 'Test', year: 2025 };
    expect(isNewSong(song)).toBe(true);
  });

  it('should return false for old songs', () => {
    const song = { id: '1', name: 'Test', year: 2020 };
    expect(isNewSong(song)).toBe(false);
  });

  it('should return true for recent release dates', () => {
    const now = Date.now();
    const recent = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
    const song = { id: '1', name: 'Test', releaseDate: recent };
    expect(isNewSong(song, { now })).toBe(true);
  });
});

describe('balanceByLanguage', () => {
  it('should balance 3 languages evenly for 25 slots', () => {
    const songs = [
      ...Array(15).fill(null).map((_, i) => ({ id: `ml${i}`, name: `ML${i}`, language: 'Malayalam' })),
      ...Array(15).fill(null).map((_, i) => ({ id: `ta${i}`, name: `TA${i}`, language: 'Tamil' })),
      ...Array(15).fill(null).map((_, i) => ({ id: `hi${i}`, name: `HI${i}`, language: 'Hindi' })),
    ];

    const balanced = balanceByLanguage(songs, ['ML', 'TA', 'HI'], 25);
    
    expect(balanced.length).toBeLessThanOrEqual(25);
    
    const mlCount = balanced.filter(s => getLangCode(s.language) === 'ML').length;
    const taCount = balanced.filter(s => getLangCode(s.language) === 'TA').length;
    const hiCount = balanced.filter(s => getLangCode(s.language) === 'HI').length;
    
    // Should be roughly 8/8/9 or similar
    expect(mlCount).toBeGreaterThanOrEqual(7);
    expect(mlCount).toBeLessThanOrEqual(9);
    expect(taCount).toBeGreaterThanOrEqual(7);
    expect(taCount).toBeLessThanOrEqual(9);
    expect(hiCount).toBeGreaterThanOrEqual(7);
    expect(hiCount).toBeLessThanOrEqual(9);
  });

  it('should handle insufficient songs in one language', () => {
    const songs = [
      ...Array(5).fill(null).map((_, i) => ({ id: `ml${i}`, name: `ML${i}`, language: 'Malayalam' })),
      ...Array(20).fill(null).map((_, i) => ({ id: `ta${i}`, name: `TA${i}`, language: 'Tamil' })),
      ...Array(0).fill(null).map((_, i) => ({ id: `hi${i}`, name: `HI${i}`, language: 'Hindi' })),
    ];

    const balanced = balanceByLanguage(songs, ['ML', 'TA', 'HI'], 25);
    
    expect(balanced.length).toBeLessThanOrEqual(25);
    expect(balanced.length).toBeGreaterThan(0);
  });

  it('should remove duplicates by ID', () => {
    const songs = [
      { id: '1', name: 'Song1', language: 'Malayalam' },
      { id: '1', name: 'Song1 Duplicate', language: 'Tamil' },
      { id: '2', name: 'Song2', language: 'Hindi' },
    ];

    const balanced = balanceByLanguage(songs, ['ML', 'TA', 'HI'], 25);
    
    expect(balanced.length).toBe(2);
    expect(balanced.find(s => s.id === '1')).toBeDefined();
    expect(balanced.find(s => s.id === '2')).toBeDefined();
  });
});

describe('dedupeById', () => {
  it('should remove duplicate IDs', () => {
    const songs = [
      { id: '1', name: 'Song1' },
      { id: '2', name: 'Song2' },
      { id: '1', name: 'Song1 Duplicate' },
      { id: '3', name: 'Song3' },
    ];

    const deduped = dedupeById(songs);
    
    expect(deduped.length).toBe(3);
    expect(deduped.map(s => s.id)).toEqual(['1', '2', '3']);
  });

  it('should handle empty array', () => {
    expect(dedupeById([])).toEqual([]);
  });
});
