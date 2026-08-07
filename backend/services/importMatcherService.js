/**
 * importMatcherService.js
 *
 * YouTube title -> JioSaavn matching engine.
 *
 * v3 Improvements (Solutions A + B + F):
 *
 *   Solution A - Artist Veto Rule:
 *     If the artist IS known and artist similarity < 0.35 (clearly wrong artist),
 *     the match is rejected regardless of title score.
 *     Prevents: "Espresso (Sabrina Carpenter)" -> Hindi "Espresso" false positive.
 *
 *   Solution B - Tier-Weighted Threshold:
 *     Broader search tiers require higher confidence before accepting a match.
 *     Tier 0/1 (specific): 0.55 base | Tier 2 (title-only): +0.10 | Tier 3: +0.13
 *     Tier 4: +0.17 | Tier 5 (artist-only): +0.20
 *     Prevents: title-only matches from passing at the base threshold.
 *
 *   Solution F - Movie/Album Hint Extraction (Tier 0):
 *     Extracts movie/album name from brackets in the raw YouTube title BEFORE cleaning.
 *     Creates a Tier 0 search: "SongTitle MovieName" (most specific possible).
 *     Fixes: "Kaattuchembakam (Pallichattambi Movie Song)" -> searches
 *            "Kaattuchembakam Pallichattambi" and picks the correct 2023 version.
 */

const axios = require('axios');
const { normalize, similarity, combinedSimilarity } = require('../utils/stringUtils');
const { isBlacklisted } = require('../utils/blacklistFilter');
const sessionStore = require('./sessionStore');

const CONCURRENCY  = parseInt(process.env.IMPORT_CONCURRENCY  || '5',  10);
const SEARCH_LIMIT = parseInt(process.env.SEARCH_RESULT_LIMIT || '20', 10);
const JIOSAAVN_URL = `http://127.0.0.1:${process.env.PORT || 5009}/api/jiosaavn/search/songs`;

// --- Constants ---

const SUFFIX_REGEX = /[\(\[][^\)\]]*[\)\]]/g;

const LABEL_CHANNELS = new Set([
  // Hindi / Pan-India
  't-series', 'sony music india', 'saregama music', 'speed records',
  'zee music company', 'tips music', 'ultra bollywood', 'aditya music',
  'eros now music', 'yrf music', 'dharma music', 'jio saavn',
  'universal music india', 'venus music', 'desi music factory',
  // South Indian labels
  'sony music south', 'think music india', 'think music',
  'lahari music', 'aditya music', 'saregama south',
  'anand audio', 'audio compass', 'super good films',
  'kv music', 'magicbox', 'musicbox',
]);

const CHANNEL_SUFFIX_REGEX = /\s*(vevo|official|music|records?|entertainment|india|channel)\s*$/i;

const GENERIC_CHANNEL_REGEX = /\b(music|songs|records|audios|entertainment|company|movies|cinemas|studios|series|television|network|media|digital|lofi|lo.fi|unplugged|acoustic|playlist|jukebox|beats|mashup|bgm|covers?)\b/i;

// Words inside brackets that indicate metadata, NOT a movie/album name
const BRACKET_NOISE_REGEX = /\b(official|audio|video|lyrics?|hd|hq|4k|full|song|songs|music|movie|ft|feat|from|with|by|version|vevo|topic|trailer|teaser|promo|animation|lyric|visualizer|full\s*song|full\s*video)\b/gi;

const MATCH_THRESHOLD       = 0.55;
const RETRY_MATCH_THRESHOLD = 0.45;
const STRICT_THRESHOLD      = 0.70;

// --- Solution B: Tier-weighted thresholds ---
// Broader tiers need higher confidence to accept a match.
// Prevents songs-not-on-JioSaavn from being matched via wide fallback searches.
const TIER_PENALTIES = { 0: 0, 1: 0, 2: 0.05, 3: 0.13, 4: 0.17, 5: 0.20 };

function getTierThreshold(tier, baseThreshold) {
  var penalty = TIER_PENALTIES[tier] !== undefined ? TIER_PENALTIES[tier] : 0.20;
  return Math.min(baseThreshold + penalty, 0.95);
}

