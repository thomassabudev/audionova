/**
 * Unit tests for isNewSong utility
 */

import { isNewSong } from './isNewSong';

describe('isNewSong', () => {
  const now = new Date('2025-01-15').getTime(); // Fixed date for testing
  const targetYear = 2025;

  test('returns false for null or undefined song', () => {
    expect(isNewSong(null)).toBe(false);
    expect(isNewSong(undefined)).toBe(false);
  });

  test('returns true for song released today', () => {
    const song = {
      releaseDate: new Date(now).toISOString(),
      year: 2025
    };
    expect(isNewSong(song, { now, targetYear })).toBe(true);
  });

  test('returns true for song released 5 days ago', () => {
    const fiveDaysAgo = now - (5 * 24 * 60 * 60 * 1000);
    const song = {
      releaseDate: new Date(fiveDaysAgo).toISOString(),
      year: 2025
    };
    expect(isNewSong(song, { now, targetYear, recentDays: 14 })).toBe(true);
  });

  test('returns false for song released 25 days ago', () => {
    const twentyFiveDaysAgo = now - (25 * 24 * 60 * 60 * 1000);
    const song = {
      releaseDate: new Date(twentyFiveDaysAgo).toISOString(),
      year: 2024
    };
    expect(isNewSong(song, { now, targetYear, recentDays: 14 })).toBe(false);
  });

  test('returns true for song with releaseDate year = 2025', () => {
    const song = {
      releaseDate: '2025-03-15T00:00:00.000Z',
      year: 2025
    };
    expect(isNewSong(song, { now, targetYear })).toBe(true);
  });

  test('returns true for song with year = 2025 (no date)', () => {
    const song = {
      releaseDate: null,
      year: 2025
    };
    expect(isNewSong(song, { now, targetYear })).toBe(true);
  });

  test('returns true for song with year = "2025" as string', () => {
    const song = {
      releaseDate: null,
      year: '2025'
    };
    expect(isNewSong(song, { now, targetYear })).toBe(true);
  });

  test('returns false for invalid date', () => {
    const song = {
      releaseDate: 'invalid-date',
      year: 2024
    };
    expect(isNewSong(song, { now, targetYear })).toBe(false);
  });

  test('returns false for song with old year and no releaseDate', () => {
    const song = {
      releaseDate: null,
      year: 2020
    };
    expect(isNewSong(song, { now, targetYear })).toBe(false);
  });

  test('returns false for song with no date and no year', () => {
    const song = {
      releaseDate: null,
      year: null
    };
    expect(isNewSong(song, { now, targetYear })).toBe(false);
  });

  test('uses custom recentDays parameter', () => {
    const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);
    const song = {
      releaseDate: new Date(tenDaysAgo).toISOString(),
      year: 2024
    };
    
    // Should be true with 14 days
    expect(isNewSong(song, { now, targetYear, recentDays: 14 })).toBe(true);
    
    // Should be false with 7 days
    expect(isNewSong(song, { now, targetYear, recentDays: 7 })).toBe(false);
  });

  test('uses custom targetYear parameter', () => {
    const song = {
      releaseDate: '2024-12-15T00:00:00.000Z',
      year: 2024
    };
    
    // Should be false with targetYear 2025
    expect(isNewSong(song, { now, targetYear: 2025 })).toBe(false);
    
    // Should be true with targetYear 2024
    expect(isNewSong(song, { now, targetYear: 2024 })).toBe(true);
  });
});
