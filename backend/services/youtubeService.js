/**
 * youtubeService.js
 *
 * YouTube Data API v3 wrapper.
 * Handles OAuth Authorization Code Flow, token exchange, refresh,
 * playlist listing, and fully-paginated playlist item fetching.
 */

const axios = require('axios');

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const CALLBACK_URL  = process.env.YOUTUBE_CALLBACK_URL;
const SCOPE         = 'https://www.googleapis.com/auth/youtube.readonly';
const YT_BASE       = 'https://www.googleapis.com/youtube/v3';
const TOKEN_URL     = 'https://oauth2.googleapis.com/token';
const AUTH_URL      = 'https://accounts.google.com/o/oauth2/v2/auth';

const MAX_PLAYLIST_ITEMS = 2000; // hard safety cap

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Build Google OAuth authorization URL.
 * @param {string} state  CSRF state token
 * @returns {string}      Full authorization URL
 */
function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  CALLBACK_URL,
    response_type: 'code',
    scope:         SCOPE,
    access_type:   'offline',
    prompt:        'consent',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 * @param {string} code  Authorization code from Google callback
 * @returns {{ access_token, refresh_token, expires_in, token_type }}
 */
async function exchangeCodeForToken(code) {
  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  CALLBACK_URL,
      grant_type:    'authorization_code',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
}

/**
 * Use refresh_token to get a new access_token.
 * @param {string} refreshToken
 * @returns {{ access_token, expires_in }}
 */
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data; // { access_token, expires_in, token_type, scope }
}

// ─── YouTube Data API ─────────────────────────────────────────────────────────

/**
 * List the authenticated user's playlists (up to 50).
 * @param {string} accessToken
 * @returns {Array<{ id, title, itemCount, thumbnailUrl }>}
 */
async function listUserPlaylists(accessToken) {
  const response = await axios.get(`${YT_BASE}/playlists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      part:       'snippet,contentDetails',
      mine:       true,
      maxResults: 50,
    },
  });

  return (response.data.items || []).map(pl => ({
    id:           pl.id,
    title:        pl.snippet?.title || 'Untitled Playlist',
    itemCount:    pl.contentDetails?.itemCount || 0,
    thumbnailUrl: pl.snippet?.thumbnails?.medium?.url ||
                  pl.snippet?.thumbnails?.default?.url || null,
  }));
}

/**
 * Fetch ALL items from a YouTube playlist using pagination.
 * Stops at MAX_PLAYLIST_ITEMS (safety cap).
 *
 * @param {string} accessToken
 * @param {string} playlistId
 * @returns {Array<{ title, channelTitle, videoId, position }>}
 */
async function fetchAllPlaylistItems(accessToken, playlistId) {
  const items = [];
  let pageToken = undefined;
  let pageCount = 0;

  do {
    pageCount++;
    const params = {
      part:       'snippet,contentDetails',
      playlistId,
      maxResults: 50,
    };
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get(`${YT_BASE}/playlistItems`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
      timeout: 15000,
    });

    const page = response.data;
    const pageItems = (page.items || []).map(item => ({
      title:        item.snippet?.title || '',
      channelTitle: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || '',
      videoId:      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '',
      position:     item.snippet?.position ?? items.length,
    }));

    items.push(...pageItems);
    pageToken = page.nextPageToken;

    // Safety cap: stop if we've hit the maximum
    if (items.length >= MAX_PLAYLIST_ITEMS) {
      console.warn(`[YouTubeService] Reached max item cap (${MAX_PLAYLIST_ITEMS}) for playlist: ${playlistId}`);
      break;
    }
  } while (pageToken);

  console.log(`[YouTubeService] Fetched ${items.length} items across ${pageCount} page(s) for playlist: ${playlistId}`);
  return items;
}

/**
 * Check if an access token is expired (or about to expire in the next 60s).
 * @param {Date} expiresAt
 * @returns {boolean}
 */
function isTokenExpired(expiresAt) {
  return Date.now() >= (new Date(expiresAt).getTime() - 60 * 1000);
}

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  listUserPlaylists,
  fetchAllPlaylistItems,
  isTokenExpired,
};