// --- Title Cleaning ---

function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  var title = rawTitle;
  title = title.replace(SUFFIX_REGEX, '');
  title = title.replace(/\s+(ft\.|feat\.)\s+[^-|]+/gi, '');
  title = title.replace(/\b(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|hd|4k))\b/gi, '');
  title = title.replace(/\b(lyrics?|hd|hq|4k|remastered?|remaster)\b/gi, '');
  title = title.replace(/\s+/g, ' ').trim();
  title = title.replace(/[\-|]+$/, '').trim();
  return title;
}

// --- Solution F: Movie/Album Hint Extraction ---
// Reads bracketed content from the RAW YouTube title before cleaning strips it.
// Returns the movie/album name if found, or null if brackets only contain metadata.

function extractAlbumHint(rawTitle) {
  if (!rawTitle) return null;
  var matches = rawTitle.match(/[\(\[](.*?)[\)\]]/g);
  if (!matches) return null;

  for (var i = 0; i < matches.length; i++) {
    var content = matches[i].slice(1, -1).trim();
    // Remove noise words (Official, Video, HD, Song, etc.)
    var cleaned = content.replace(BRACKET_NOISE_REGEX, '').replace(/\s+/g, ' ').trim();
    // Strip surrounding quote characters (e.g. `"Param Sundari"` → `Param Sundari`)
    cleaned = cleaned.replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '').trim();
    // Must be at least 3 chars and not only digits/symbols
    if (cleaned.length >= 3 && !/^[\d\s\-_]+$/.test(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

// --- Artist Extraction ---

function extractArtist(channelTitle) {
  if (!channelTitle) return '';
  var topicMatch = channelTitle.match(/^(.+?)\s*-\s*Topic$/i);
  if (topicMatch) return topicMatch[1].trim();
  if (LABEL_CHANNELS.has(channelTitle.toLowerCase())) return '';
  if (GENERIC_CHANNEL_REGEX.test(channelTitle)) return '';
  return channelTitle.replace(CHANNEL_SUFFIX_REGEX, '').trim();
}

// --- Channel-anchored direction detection (v4) ---
//
// Problem: Both "Artist - Title" (A-T) and "Title - Artist" (T-A) formats are
// common on YouTube. The old heuristic always assumed A-T, which was wrong for
// 60% of real-world playlist titles (lyric channels, fan uploads, user playlists).
//
// Solution: Use channelTitle as a disambiguation anchor.
//
//   Step 1  Topic channel   → always A-T (YouTube auto-generates these)
//   Step 2  Label channel   → PIPE/PAREN format; skip split entirely
//   Step 3  Channel ≈ parts[0]  → A-T ("Artist - Title")
//   Step 4  Channel ≈ parts[-1] → T-A ("Title - Artist")
//   Step 5  Fallback        → return null; caller uses full title + channel artist
//
// "Matches" uses prefix-comparison so "Artist ft. Collaborator" parts are
// handled correctly when channelTitle is just "Artist".

function channelMatchesPart(channelNorm, partNorm) {
  if (!channelNorm || channelNorm.length < 2) return false;
  if (partNorm === channelNorm) return true;
  // Prefix match: handles "Artist ft. Collaborator" appended in part
  if (partNorm.startsWith(channelNorm + ' ')) return true;
  // Fuzzy prefix: compare first N words of part with channel (N = channel word count)
  var channelWords = channelNorm.split(' ').length;
  var partPrefix   = partNorm.split(' ').slice(0, channelWords).join(' ');
  return partPrefix.length > 0 && similarity(channelNorm, partPrefix) >= 0.85;
}

function splitArtistTitle(rawTitle, channelTitle) {
  var parts = rawTitle.split(/\s+[-]+\s+/);
  if (parts.length < 2) return null;

  var firstPart = parts[0].trim();
  var lastPart  = parts[parts.length - 1].trim();

  // Hard guard: metadata word in parts[0] means it is not an artist name
  if (/\b(official|audio|video|lyrics?|4k|hd|hq)\b/i.test(firstPart)) return null;

  // ── Step 1: YouTube Topic channel ──────────────────────────────────────────
  // YouTube auto-generates these channels and their titles are always A-T.
  if (channelTitle && /\s*-\s*Topic$/i.test(channelTitle)) {
    return { artist: firstPart, title: parts.slice(1).join(' - ').trim() };
  }

  // ── Step 2: Known label channel ────────────────────────────────────────────
  // T-Series, YRF Music, Zee Music etc. use PIPE/PAREN formats, never A-T.
  // Returning null lets the caller use extractArtist() which returns '' for labels.
  if (channelTitle && LABEL_CHANNELS.has(channelTitle.toLowerCase())) {
    return null;
  }
  if (channelTitle && GENERIC_CHANNEL_REGEX.test(channelTitle)) {
    return null;
  }

  // ── Steps 3 & 4: Match channel name against dash-separated parts ───────────
  if (channelTitle) {
    var cleanChannel = channelTitle.replace(CHANNEL_SUFFIX_REGEX, '').trim();
    if (cleanChannel.length >= 2) {
      var normChannel = normalize(cleanChannel);
      var normFirst   = normalize(firstPart);
      var normLast    = normalize(lastPart);

      var firstIsArtist = channelMatchesPart(normChannel, normFirst);
      var lastIsArtist  = channelMatchesPart(normChannel, normLast);

      // Step 3: Channel ≈ parts[0] → A-T ("Artist - Title")
      if (firstIsArtist && !lastIsArtist) {
        return { artist: firstPart, title: parts.slice(1).join(' - ').trim() };
      }

      // Step 4: Channel ≈ parts[-1] → T-A ("Title - Artist")
      if (lastIsArtist && !firstIsArtist) {
        return { artist: lastPart, title: parts.slice(0, -1).join(' - ').trim() };
      }

      // Both sides match (e.g. artist name == song name): prefer A-T
      if (firstIsArtist && lastIsArtist) {
        return { artist: firstPart, title: parts.slice(1).join(' - ').trim() };
      }
    }
  }

  // ── Step 5: Fallback — format cannot be reliably determined ───────────────
  // Return null so the caller uses the full raw title and channel-based artist.
  return null;
}

// --- Query Building (Tier 0-5) ---
// Tier 0: title + movie/album hint (NEW - most specific, only when hint found)
// Tier 1: title + artist
// Tier 2: title only
// Tier 3: artist + first 4 words
// Tier 4: first 4 words only
// Tier 5: artist only (last resort)

function buildSearchQueries(cleanedTitle, artist, albumHint) {
  var queries = [];
  var first4  = cleanedTitle.split(' ').slice(0, 4).join(' ');

  // Tier 0: movie/album specific (Solution F)
  if (albumHint) {
    queries.push({ query: (cleanedTitle + ' ' + albumHint).trim(), tier: 0 });
  }

  if (artist) queries.push({ query: cleanedTitle + ' ' + artist, tier: 1 });
  queries.push({ query: cleanedTitle, tier: artist ? 2 : 1 });
  if (artist && first4 !== cleanedTitle && first4.length > 3)
    queries.push({ query: artist + ' ' + first4, tier: 3 });
  if (first4 !== cleanedTitle && first4.length > 3)
    queries.push({ query: first4, tier: 4 });
  if (artist && artist.length > 2)
    queries.push({ query: artist, tier: 5 });

  return queries;
}

// --- Scoring pipeline ---
// Stage functions are separate so future scorers (phonetic, alias,
// multilingual) can be added without touching existing stages.

function computeTitleScore(cleanedTitle, jioTitle) {
  return combinedSimilarity(cleanedTitle, jioTitle);
}

function computeArtistScore(artist, jioArtist) {
  if (!artist)    return 0.5; // neutral - YouTube channel is a label, artist unknown
  if (!jioArtist) return 0.5; // neutral - JioSaavn has no artist metadata for this song
  return similarity(artist, jioArtist);
}

function applyBonuses(baseScore, jioSong) {
  var score = baseScore;
  var lang = (jioSong.language || '').toLowerCase();
  if (lang && lang !== 'english') score += 0.05;
  var albumName = (jioSong.album ? jioSong.album.name || '' : '').toLowerCase();
  var compilationWords = ['best of', 'top songs', 'greatest hits', 'playlist', 'collection'];
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

  // Solution A: Artist Veto Rule
  // If the artist IS known and is clearly different (< 0.35 similarity),
  // the title match alone is not enough - reject to avoid false positives.
  // This prevents "Espresso (Sabrina Carpenter)" from matching a Hindi "Espresso".
  if (artist && artistSim < 0.35) {
    return { score: 0, titleSim: titleSim, artistSim: artistSim, blacklisted: false };
  }

  var baseScore = (titleSim * 0.60) + (artistSim * 0.35);
  var score     = applyBonuses(baseScore, jioSong);

  return { score: score, titleSim: titleSim, artistSim: artistSim, blacklisted: false };
}

// --- JioSaavn search ---

async function searchJioSaavn(query) {
  try {
    var response = await axios.get(JIOSAAVN_URL, {
      params: { query: query, limit: SEARCH_LIMIT },
      timeout: 10000,
    });
    return (response.data && response.data.data && response.data.data.results) || [];
  } catch (err) {
    await new Promise(function(r) { setTimeout(r, 1000); });
    try {
      var response2 = await axios.get(JIOSAAVN_URL, {
        params: { query: query, limit: SEARCH_LIMIT },
        timeout: 10000,
      });
      return (response2.data && response2.data.data && response2.data.data.results) || [];
    } catch (e) {
      return [];
    }
  }
}

// --- Core matcher ---

async function matchItem(ytItem, options) {
  options = options || {};
  var skipKaraoke = options.skipKaraoke !== false;
  var baseThreshold = options.strictMode
    ? STRICT_THRESHOLD
    : (options.threshold != null ? options.threshold : MATCH_THRESHOLD);

  // Solution F: Extract movie/album hint from raw title BEFORE cleaning strips it
  var albumHint    = extractAlbumHint(ytItem.title);

  // Channel-anchored split: pass channelTitle so the function can determine
  // whether the format is "Artist - Title" (A-T) or "Title - Artist" (T-A).
  var splitResult  = splitArtistTitle(ytItem.title, ytItem.channelTitle);
  var rawForClean  = splitResult ? splitResult.title : ytItem.title;
  var splitArtist  = splitResult ? splitResult.artist : null;
  var cleanedTitle = cleanTitle(rawForClean);

  // Fallback: when no split was determined (Step 5) and a " - " separator exists,
  // use parts[0] as cleanedTitle for *scoring* accuracy. Without this, the full
  // title (e.g. "Attention - Charlie Puth") would be compared against JioSaavn
  // song names (e.g. "Attention") and score too low to pass the threshold.
  if (!splitResult) {
    var fallbackParts = ytItem.title.split(/\s+[-]+\s+/);
    if (fallbackParts.length >= 2) {
      var shortClean = cleanTitle(fallbackParts[0]);
      if (shortClean.length >= 2 && shortClean.length < cleanedTitle.length) {
        cleanedTitle = shortClean;
      }
    }
  }

  var artist       = splitArtist || extractArtist(ytItem.channelTitle);

  // ── Composer-channel fix ────────────────────────────────────────────────────
  // YouTube auto-generates "Artist - Topic" channels for music composers, not singers.
  // For Indian film songs: YouTube Topic = Composer (Jakes Bejoy, Harris Jayaraj…)
  //                        JioSaavn primaryArtists = Singer (Sid Sriram, Naresh Iyer…)
  // If we use the composer name in the Artist Veto, it always fires and rejects correct results.
  // Fix: use the composer name ONLY for search queries (to narrow down results),
  //       but treat artist as NEUTRAL (empty) during candidate scoring.
  var isTopicChannel = ytItem.channelTitle && /\s*-\s*Topic$/i.test(ytItem.channelTitle);
  var scoringArtist  = isTopicChannel ? '' : artist;

  var queries      = buildSearchQueries(cleanedTitle, artist, albumHint);

  // Solution B: Per-tier threshold - track best VALID match (one that passed its tier's threshold)
  var bestValidScore     = 0;
  var bestValidCandidate = null;
  var bestValidTitleSim  = 0;
  var bestValidArtistSim = 0;
  var bestValidQuery     = '';
  var bestValidTier      = 0;
  var globalBestScore    = 0; // raw best score across all tiers (for unmatched reporting)

  var debugLog = []; // DEBUG: collect info for unmatched songs

  for (var qi = 0; qi < queries.length; qi++) {
    var q             = queries[qi];
    var tierThreshold = getTierThreshold(q.tier, baseThreshold);
    var candidates    = await searchJioSaavn(q.query);

    // DEBUG: log query result count
    debugLog.push('  Q' + qi + '[tier' + q.tier + '] "' + q.query + '" → ' + candidates.length + ' results');

    if (!candidates.length) continue;

    var tierBestScore     = 0;
    var tierBestCandidate = null;
    var tierBestTitleSim  = 0;
    var tierBestArtistSim = 0;

    for (var ci = 0; ci < candidates.length; ci++) {
      var result = scoreCandidate(candidates[ci], cleanedTitle, scoringArtist, skipKaraoke);
      if (result.score > tierBestScore) {
        tierBestScore     = result.score;
        tierBestCandidate = candidates[ci];
        tierBestTitleSim  = result.titleSim;
        tierBestArtistSim = result.artistSim;
      }
    }

    // DEBUG: log best candidate for this tier
    if (tierBestCandidate) {
      debugLog.push('    Best: "' + tierBestCandidate.name + '" by "' + tierBestCandidate.primaryArtists + '" → score=' + tierBestScore.toFixed(2) + ' (titleSim=' + tierBestTitleSim.toFixed(2) + ' artistSim=' + tierBestArtistSim.toFixed(2) + ') threshold=' + tierThreshold.toFixed(2));
    }

    // Track raw best for unmatched reason reporting
    if (tierBestScore > globalBestScore) globalBestScore = tierBestScore;

    // Solution B: This tier's best must meet its own (higher) threshold
    if (tierBestScore >= tierThreshold && tierBestCandidate) {
      if (tierBestScore > bestValidScore) {
        bestValidScore     = tierBestScore;
        bestValidCandidate = tierBestCandidate;
        bestValidTitleSim  = tierBestTitleSim;
        bestValidArtistSim = tierBestArtistSim;
        bestValidQuery     = q.query;
        bestValidTier      = q.tier;
      }
      // Very high confidence on early specific tier - stop searching
      if (bestValidScore >= 0.85 && q.tier <= 2) break;
    }
  }

  if (bestValidCandidate) {
    return {
      type:       'matched',
      song:       bestValidCandidate,
      confidence: parseFloat(bestValidScore.toFixed(4)),
      titleSim:   parseFloat(bestValidTitleSim.toFixed(4)),
      artistSim:  parseFloat(bestValidArtistSim.toFixed(4)),
      queryUsed:  bestValidQuery,
      queryTier:  bestValidTier,
      ytTitle:    ytItem.title,
      ytChannel:  ytItem.channelTitle,
      videoId:    ytItem.videoId,
    };
  }

  // DEBUG: print full trace for unmatched songs
  console.log('[DEBUG UNMATCHED] "' + ytItem.title + '" | channel="' + ytItem.channelTitle + '" | cleanedTitle="' + cleanedTitle + '" | artist="' + artist + '"');
  debugLog.forEach(function(line) { console.log(line); });

  return {
    type:       'unmatched',
    title:      ytItem.title,
    artist:     ytItem.channelTitle,
    cleanTitle: cleanedTitle,
    videoId:    ytItem.videoId,
    reason:     globalBestScore > 0 ? 'low_confidence' : 'no_match',
    bestScore:  parseFloat(globalBestScore.toFixed(4)),
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
  extractAlbumHint,
  scoreCandidate,
  getTierThreshold,
  MATCH_THRESHOLD,
  RETRY_MATCH_THRESHOLD,
  STRICT_THRESHOLD,
  CONCURRENCY,
  SEARCH_LIMIT,
};
