/**
 * youtubeImportService.ts
 *
 * Frontend API client for YouTube → JioSaavn playlist import.
 *
 * All calls go through the AudioNova backend — the YouTube access token
 * is NEVER exposed to the frontend. The frontend only handles an opaque importId.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5009';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface YTPlaylist {
  id:           string;
  title:        string;
  itemCount:    number;
  thumbnailUrl: string | null;
}

export interface MatchedSong {
  type:       'matched';
  song: {
    id:             string;
    name:           string;
    primaryArtists: string;
    album:          { id: string; name: string; url: string };
    duration:       number;
    language:       string;
    image:          Array<{ quality: string; link: string }>;
    downloadUrl:    Array<{ quality: string; link: string }>;
    [key: string]:  any;
  };
  confidence: number;
  titleSim:   number;
  artistSim:  number;
  queryUsed:  string;
  queryTier:  number;
  ytTitle:    string;
  ytChannel:  string;
  videoId:    string;
}

export interface UnmatchedSong {
  type:       'unmatched';
  title:      string;
  artist:     string;
  cleanTitle: string;
  videoId:    string;
  reason:     'no_match' | 'low_confidence' | 'error';
  bestScore:  number;
  error:      string | null;
}

export interface ImportProgress {
  processed:     number;
  total:         number;
  matchedCount:  number;
  unmatchedCount:number;
}

export interface ImportResult {
  playlistName:   string;
  playlistId:     string;
  total:          number;
  matchedCount:   number;
  unmatchedCount: number;
  matched:        MatchedSong[];
  unmatched:      UnmatchedSong[];
  concurrencyUsed:number;
  importedAt:     string;
}

export interface RetryResult {
  retriedCount:   number;
  newMatchCount:  number;
  newlyMatched:   MatchedSong[];
  stillUnmatched: UnmatchedSong[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit,
  token: string
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Step 1 — Get the Google OAuth URL to redirect the user.
 * Returns { authUrl, importId }
 */
export async function getAuthUrl(token: string): Promise<{ authUrl: string; importId: string }> {
  const data = await apiFetch<{ authUrl: string; importId: string; success: boolean }>(
    '/api/youtube-import/auth-url',
    { method: 'GET' },
    token
  );
  return { authUrl: data.authUrl, importId: data.importId };
}

/**
 * Step 2 — List the user's YouTube playlists (after OAuth).
 */
export async function getUserPlaylists(importId: string, token: string): Promise<YTPlaylist[]> {
  const data = await apiFetch<{ playlists: YTPlaylist[]; success: boolean }>(
    '/api/youtube-import/playlists',
    { method: 'POST', body: JSON.stringify({ importId }) },
    token
  );
  return data.playlists;
}

/**
 * Step 3 — Start the import job (returns immediately, process is async).
 */
export async function startImport(
  importId: string,
  playlistId: string,
  playlistTitle: string,
  token: string
): Promise<{ importId: string; status: string }> {
  const data = await apiFetch<{ importId: string; status: string; success: boolean }>(
    '/api/youtube-import/start',
    { method: 'POST', body: JSON.stringify({ importId, playlistId, playlistTitle }) },
    token
  );
  return { importId: data.importId, status: data.status };
}

/**
 * Step 4 — Poll import progress.
 * Returns { status, progress, result, error }
 */
export async function pollProgress(importId: string, token: string): Promise<{
  status:   'pending' | 'running' | 'done' | 'error';
  progress: ImportProgress;
  result:   ImportResult | null;
  error:    string | null;
}> {
  const data = await apiFetch<any>(
    `/api/youtube-import/progress/${importId}`,
    { method: 'GET' },
    token
  );
  return {
    status:   data.status,
    progress: data.progress,
    result:   data.result,
    error:    data.error,
  };
}

/**
 * Convenience: Poll until done or error.
 * Calls onProgress on each poll iteration.
 */
export async function waitForCompletion(
  importId: string,
  token: string,
  onProgress: (progress: ImportProgress) => void,
  intervalMs = 1500
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const { status, progress, result, error } = await pollProgress(importId, token);

        if (progress) onProgress(progress);

        if (status === 'done' && result) {
          resolve(result);
        } else if (status === 'error') {
          reject(new Error(error || 'Import failed'));
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (err) {
        // Network hiccup — retry after a bit
        setTimeout(poll, intervalMs * 2);
      }
    };
    poll();
  });
}

/**
 * Retry unmatched songs from a completed import.
 */
export async function retryUnmatched(importId: string, token: string): Promise<RetryResult> {
  const data = await apiFetch<RetryResult & { success: boolean }>(
    '/api/youtube-import/retry',
    { method: 'POST', body: JSON.stringify({ importId }) },
    token
  );
  return {
    retriedCount:   data.retriedCount,
    newMatchCount:  data.newMatchCount,
    newlyMatched:   data.newlyMatched,
    stillUnmatched: data.stillUnmatched,
  };
}
