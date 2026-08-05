/**
 * routes/youtube-import.js
 *
 * YouTube Playlist Import — all OAuth + import routes.
 *
 * Routes:
 *   GET  /api/youtube-import/auth-url          → Returns Google OAuth URL
 *   GET  /api/youtube-import/callback          → Handles OAuth redirect
 *   POST /api/youtube-import/playlists         → Lists user's YT playlists (auth required)
 *   POST /api/youtube-import/start             → Starts import job (auth required)
 *   GET  /api/youtube-import/progress/:importId → Poll import progress (auth required)
 *   POST /api/youtube-import/retry             → Retry unmatched songs (auth required)
 */

const express       = require('express');
const crypto        = require('crypto');
const router        = express.Router();
const { verifyUser }      = require('../middleware/auth');
const youtubeService      = require('../services/youtubeService');
const importMatcher       = require('../services/importMatcherService');
const sessionStore        = require('../services/sessionStore');

// CSRF state: importId → state string (short-lived, in-memory is fine for this)
const _pendingStates = new Map();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Validation helpers ───────────────────────────────────────────────────────

const IMPORT_ID_REGEX    = /^[0-9a-f]{32}$/;
const PLAYLIST_ID_REGEX  = /^[A-Za-z0-9_\-]{5,60}$/;

function validateImportId(id) {
  return typeof id === 'string' && IMPORT_ID_REGEX.test(id);
}

function validatePlaylistId(id) {
  return typeof id === 'string' && PLAYLIST_ID_REGEX.test(id);
}

// ─── GET /api/youtube-import/auth-url ────────────────────────────────────────
// Returns a Google OAuth URL the frontend will redirect the user to.
// Requires the user to be logged in to AudioNova first (Firebase token).

router.get('/auth-url', verifyUser, (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const importId    = sessionStore.generateImportId();
    const state       = `${firebaseUid}:${crypto.randomBytes(16).toString('hex')}`;

    // Store state → importId mapping for the callback
    _pendingStates.set(state, { importId, firebaseUid });
    // Auto-clean after 10 minutes
    setTimeout(() => _pendingStates.delete(state), 10 * 60 * 1000);

    const authUrl = youtubeService.getAuthUrl(state);

    return res.json({ success: true, authUrl, importId });
  } catch (err) {
    console.error('[YT Import] auth-url error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
});

// ─── GET /api/youtube-import/callback ────────────────────────────────────────
// Google redirects here after user approves.
// No Firebase auth here — this is the OAuth callback.

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('[YT Import] Google OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/library?yt_import_error=${encodeURIComponent(error)}`);
  }

  if (!state || !_pendingStates.has(state)) {
    console.error('[YT Import] Invalid or expired state:', state);
    return res.redirect(`${FRONTEND_URL}/library?yt_import_error=invalid_state`);
  }

  const { importId, firebaseUid } = _pendingStates.get(state);
  _pendingStates.delete(state);

  try {
    const tokenData = await youtubeService.exchangeCodeForToken(code);
    const { access_token, refresh_token, expires_in } = tokenData;

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await sessionStore.createSession({
      importId,
      firebaseUid,
      accessToken:  access_token,
      refreshToken: refresh_token || null,
      expiresAt,
    });

    console.log(`[YT Import] OAuth success for uid: ${firebaseUid}, importId: ${importId}`);

    // Redirect frontend to the Library page (where PlaylistImportDialog lives) with the importId
    return res.redirect(`${FRONTEND_URL}/library?yt_import_id=${importId}`);
  } catch (err) {
    console.error('[YT Import] Token exchange failed:', err.message);
    return res.redirect(`${FRONTEND_URL}/library?yt_import_error=token_exchange_failed`);
  }
});

// ─── POST /api/youtube-import/playlists ──────────────────────────────────────
// Returns the authenticated user's YouTube playlists.
// Body: { importId }

