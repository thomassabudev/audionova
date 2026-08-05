/**
 * importMatcherService.js
 *
 * YouTube title -> JioSaavn matching engine.
 *
 * Improvements over v1:
 *   - Centralized blacklist (word-boundary + phrase matching)
 *   - Combined similarity: DL + Jaccard (length-aware weighting)
 *   - 5 search tiers instead of 3
 *   - VEVO/Official channel suffix stripping
 *   - Configurable SEARCH_RESULT_LIMIT (env var, default 10)
 *   - Optional output deduplication by JioSaavn song.id (user opt-in only)
 *   - Strict mode threshold (0.70 instead of 0.55)
 *   - Scorer split into separate stage functions for future extensibility
 *
 * Import never throws - every error is caught per-song.
 */

const axios = require('axios');
const { normalize, similarity, combinedSimilarity } = require('../utils/stringUtils');
const { isBlacklisted } = require('../utils/blacklistFilter');
const sessionStore = require('./sessionStore');

const CONCURRENCY  = parseInt(process.env.IMPORT_CONCURRENCY  || '5',  10);
const SEARCH_LIMIT = parseInt(process.env.SEARCH_RESULT_LIMIT || '10', 10);
const JIOSAAVN_URL = `http://127.0.0.1:${process.env.PORT || 5009}/api/jiosaavn/search/songs`;

// --- Constants ---

const SUFFIX_REGEX = /[\(\[][^\)\]]*[\)\]]/g;

const LABEL_CHANNELS = new Set([
  't-series', 'sony music india', 'saregama music', 'speed records',
  'zee music company', 'tips music', 'ultra bollywood', 'aditya music',
  'lahari music', 'think music india', 'venus music', 'universal music india',
  'eros now music', 'yrf music', 'dharma music', 'jio saavn',
]);

const CHANNEL_SUFFIX_REGEX = /\s*(vevo|official|music|records?|entertainment|india|channel)\s*$/i;

const MATCH_THRESHOLD       = 0.55;
const RETRY_MATCH_THRESHOLD = 0.45;
const STRICT_THRESHOLD      = 0.70;

// --- Title Cleaning ---

function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  let title = rawTitle;
  title = title.replace(SUFFIX_REGEX, '');
  title = title.replace(/\s+(ft\.|feat\.)\s+[^-|]+/gi, '');
  title = title.replace(/\b(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|hd|4k))\b/gi, '');
  title = title.replace(/\b(lyrics?|hd|hq|4k|remastered?|remaster)\b/gi, '');
  title = title.replace(/\s+/g, ' ').trim();
  title = title.replace(/[\-|]+$/, '').trim();
  return title;
}

// --- Artist Extraction ---

function extractArtist(channelTitle) {
  if (!channelTitle) return '';
  const topicMatch = channelTitle.match(/^(.+?)\s*-\s*Topic$/i);
  if (topicMatch) return topicMatch[1].trim();
  if (LABEL_CHANNELS.has(channelTitle.toLowerCase())) return '';
  return channelTitle.replace(CHANNEL_SUFFIX_REGEX, '').trim();
}

function splitArtistTitle(rawTitle) {
  const parts = rawTitle.split(/\s+[-]+\s+/);
  if (parts.length >= 2) {
    const firstPart = parts[0].trim();
    const isSuffixWord = /\b(official|audio|video|lyrics?|4k|hd|hq)\b/i.test(firstPart);
    if (!isSuffixWord) {
      return { artist: firstPart, title: parts.slice(1).join(' - ').trim() };
    }
  }
  return null;
}

// --- Query Building (5 tiers) ---

function buildSearchQueries(cleanedTitle, artist) {
  const queries = [];
  const first4  = cleanedTitle.split(' ').slice(0, 4).join(' ');

  if (artist) queries.push({ query: `${cleanedTitle} ${artist}`, tier: 1 });
  queries.push({ query: cleanedTitle, tier: artist ? 2 : 1 });
  if (artist && first4 !== cleanedTitle && first4.length > 3)
    queries.push({ query: `${artist} ${first4}`, tier: 3 });
  if (first4 !== cleanedTitle && first4.length > 3)
    queries.push({ query: first4, tier: 4 });
  if (artist && artist.length > 2)
    queries.push({ query: artist, tier: 5 });

  return queries;
}

// --- Scoring pipeline ---
// Each stage is a separate function so future scorers (phonetic, alias,
// multilingual) can be added as new stages without touching existing ones.

function computeTitleScore(cleanedTitle, jioTitle) {
  return combinedSimilarity(cleanedTitle, jioTitle);
}

