/**
 * importMatcherService.js
 *
 * YouTube title → JioSaavn matching engine.
 *
 * For each YouTube playlist item:
 *   1. Clean the title (remove video suffixes)
 *   2. Extract likely artist from channelTitle
 *   3. Build up to 3 search queries (tiered by confidence)
 *   4. Score JioSaavn candidates (titleSim + artistSim + language bonus)
 *   5. Return matched result with confidence score, or unmatched with reason
 *
 * Import never throws — every error is caught per-song.
 * Concurrency is controlled via IMPORT_CONCURRENCY env var (default: 5).
 */

const axios = require('axios');
const { normalize, similarity } = require('../utils/stringUtils');
const sessionStore = require('./sessionStore');

const CONCURRENCY  = parseInt(process.env.IMPORT_CONCURRENCY || '5', 10);
const JIOSAAVN_URL = `http://127.0.0.1:${process.env.PORT || 5009}/api/jiosaavn/search/songs`;

// ─── Constants ────────────────────────────────────────────────────────────────

// Regex: removes all parenthesized/bracketed content from YouTube titles
const SUFFIX_REGEX = /[\(\[][^\)\]]*[\)\]]/g;

// Known label/distributor channels — not the artist
const LABEL_CHANNELS = new Set([
  't-series', 'sony music india', 'saregama music', 'speed records',
  'zee music company', 'tips music', 'ultra bollywood', 'aditya music',
  'lahari music', 'think music india', 'venus music', 'universal music india',
  'eros now music', 'yrf music', 'dharma music', 'jio saavn',
]);

// Minimum confidence threshold for a song to count as "matched" on first pass
const MATCH_THRESHOLD       = 0.55;
// Lower threshold used during retry — user is explicitly asking for another attempt
const RETRY_MATCH_THRESHOLD = 0.45;

// ─── Title Cleaning ───────────────────────────────────────────────────────────

/**
 * Remove video/music-specific suffixes from YouTube titles.
 * "Shape of You (Official Video)" → "Shape of You"
 */
function cleanTitle(rawTitle) {
  if (!rawTitle) return '';

  let title = rawTitle;

  // Remove parenthesized and bracketed content
  title = title.replace(SUFFIX_REGEX, '');

  // Remove "ft." / "feat." inline mentions (keep before the pipe for artist extraction)
  title = title.replace(/\s+(ft\.|feat\.)\s+[^-|]+/gi, '');

  // Remove common trailing noise words left without parens
  title = title.replace(/\b(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|hd|4k))\b/gi, '');
  title = title.replace(/\b(lyrics?|hd|hq|4k|remastered?|remaster)\b/gi, '');

  // Collapse whitespace
  title = title.replace(/\s+/g, ' ').trim();

  // Remove trailing dash or pipe
  title = title.replace(/[\-|–—]+$/, '').trim();

  return title;
}

/**
 * Extract a likely artist name from a YouTube channelTitle.
 *
 * Rules:
 *  - "Arijit Singh - Topic" → "Arijit Singh"
 *  - Label channels (T-Series, etc.) → return '' (will not be used as artist)
 *  - Otherwise: return channelTitle as-is
 */
function extractArtist(channelTitle) {
  if (!channelTitle) return '';

  // Handle "Artist - Topic" channels (YouTube Music auto-generated)
  const topicMatch = channelTitle.match(/^(.+?)\s*-\s*Topic$/i);
  if (topicMatch) return topicMatch[1].trim();

  // Check label/distributor blocklist
  if (LABEL_CHANNELS.has(channelTitle.toLowerCase())) return '';

  return channelTitle;
}

/**
 * If the YouTube title contains " - ", it's likely "Artist - Song Title".
 * Returns { artist, title } split, or null if pattern not found.
 */
function splitArtistTitle(rawTitle) {
  // Match "Artist Name - Song Title" but not "Song Title - Official Video"
  const parts = rawTitle.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    // Heuristic: first part is artist if it doesn't contain typical suffix words
    const firstPart = parts[0].trim();
    const isSuffixWord = /\b(official|audio|video|lyrics?|4k|hd|hq)\b/i.test(firstPart);
    if (!isSuffixWord) {
      return {
        artist: firstPart,
        title:  parts.slice(1).join(' - ').trim(),
      };
    }
  }
  return null;
}

// ─── Query Building ───────────────────────────────────────────────────────────

/**
 * Build up to 3 search queries in descending confidence order.
 * queryTier 1 = best, 3 = widest fallback
 */