router.post('/playlists', verifyUser, async (req, res) => {
  const { importId } = req.body;
  const firebaseUid  = req.user.uid;

  if (!validateImportId(importId)) {
    return res.status(400).json({ success: false, error: 'Invalid importId' });
  }

  try {
    let session = await sessionStore.getSession(importId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Import session not found. Please reconnect YouTube.' });
    }
    if (session.firebaseUid !== firebaseUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Refresh token if expired
    let accessToken = session.accessToken;
    if (youtubeService.isTokenExpired(session.expiresAt)) {
      if (!session.refreshToken) {
        return res.status(401).json({ success: false, error: 'Session expired. Please reconnect YouTube.' });
      }
      const refreshed = await youtubeService.refreshAccessToken(session.refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await sessionStore.updateSession(importId, { accessToken, expiresAt: newExpiresAt });
    }

    const playlists = await youtubeService.listUserPlaylists(accessToken);
    return res.json({ success: true, playlists });
  } catch (err) {
    console.error('[YT Import] playlists error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
  }
});

// ─── POST /api/youtube-import/start ──────────────────────────────────────────
// Starts the import job asynchronously.
// Returns immediately with { importId } — frontend polls /progress.
// Body: { importId, playlistId, playlistTitle }

router.post('/start', verifyUser, async (req, res) => {
  const { importId, playlistId, playlistTitle, options: rawOptions } = req.body;
  const firebaseUid = req.user.uid;

  // Sanitize import options — preserve source playlist by default (removeDuplicates OFF)
  const importOptions = {
    skipKaraoke:      rawOptions && rawOptions.skipKaraoke      === false ? false : true,
    removeDuplicates: rawOptions && rawOptions.removeDuplicates === true  ? true  : false,
    strictMode:       rawOptions && rawOptions.strictMode        === true  ? true  : false,
  };

  if (!validateImportId(importId)) {
    return res.status(400).json({ success: false, error: 'Invalid importId' });
  }
  if (!validatePlaylistId(playlistId)) {
    return res.status(400).json({ success: false, error: 'Invalid playlistId' });
  }

  try {
    let session = await sessionStore.getSession(importId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Import session not found. Please reconnect YouTube.' });
    }
    if (session.firebaseUid !== firebaseUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (session.status === 'running') {
      return res.status(409).json({ success: false, error: 'Import already in progress.' });
    }

    // Refresh token if needed
    let accessToken = session.accessToken;
    if (youtubeService.isTokenExpired(session.expiresAt)) {
      if (!session.refreshToken) {
        return res.status(401).json({ success: false, error: 'Session expired. Please reconnect YouTube.' });
      }
      const refreshed = await youtubeService.refreshAccessToken(session.refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await sessionStore.updateSession(importId, { accessToken, expiresAt: newExpiresAt });
    }

    // Respond immediately — processing is async to avoid Railway 30s timeout
    res.json({ success: true, importId, status: 'started', message: 'Import started. Poll /progress for updates.' });

    // ── Run import asynchronously ─────────────────────────────────────────────
    setImmediate(async () => {
      try {
        console.log(`[YT Import] Starting import for playlist: ${playlistId} | importId: ${importId}`);

        // Fetch all items from YouTube
        const ytItems = await youtubeService.fetchAllPlaylistItems(accessToken, playlistId);

        if (!ytItems.length) {
          await sessionStore.setError(importId, 'Playlist appears to be empty or private.');
          return;
        }

        // Run matching
        await importMatcher.importPlaylist(importId, accessToken, playlistId, playlistTitle || playlistId, ytItems, importOptions);
      } catch (err) {
        console.error('[YT Import] Background import error:', err.message);
        await sessionStore.setError(importId, err.message);
      }
    });
  } catch (err) {
    console.error('[YT Import] start error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to start import' });
  }
});

// ─── GET /api/youtube-import/progress/:importId ──────────────────────────────
// Poll this every 1.5s to get live progress and final result.

router.get('/progress/:importId', verifyUser, async (req, res) => {
  const { importId } = req.params;
  const firebaseUid  = req.user.uid;

  if (!validateImportId(importId)) {
    return res.status(400).json({ success: false, error: 'Invalid importId' });
  }

  try {
    const session = await sessionStore.getSession(importId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Import session not found' });
    }
    if (session.firebaseUid !== firebaseUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    return res.json({
      success:  true,
      importId,
      status:   session.status,
      progress: session.progress,
      result:   session.status === 'done'  ? session.result : null,
      error:    session.status === 'error' ? session.errorMessage : null,
    });
  } catch (err) {
    console.error('[YT Import] progress error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// ─── POST /api/youtube-import/retry ──────────────────────────────────────────
// Retry unmatched songs from a completed import.
// Uses lower confidence threshold + alternate search strategies.
// Body: { importId }

router.post('/retry', verifyUser, async (req, res) => {
  const { importId } = req.body;
  const firebaseUid  = req.user.uid;

  if (!validateImportId(importId)) {
    return res.status(400).json({ success: false, error: 'Invalid importId' });
  }

  try {
    const session = await sessionStore.getSession(importId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Import session not found' });
    }
    if (session.firebaseUid !== firebaseUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (session.status !== 'done') {
      return res.status(400).json({ success: false, error: 'Import has not completed yet. Cannot retry.' });
    }
    if (!session.result || !session.result.unmatched?.length) {
      return res.status(400).json({ success: false, error: 'No unmatched songs to retry.' });
    }

    const { unmatched: unmatchedItems } = session.result;

    // Run retry synchronously — retry set is small (usually < 50 items)
    const retryResult = await importMatcher.retryUnmatched(importId, unmatchedItems);

    // Merge retry results back into the stored session result
    if (session.result && retryResult.newlyMatched.length > 0) {
      const updatedResult = {
        ...session.result,
        matched:       [...session.result.matched, ...retryResult.newlyMatched],
        unmatched:     retryResult.stillUnmatched,
        matchedCount:  session.result.matched.length + retryResult.newlyMatched.length,
        unmatchedCount:retryResult.stillUnmatched.length,
        lastRetryAt:   new Date().toISOString(),
      };
      await sessionStore.setResult(importId, updatedResult);
    }

    return res.json({
      success:       true,
      importId,
      retriedCount:  retryResult.retriedCount,
      newMatchCount: retryResult.newMatchCount,
      newlyMatched:  retryResult.newlyMatched,
      stillUnmatched:retryResult.stillUnmatched,
    });
  } catch (err) {
    console.error('[YT Import] retry error:', err.message);
    return res.status(500).json({ success: false, error: 'Retry failed: ' + err.message });
  }
});

module.exports = router;
