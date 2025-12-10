/**
 * String normalization and similarity utilities for cover art verification
 */

/**
 * Normalize a string for comparison
 * - Remove text inside parentheses/brackets
 * - Remove diacritics
 * - Collapse multiple whitespace
 * - Lowercase
 * - Remove punctuation
 */
function normalize(str) {
  if (!str) return '';
  
  let normalized = str;
  
  // Remove text inside parentheses and brackets
  normalized = normalized.replace(/\([^)]*\)/g, '');
  normalized = normalized.replace(/\[[^\]]*\]/g, '');
  
  // Remove diacritics (accents)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Lowercase
  normalized = normalized.toLowerCase();
  
  // Remove punctuation except spaces
  normalized = normalized.replace(/[^\w\s]/g, '');
  
  // Collapse multiple whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Calculate Damerau-Levenshtein distance between two strings
 */
function damerauLevenshteinDistance(a, b) {
  const len1 = a.length;
  const len2 = b.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
      
      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Damerau-Levenshtein distance normalized by max length
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;
  
  const distance = damerauLevenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  
  return 1 - (distance / maxLength);
}

/**
 * Check if metadata matches query with configurable thresholds
 */
function isMatch(detail, query, thresholds = {}) {
  const {
    titleThreshold = 0.72,
    artistThreshold = 0.65,
    albumThreshold = 0.6,
  } = thresholds;
  
  // Title similarity check
  const titleSim = similarity(detail.title || detail.name, query.title);
  if (titleSim < titleThreshold) {
    return { match: false, reason: 'title_mismatch', scores: { title: titleSim } };
  }
  
  // Artist similarity check (primary artist only)
  const detailArtist = detail.artist || detail.primaryArtists || detail.artists;
  const artistSim = similarity(detailArtist, query.artist);
  if (artistSim < artistThreshold) {
    return { match: false, reason: 'artist_mismatch', scores: { title: titleSim, artist: artistSim } };
  }
  
  // Language match (if provided in query)
  if (query.language) {
    const detailLang = (detail.language || '').toLowerCase();
    const queryLang = query.language.toLowerCase();
    
    if (detailLang && detailLang !== queryLang) {
      return { match: false, reason: 'language_mismatch', scores: { title: titleSim, artist: artistSim } };
    }
  }
  
  // Optional album similarity (increases confidence)
  let albumSim = null;
  if (query.album && detail.album) {
    albumSim = similarity(detail.album, query.album);
  }
  
  const scores = {
    title: titleSim,
    artist: artistSim,
    album: albumSim,
  };
  
  return { match: true, scores };
}

module.exports = {
  normalize,
  similarity,
  isMatch,
  damerauLevenshteinDistance,
};