function computeArtistScore(artist, jioArtist) {
  if (!artist) return 0.5;
  return similarity(artist, jioArtist);
}

function applyBonuses(baseScore, jioSong) {
  let score = baseScore;
  const lang = (jioSong.language || '').toLowerCase();
  if (lang && lang !== 'english') score += 0.05;
  const albumName = (jioSong.album ? jioSong.album.name || '' : '').toLowerCase();
  const compilationWords = ['best of', 'top songs', 'greatest hits', 'playlist', 'collection'];
  if (compilationWords.some(function(w) { return albumName.indexOf(w) !== -1; })) score -= 0.10;
  return Math.min(score, 1);
}

function scoreCandidate(jioSong, cleanedTitle, artist, skipKaraoke) {
  var jioTitle  = jioSong.name           || '';
  var jioArtist = jioSong.primaryArtists || '';

  // Stage 0: Blacklist - hard reject before any computation
  if (skipKaraoke && isBlacklisted(jioTitle)) {
    return { score: 0, titleSim: 0, artistSim: 0, blacklisted: true };
  }

  var titleSim = computeTitleScore(cleanedTitle, jioTitle);
  if (titleSim < 0.40) return { score: 0, titleSim: titleSim, artistSim: 0, blacklisted: false };

  var artistSim = computeArtistScore(artist, jioArtist);
  var baseScore = (titleSim * 0.60) + (artistSim * 0.35);
  var score     = applyBonuses(baseScore, jioSong);

  return { score: score, titleSim: titleSim, artistSim: artistSim, blacklisted: false };
}

// --- JioSaavn search ---

async function searchJioSaavn(query) {
  try {
    const response = await axios.get(JIOSAAVN_URL, {
      params: { query: query, limit: SEARCH_LIMIT },
      timeout: 10000,
    });
    return (response.data && response.data.data && response.data.data.results) || [];
  } catch (err) {
    await new Promise(function(r) { setTimeout(r, 1000); });
    try {
      const response = await axios.get(JIOSAAVN_URL, {
        params: { query: query, limit: SEARCH_LIMIT },
        timeout: 10000,
      });
      return (response.data && response.data.data && response.data.data.results) || [];
    } catch (e) {
      return [];
    }
  }
}

// --- Core matcher ---

