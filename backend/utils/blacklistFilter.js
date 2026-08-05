/**
 * blacklistFilter.js
 *
 * Central blacklist for JioSaavn search result filtering.
 *
 * When a JioSaavn result title contains a blacklisted term/phrase, it is
 * rejected as a karaoke, cover, instrumental, or other non-studio recording.
 *
 * MATCHING RULES:
 *   1. EXACT_WORD_TERMS — matched with \bterm\b (whole word, case-insensitive)
 *      Used for: words that NEVER appear meaningfully in a real song title.
 *
 *   2. EXACT_PHRASES — matched with \bphrase\b (exact phrase, word-bounded)
 *      Used for: ambiguous words (live, cover, acoustic) that are only
 *      problematic when part of a recognized descriptive phrase.
 *      "Live Forever"  → NOT blacklisted   "live version"  → IS blacklisted
 *      "Cover Me"      → NOT blacklisted   "cover by"      → IS blacklisted
 *      "Discover"      → NOT blacklisted   "acoustic cover" → IS blacklisted
 *
 * Adding new terms: edit ONLY this file. No other file needs to change.
 */

// ─── Exact word terms ─────────────────────────────────────────────────────────

const EXACT_WORD_TERMS = new Set([
  'karaoke',
  'nightcore',
  'instrumental',
  'lofi',
  'tribute',
  'nightstep',
]);

// ─── Exact phrases ────────────────────────────────────────────────────────────

const EXACT_PHRASES = [
  // Audio effects
  'bass boosted',
  'bass boost',
  'slowed reverb',
  'slowed and reverb',
  'sped up',
  'speed up',
  'pitched up',
  '8d audio',
  '8d music',
  // Instrument-specific versions
  'piano version',
  'piano cover',
  'guitar version',
  'guitar cover',
  'violin version',
  'flute version',
  // Acoustic / live / cover — only as phrases, never standalone words
  'acoustic version',
  'acoustic cover',
  'acoustic session',
  'live version',
  'live performance',
  'live session',
  'live at',
  'live from',
  'live in',
  'cover version',
  'cover by',
  // Fan / unofficial
  'fan made',
  'fan edit',
  'backing track',
  'minus one',
  'no vocals',
  'without vocals',
  'a cappella',
  'acapella',
  // DJ / club
  'dj remix',
  'club remix',
  // Lo-fi
  'lo fi version',
  'lofi version',
  'lo-fi version',
  // Misc
  'medley version',
];

// ─── Pre-compile regex patterns once at startup ───────────────────────────────

const WORD_TERM_REGEXES = Array.from(EXACT_WORD_TERMS).map(
  term => new RegExp(`\\b${term}\\b`, 'i')
);

const PHRASE_REGEXES = EXACT_PHRASES.map(phrase => {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\ /g, '[\\s\\-]');
  return new RegExp(`\\b${escaped}\\b`, 'i');
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if the JioSaavn song title contains a blacklisted term/phrase.
 * @param {string} title  JioSaavn song name (raw)
 * @returns {boolean}
 */
function isBlacklisted(title) {
  if (!title) return false;
  for (const regex of WORD_TERM_REGEXES) {
    if (regex.test(title)) return true;
  }
  for (const regex of PHRASE_REGEXES) {
    if (regex.test(title)) return true;
  }
  return false;
}

module.exports = { isBlacklisted, EXACT_WORD_TERMS, EXACT_PHRASES };
