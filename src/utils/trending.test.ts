/**
 * Unit tests for trending utilities
 */

import {
  computeTrendScore,
  determineBadges,
  mergeAndDedupe,
  calculateDeltas,
  getLangCode,
  formatDelta,
  DEFAULT_TRENDING_CONFIG,
  type SongHistory,
  type TrendingSong,
} from './trending';
import type { Song } from '@/services/jiosaavnApi';

// Shared mock song for all tests
const mockSong: Song = {
  id: '1',
  name: 'Test Song',
  primaryArtists: 'Test Artist',
  playCount: 1000,
  releaseDate: '2025-01-01',
  year: '2025',
} as Song;

describe('computeTrendScore', () => {

  test('computes score with playCount', () => {
    const { score, velocity } = computeTrendScore(mockSong, []);
    expect(score).toBeGreaterThan(0);
    expect(velocity).toBe(0.3); // Default velocity for new entries
  });

  test('computes velocity from history', () => {
    const history: SongHistory[] = [
      { songId: '1', playCount: 800, timestamp: Date.now() - 3600000 },
      { songId: '1', playCount: 1000, timestamp: Date.now() },
    ];
    
    const { velocity } = computeTrendScore(mockSong, history);
    expect(velocity).toBeCloseTo(0.25); // (1000-800)/800 = 0.25
  });

  test('caps extreme velocity', () => {
    const history: SongHistory[] = [
      { songId: '1', playCount: 10, timestamp: Date.now() - 3600000 },
      { songId: '1', playCount: 10000, timestamp: Date.now() },
    ];
    
    const { velocity } = computeTrendScore(mockSong, history);
    expect(velocity).toBeLessThanOrEqual(5); // Capped at 5
  });

  test('handles zero playCount', () => {
    const songWithZero = { ...mockSong, playCount: 0 };
    const { score } = computeTrendScore(songWithZero, []);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('applies recency boost for 2025 songs', () => {
    const song2025 = { ...mockSong, releaseDate: '2025-01-15', year: '2025' };
    const song2024 = { ...mockSong, releaseDate: '2024-01-15', year: '2024' };
    
    const score2025 = computeTrendScore(song2025, []);
    const score2024 = computeTrendScore(song2024, []);
    
    expect(score2025.score).toBeGreaterThan(score2024.score);
  });

  test('uses custom config weights', () => {
    const customConfig = {
      ...DEFAULT_TRENDING_CONFIG,
      weights: { w1: 10, w2: 1, w3: 1, w4: 1, w5: 1 },
    };
    
    const { score } = computeTrendScore(mockSong, [], customConfig);
    expect(score).toBeGreaterThan(0);
  });
});

describe('determineBadges', () => {
  test('assigns HOT badge for high score', () => {
    const badges = determineBadges(mockSong, 20, 0.3);
    expect(badges).toContain('HOT');
  });

  test('assigns RISING badge for high velocity', () => {
    const badges = determineBadges(mockSong, 10, 0.8);
    expect(badges).toContain('RISING');
  });

  test('assigns NEW badge for recent release', () => {
    const recentSong = {
      ...mockSong,
      releaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const badges = determineBadges(recentSong, 10, 0.3);
    expect(badges).toContain('NEW');
  });

  test('assigns NEW badge for 2025 year', () => {
    const song2025 = { ...mockSong, releaseDate: '', year: '2025' };
    const badges = determineBadges(song2025, 10, 0.3);
    expect(badges).toContain('NEW');
  });

  test('assigns multiple badges', () => {
    const badges = determineBadges(mockSong, 20, 0.8);
    expect(badges.length).toBeGreaterThan(1);
  });

  test('assigns no badges for low scores', () => {
    const oldSong = { ...mockSong, releaseDate: '2020-01-01', year: '2020' };
    const badges = determineBadges(oldSong, 5, 0.1);
    expect(badges.length).toBe(0);
  });
});

describe('mergeAndDedupe', () => {
  test('removes duplicate songs by id', () => {
    const songs: Song[] = [
      { id: '1', name: 'Song 1', playCount: 100 } as Song,
      { id: '2', name: 'Song 2', playCount: 200 } as Song,
      { id: '1', name: 'Song 1 Duplicate', playCount: 150 } as Song,
    ];
    
    const result = mergeAndDedupe(songs);
    expect(result.length).toBe(2);
    expect(result.find(s => s.id === '1')?.playCount).toBe(150); // Prefers higher playCount
  });

  test('prefers song with higher playCount', () => {
    const songs: Song[] = [
      { id: '1', name: 'Song 1', playCount: 100 } as Song,
      { id: '1', name: 'Song 1', playCount: 200 } as Song,
    ];
    
    const result = mergeAndDedupe(songs);
    expect(result[0].playCount).toBe(200);
  });

  test('prefers more recent releaseDate when playCount equal', () => {
    const songs: Song[] = [
      { id: '1', name: 'Song 1', playCount: 100, releaseDate: '2024-01-01' } as Song,
      { id: '1', name: 'Song 1', playCount: 100, releaseDate: '2025-01-01' } as Song,
    ];
    
    const result = mergeAndDedupe(songs);
    expect(result[0].releaseDate).toBe('2025-01-01');
  });

  test('handles empty array', () => {
    const result = mergeAndDedupe([]);
    expect(result.length).toBe(0);
  });
});

describe('calculateDeltas', () => {
  const createMockSong = (id: string, rank: number): TrendingSong => ({
    ...mockSong,
    id,
    name: `Song ${id}`,
    rank,
    delta: 0,
    score: 0,
    velocity: 0,
    badges: [],
    lastUpdated: Date.now(),
  });

  test('calculates positive delta for improved rank', () => {
    const current = [createMockSong('1', 1), createMockSong('2', 2)];
    const previous = [createMockSong('2', 1), createMockSong('1', 2)];
    
    const result = calculateDeltas(current, previous);
    expect(result[0].delta).toBe(1); // Moved from 2 to 1
    expect(result[1].delta).toBe(-1); // Moved from 1 to 2
  });

  test('calculates zero delta for unchanged rank', () => {
    const current = [createMockSong('1', 1), createMockSong('2', 2)];
    const previous = [createMockSong('1', 1), createMockSong('2', 2)];
    
    const result = calculateDeltas(current, previous);
    expect(result[0].delta).toBe(0);
    expect(result[1].delta).toBe(0);
  });

  test('handles new songs with no previous rank', () => {
    const current = [createMockSong('1', 1), createMockSong('2', 2)];
    const previous = [createMockSong('1', 1)];
    
    const result = calculateDeltas(current, previous);
    expect(result[1].delta).toBe(0); // New song, no delta
  });

  test('handles empty previous list', () => {
    const current = [createMockSong('1', 1), createMockSong('2', 2)];
    const previous: TrendingSong[] = [];
    
    const result = calculateDeltas(current, previous);
    expect(result[0].delta).toBe(0);
    expect(result[1].delta).toBe(0);
  });
});

describe('getLangCode', () => {
  test('returns correct code for Malayalam', () => {
    expect(getLangCode('Malayalam')).toBe('ML');
    expect(getLangCode('malayalam')).toBe('ML');
  });

  test('returns correct code for Tamil', () => {
    expect(getLangCode('Tamil')).toBe('TA');
  });

  test('returns correct code for Hindi', () => {
    expect(getLangCode('Hindi')).toBe('HI');
  });

  test('returns correct code for English', () => {
    expect(getLangCode('English')).toBe('EN');
  });

  test('returns UN for unknown language', () => {
    expect(getLangCode('Unknown')).toBe('UN');
    expect(getLangCode(undefined)).toBe('UN');
  });
});

describe('formatDelta', () => {
  test('formats positive delta', () => {
    const result = formatDelta(5);
    expect(result.text).toBe('+5');
    expect(result.color).toBe('text-green-600');
    expect(result.icon).toBe('▲');
  });

  test('formats negative delta', () => {
    const result = formatDelta(-3);
    expect(result.text).toBe('-3');
    expect(result.color).toBe('text-red-600');
    expect(result.icon).toBe('▼');
  });

  test('formats zero delta', () => {
    const result = formatDelta(0);
    expect(result.text).toBe('—');
    expect(result.color).toBe('text-gray-400');
    expect(result.icon).toBe('—');
  });
});