function buildSearchQueries(cleanedTitle, artist) {
  const queries = [];

  // Tier 1: title + artist (most specific)
  if (artist) {
    queries.push({ query: `${cleanedTitle} ${artist}`, tier: 1 });
  }

  // Tier 2: title only
  queries.push({ query: cleanedTitle, tier: artist ? 2 : 1 });

  // Tier 3: first 3 meaningful words of title (broad fallback)
  const shortTitle = cleanedTitle.split(' ').slice(0, 3).join(' ');
  if (shortTitle !== cleanedTitle && shortTitle.length > 3) {
    queries.push({ query: shortTitle, tier: 3 });
  }

  return queries;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Score a single JioSaavn candidate against the cleaned YouTube title and artist.
 * Returns a confidence score between 0 and 1.
 *
 * Weights:
 *   Title similarity : 0.60
 *   Artist similarity: 0.35
 *   Language bonus   : 0.05
 */
function scoreCandidate(jioSong, cleanedTitle, artist) {
  const jioTitle  = jioSong.name || '';
  const jioArtist = jioSong.primaryArtists || '';

  const titleSim  = similarity(cleanedTitle, jioTitle);
  const artistSim = artist ? similarity(artist, jioArtist) : 0.5; // neutral if no artist

  // Disqualify if title similarity is too low
  if (titleSim < 0.40) return { score: 0, titleSim, artistSim };

  let score = (titleSim * 0.60) + (artistSim * 0.35);

  // Small language bonus: if song is non-english, slight boost (non-English titles tend to be harder)
  const lang = (jioSong.language || '').toLowerCase();
  if (lang && lang !== 'english') score += 0.05;

  // Penalty for compilation albums
  const albumName = (jioSong.album?.name || '').toLowerCase();
  const compilationWords = ['best of', 'top songs', 'greatest hits', 'playlist', 'collection'];
  if (compilationWords.some(w => albumName.includes(w))) score -= 0.10;

  return { score: Math.min(score, 1), titleSim, artistSim };
}

// ─── JioSaavn search ─────────────────────────────────────────────────────────

/**
 * Search JioSaavn for a query string.
 * Calls our local jiosaavn-proxy — no self-HTTP, this is an internal require.
 * Falls back to HTTP if direct call unavailable.
 */
let _searchJioSaavn;
try {
  // Direct function call — avoids self-HTTP, uses cache from jiosaavn-proxy.js
  const proxyModule = require('../routes/jiosaavn-proxy');
  // The proxy module exports a router, not the raw function — use HTTP call instead
  _searchJioSaavn = null;
} catch (e) {
  _searchJioSaavn = null;
}

async function searchJioSaavn(query) {
  try {
    const response = await axios.get(JIOSAAVN_URL, {
      params: { query, limit: 5 },
      timeout: 10000,
    });
    return response.data?.data?.results || [];
  } catch (err) {
    // Single retry after 1 second
    await new Promise(r => setTimeout(r, 1000));
    try {
      const response = await axios.get(JIOSAAVN_URL, {
        params: { query, limit: 5 },
        timeout: 10000,
      });
      return response.data?.data?.results || [];
    } catch {
      return [];
    }
  }
}

// ─── Core matcher ─────────────────────────────────────────────────────────────

/**
 * Match one YouTube playlist item to a JioSaavn song.
 *
 * @param {{ title, channelTitle, videoId, position }} ytItem
 * @param {{ threshold?: number }} options
 * @returns {{ type: 'matched'|'unmatched', ... }}
 */
async function matchItem(ytItem, options = {}) {
  const threshold = options.threshold ?? MATCH_THRESHOLD;

  // Try to split "Artist - Song" pattern from raw title
  const splitResult = splitArtistTitle(ytItem.title);
  const rawForClean = splitResult ? splitResult.title : ytItem.title;
  const splitArtist = splitResult ? splitResult.artist : null;

  const cleanedTitle = cleanTitle(rawForClean);
  const artist       = splitArtist || extractArtist(ytItem.channelTitle);

  const queries = buildSearchQueries(cleanedTitle, artist);

  let bestScore     = 0;
  let bestCandidate = null;
  let bestTitleSim  = 0;
  let bestArtistSim = 0;
  let bestQuery     = '';
  let bestTier      = 0;

  for (const { query, tier } of queries) {
    const candidates = await searchJioSaavn(query);
    if (!candidates.length) continue;

    for (const candidate of candidates) {
      const { score, titleSim, artistSim } = scoreCandidate(candidate, cleanedTitle, artist);
      if (score > bestScore) {
        bestScore     = score;
        bestCandidate = candidate;
        bestTitleSim  = titleSim;
        bestArtistSim = artistSim;
        bestQuery     = query;
        bestTier      = tier;
      }
    }

    // If we already found a very confident match on tier 1, skip lower tiers
    if (bestScore >= 0.85 && tier === 1) break;
  }

  if (bestScore >= threshold && bestCandidate) {
    return {
      type:       'matched',
      song:       bestCandidate,
      confidence: parseFloat(bestScore.toFixed(4)),
      titleSim:   parseFloat(bestTitleSim.toFixed(4)),
      artistSim:  parseFloat(bestArtistSim.toFixed(4)),
      queryUsed:  bestQuery,
      queryTier:  bestTier,
      ytTitle:    ytItem.title,
      ytChannel:  ytItem.channelTitle,
      videoId:    ytItem.videoId,
    };
  }

  return {
    type:       'unmatched',
    title:      ytItem.title,
    artist:     ytItem.channelTitle,
    cleanTitle: cleanedTitle,
    videoId:    ytItem.videoId,
    reason:     bestScore > 0 ? 'low_confidence' : 'no_match',
    bestScore:  parseFloat(bestScore.toFixed(4)),
    error:      null,
  };
}

// ─── Concurrent pool ──────────────────────────────────────────────────────────

/**
 * Process an array of items through matchItem() with a concurrency pool.
 *
 * @param {Array} items        YouTube playlist items
 * @param {Function} onProgress  Called after each item: (processed, total, matchedCount, unmatchedCount)
 * @param {object} options     { threshold }
 * @returns {{ matched, unmatched }}
 */
async function processWithConcurrency(items, onProgress, options = {}) {
  const matched   = [];
  const unmatched = [];
  let processed   = 0;
  const total     = items.length;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(item => matchItem(item, options))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.type === 'matched') {
          matched.push(result.value);
        } else {
          unmatched.push(result.value);
        }
      } else {
        // Promise itself rejected (should not happen — matchItem catches internally)
        console.error('[ImportMatcher] Unexpected rejection:', result.reason);
        unmatched.push({
          type:  'unmatched',
          title: '(unknown)',
          artist:'(unknown)',
          reason:'error',
          bestScore: 0,
          error: result.reason?.message || 'Unknown error',
        });
      }
      processed++;
    }

    if (onProgress) {
      onProgress(processed, total, matched.length, unmatched.length);
    }
  }

  return { matched, unmatched };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a full import job.
 *
 * @param {string} importId
 * @param {string} accessToken
 * @param {string} playlistId
 * @param {string} playlistTitle
 * @param {Array}  ytItems        Pre-fetched YouTube playlist items
 * @returns {object}              Full ImportResult
 */