async function matchItem(ytItem, options) {
  options = options || {};
  var skipKaraoke = options.skipKaraoke !== false;
  var threshold   = options.strictMode
    ? STRICT_THRESHOLD
    : (options.threshold != null ? options.threshold : MATCH_THRESHOLD);

  var splitResult  = splitArtistTitle(ytItem.title);
  var rawForClean  = splitResult ? splitResult.title : ytItem.title;
  var splitArtist  = splitResult ? splitResult.artist : null;
  var cleanedTitle = cleanTitle(rawForClean);
  var artist       = splitArtist || extractArtist(ytItem.channelTitle);
  var queries      = buildSearchQueries(cleanedTitle, artist);

  var bestScore     = 0;
  var bestCandidate = null;
  var bestTitleSim  = 0;
  var bestArtistSim = 0;
  var bestQuery     = '';
  var bestTier      = 0;

  for (var qi = 0; qi < queries.length; qi++) {
    var q          = queries[qi];
    var candidates = await searchJioSaavn(q.query);
    if (!candidates.length) continue;

    for (var ci = 0; ci < candidates.length; ci++) {
      var result = scoreCandidate(candidates[ci], cleanedTitle, artist, skipKaraoke);
      if (result.score > bestScore) {
        bestScore     = result.score;
        bestCandidate = candidates[ci];
        bestTitleSim  = result.titleSim;
        bestArtistSim = result.artistSim;
        bestQuery     = q.query;
        bestTier      = q.tier;
      }
    }
    if (bestScore >= 0.85 && q.tier <= 2) break;
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

// --- Concurrent pool ---

async function processWithConcurrency(items, onProgress, options) {
  options = options || {};
  var matched   = [];
  var unmatched = [];
  var processed = 0;
  var total     = items.length;

  for (var i = 0; i < total; i += CONCURRENCY) {
    var batch   = items.slice(i, i + CONCURRENCY);
    var results = await Promise.allSettled(
      batch.map(function(item) { return matchItem(item, options); })
    );

    for (var ri = 0; ri < results.length; ri++) {
      var res = results[ri];
      if (res.status === 'fulfilled') {
        if (res.value.type === 'matched') {
          matched.push(res.value);
        } else {
          unmatched.push(res.value);
        }
      } else {
        console.error('[ImportMatcher] Unexpected rejection:', res.reason);
        unmatched.push({
          type: 'unmatched', title: '(unknown)', artist: '(unknown)',
          reason: 'error', bestScore: 0,
          error: (res.reason && res.reason.message) || 'Unknown error',
        });
      }
      processed++;
    }

    if (onProgress) onProgress(processed, total, matched.length, unmatched.length);
  }

  return { matched: matched, unmatched: unmatched };
}

// --- Output deduplication (opt-in only) ---

function deduplicateOutput(matched) {
  var seen = new Set();
  var dedupedMatched    = [];
  var duplicatesRemoved = 0;

  for (var i = 0; i < matched.length; i++) {
    var item   = matched[i];
    var songId = item.song && item.song.id;
    if (songId && seen.has(songId)) {
      duplicatesRemoved++;
    } else {
      if (songId) seen.add(songId);
      dedupedMatched.push(item);
    }
  }

  return { dedupedMatched: dedupedMatched, duplicatesRemoved: duplicatesRemoved };
}

// --- Public API ---

async function importPlaylist(importId, accessToken, playlistId, playlistTitle, ytItems, importOptions) {
  importOptions = importOptions || {};
  var options = {
    skipKaraoke:      importOptions.skipKaraoke      !== false,
    removeDuplicates: importOptions.removeDuplicates === true,
    strictMode:       importOptions.strictMode        === true,
  };

  var originalTotal = ytItems.length;

  await sessionStore.updateSession(importId, {
    status: 'running',
    progress: { processed: 0, total: originalTotal, matchedCount: 0, unmatchedCount: 0 },
  });

  var matchResult = await processWithConcurrency(
    ytItems,
    async function(processed, total, matchedCount, unmatchedCount) {
      if (processed % 10 === 0 || processed === total) {
        await sessionStore.updateSession(importId, {
          progress: { processed: processed, total: total, matchedCount: matchedCount, unmatchedCount: unmatchedCount },
        });
      }
    },
    options
  );

  var matched   = matchResult.matched;
  var unmatched = matchResult.unmatched;

  var duplicatesRemoved = 0;
  if (options.removeDuplicates) {
    var deduped       = deduplicateOutput(matched);
    matched           = deduped.dedupedMatched;
    duplicatesRemoved = deduped.duplicatesRemoved;
  }

  var finalResult = {
    playlistName:     playlistTitle,
    playlistId:       playlistId,
    originalTotal:    originalTotal,
    total:            originalTotal,
    matchedCount:     matched.length,
    unmatchedCount:   unmatched.length,
    duplicatesRemoved:duplicatesRemoved,
    matched:          matched,
    unmatched:        unmatched,
    importOptions:    options,
    concurrencyUsed:  CONCURRENCY,
    searchLimit:      SEARCH_LIMIT,
    importedAt:       new Date().toISOString(),
  };

  await sessionStore.setResult(importId, finalResult);

  console.log(
    '[ImportMatcher] Done | Total: ' + originalTotal +
    ' | Matched: ' + matched.length +
    ' | Unmatched: ' + unmatched.length +
    ' | Dupes: ' + duplicatesRemoved +
    ' | skipKaraoke: ' + options.skipKaraoke +
    ' | strict: ' + options.strictMode
  );

  return finalResult;
}

async function retryUnmatched(importId, unmatchedItems) {
  console.log('[ImportMatcher] Retrying ' + unmatchedItems.length + ' items (threshold: ' + RETRY_MATCH_THRESHOLD + ')');

  var retryItems = unmatchedItems.map(function(u) {
    return { title: u.title, channelTitle: u.artist, videoId: u.videoId || '', position: 0 };
  });

  var retryResult = await processWithConcurrency(retryItems, null, {
    threshold: RETRY_MATCH_THRESHOLD, skipKaraoke: true,
  });

  console.log('[ImportMatcher] Retry done | New: ' + retryResult.matched.length + ' | Still unmatched: ' + retryResult.unmatched.length);

  return {
    newlyMatched:  retryResult.matched,
    stillUnmatched:retryResult.unmatched,
    retriedCount:  unmatchedItems.length,
    newMatchCount: retryResult.matched.length,
  };
}

module.exports = {
  importPlaylist,
  retryUnmatched,
  cleanTitle,
  extractArtist,
  scoreCandidate,
  MATCH_THRESHOLD,
  RETRY_MATCH_THRESHOLD,
  STRICT_THRESHOLD,
  CONCURRENCY,
  SEARCH_LIMIT,
};
