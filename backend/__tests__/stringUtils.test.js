/**
 * Unit tests for string normalization and similarity utilities
 */

const { normalize, similarity, isMatch } = require('../utils/stringUtils');

describe('normalize', () => {
  test('removes text inside parentheses', () => {
    expect(normalize('Song Title (Remix)')).toBe('song title');
    expect(normalize('Artist (feat. Someone)')).toBe('artist');
  });
  
  test('removes text inside brackets', () => {
    expect(normalize('Song [Official Video]')).toBe('song');
    expect(normalize('Title [HD]')).toBe('title');
  });
  
  test('removes diacritics', () => {
    expect(normalize('Café')).toBe('cafe');
    expect(normalize('naïve')).toBe('naive');
    expect(normalize('Señor')).toBe('senor');
  });
  
  test('removes punctuation', () => {
    expect(normalize('Song, Title!')).toBe('song title');
    expect(normalize("Don't Stop")).toBe('dont stop');
    expect(normalize('A.R. Rahman')).toBe('ar rahman');
  });
  
  test('collapses multiple whitespace', () => {
    expect(normalize('Song   Title')).toBe('song title');
    expect(normalize('  Trimmed  ')).toBe('trimmed');
  });
  
  test('converts to lowercase', () => {
    expect(normalize('UPPERCASE')).toBe('uppercase');
    expect(normalize('MixedCase')).toBe('mixedcase');
  });
  
  test('handles abbreviations', () => {
    expect(normalize('ft. Artist')).toBe('ft artist');
    expect(normalize('feat. Artist')).toBe('feat artist');
  });
  
  test('handles empty and null', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
  
  test('complex real-world examples', () => {
    expect(normalize('Peelings (From "Aavesham")')).toBe('peelings');
    expect(normalize('Illuminati [Official Video]')).toBe('illuminati');
    expect(normalize('Naatu Naatu - RRR')).toBe('naatu naatu rrr');
  });
});

describe('similarity', () => {
  test('identical strings return 1', () => {
    expect(similarity('hello', 'hello')).toBe(1);
    expect(similarity('Test Song', 'Test Song')).toBe(1);
  });
  
  test('completely different strings return low score', () => {
    expect(similarity('hello', 'world')).toBeLessThan(0.5);
    expect(similarity('abc', 'xyz')).toBeLessThan(0.5);
  });
  
  test('similar strings return high score', () => {
    expect(similarity('hello', 'helo')).toBeGreaterThan(0.8);
    expect(similarity('test', 'tests')).toBeGreaterThan(0.8);
  });
  
  test('case insensitive', () => {
    expect(similarity('Hello', 'hello')).toBe(1);
    expect(similarity('TEST', 'test')).toBe(1);
  });
  
  test('ignores punctuation', () => {
    expect(similarity("Don't", 'Dont')).toBe(1);
    expect(similarity('A.R. Rahman', 'AR Rahman')).toBe(1);
  });
  
  test('handles parentheses', () => {
    expect(similarity('Song (Remix)', 'Song')).toBe(1);
    expect(similarity('Title (feat. Artist)', 'Title')).toBe(1);
  });
  
  test('real-world artist names', () => {
    expect(similarity('A.R. Rahman', 'AR Rahman')).toBe(1);
    expect(similarity('Anirudh Ravichander', 'Anirudh')).toBeGreaterThan(0.6);
  });
  
  test('handles empty strings', () => {
    expect(similarity('', '')).toBe(0);
    expect(similarity('hello', '')).toBe(0);
    expect(similarity('', 'world')).toBe(0);
  });
  
  test('transposition detection', () => {
    // Damerau-Levenshtein should handle transpositions better
    const score = similarity('hello', 'hlelo');
    expect(score).toBeGreaterThan(0.7);
  });
});

describe('isMatch', () => {
  test('matches when all thresholds met', () => {
    const detail = {
      title: 'Peelings',
      artist: 'Navod',
      language: 'Malayalam',
    };
    
    const query = {
      title: 'Peelings',
      artist: 'Navod',
      language: 'Malayalam',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(true);
    expect(result.scores.title).toBe(1);
    expect(result.scores.artist).toBe(1);
  });
  
  test('rejects when title similarity too low', () => {
    const detail = {
      title: 'Completely Different Song',
      artist: 'Navod',
    };
    
    const query = {
      title: 'Peelings',
      artist: 'Navod',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(false);
    expect(result.reason).toBe('title_mismatch');
  });
  
  test('rejects when artist similarity too low', () => {
    const detail = {
      title: 'Peelings',
      artist: 'Different Artist',
    };
    
    const query = {
      title: 'Peelings',
      artist: 'Navod',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(false);
    expect(result.reason).toBe('artist_mismatch');
  });
  
  test('rejects when language mismatch', () => {
    const detail = {
      title: 'Peelings',
      artist: 'Navod',
      language: 'Tamil',
    };
    
    const query = {
      title: 'Peelings',
      artist: 'Navod',
      language: 'Malayalam',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(false);
    expect(result.reason).toBe('language_mismatch');
  });
  
  test('ignores language when not provided in query', () => {
    const detail = {
      title: 'Peelings',
      artist: 'Navod',
      language: 'Tamil',
    };
    
    const query = {
      title: 'Peelings',
      artist: 'Navod',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(true);
  });
  
  test('handles variations in title', () => {
    const detail = {
      title: 'Peelings (From "Aavesham")',
      artist: 'Navod',
    };
    
    const query = {
      title: 'Peelings',
      artist: 'Navod',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(true);
  });
  
  test('handles artist name variations', () => {
    const detail = {
      title: 'Song Title',
      artist: 'A.R. Rahman',
    };
    
    const query = {
      title: 'Song Title',
      artist: 'AR Rahman',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(true);
  });
  
  test('custom thresholds', () => {
    const detail = {
      title: 'Similar Title',
      artist: 'Artist Name',
    };
    
    const query = {
      title: 'Simlar Title', // typo
      artist: 'Artist Name',
    };
    
    // Default thresholds (0.72) - should pass
    const result1 = isMatch(detail, query);
    expect(result1.match).toBe(true);
    
    // Stricter threshold (0.95) - should fail
    const result2 = isMatch(detail, query, { titleThreshold: 0.95 });
    expect(result2.match).toBe(false);
  });
  
  test('album similarity increases confidence', () => {
    const detail = {
      title: 'Song',
      artist: 'Artist',
      album: 'Album Name',
    };
    
    const query = {
      title: 'Song',
      artist: 'Artist',
      album: 'Album Name',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(true);
    expect(result.scores.album).toBe(1);
  });
  
  test('handles missing album gracefully', () => {
    const detail = {
      title: 'Song',
      artist: 'Artist',
    };
    
    const query = {
      title: 'Song',
      artist: 'Artist',
      album: 'Some Album',
    };
    
    const result = isMatch(detail, query);
    expect(result.match).toBe(true);
    expect(result.scores.album).toBeNull();
  });
});