async function importPlaylist(importId, accessToken, playlistId, playlistTitle, ytItems) {
  const total = ytItems.length;

  await sessionStore.updateSession(importId, {
    status: 'running',
    progress: { processed: 0, total, matchedCount: 0, unmatchedCount: 0 },
  });

  const { matched, unmatched } = await processWithConcurrency(
    ytItems,
    async (processed, total, matchedCount, unmatchedCount) => {
      // Throttle progress writes — update every 10 items to reduce DB chatter
      if (processed % 10 === 0 || processed === total) {
        await sessionStore.updateSession(importId, {
          progress: { processed, total, matchedCount, unmatchedCount },
        });
      }
    }
  );

  const finalResult = {
    playlistName:   playlistTitle,
    playlistId,
    total,
    matchedCount:   matched.length,
    unmatchedCount: unmatched.length,
    matched,
    unmatched,
    concurrencyUsed: CONCURRENCY,
    importedAt:     new Date().toISOString(),
  };

  await sessionStore.setResult(importId, finalResult);

  console.log(`[ImportMatcher] ✅ Import complete | Total: ${total} | Matched: ${matched.length} | Unmatched: ${unmatched.length}`);

  return finalResult;
}

/**
 * Retry unmatched items from a previous import.
 * Uses alternate search strategies and a lower confidence threshold.
 *
 * @param {string} importId
 * @param {Array}  unmatchedItems  From ImportSession.result.unmatched
 * @returns {{ newlyMatched, stillUnmatched, retriedCount, newMatchCount }}
 */
async function retryUnmatched(importId, unmatchedItems) {
  console.log(`[ImportMatcher] 🔄 Retrying ${unmatchedItems.length} unmatched items (threshold: ${RETRY_MATCH_THRESHOLD})`);

  // Convert stored unmatched objects back to ytItem-compatible shape for matchItem
  const retryItems = unmatchedItems.map(u => ({
    title:        u.title,
    channelTitle: u.artist,
    videoId:      u.videoId || '',
    position:     0,
  }));

  const { matched: newlyMatched, unmatched: stillUnmatched } =
    await processWithConcurrency(retryItems, null, { threshold: RETRY_MATCH_THRESHOLD });

  console.log(`[ImportMatcher] 🔄 Retry complete | Newly matched: ${newlyMatched.length} | Still unmatched: ${stillUnmatched.length}`);

  return {
    newlyMatched,
    stillUnmatched,
    retriedCount:  unmatchedItems.length,
    newMatchCount: newlyMatched.length,
  };
}

module.exports = {
  importPlaylist,
  retryUnmatched,
  cleanTitle,
  extractArtist,
  MATCH_THRESHOLD,
  RETRY_MATCH_THRESHOLD,
  CONCURRENCY,
};
