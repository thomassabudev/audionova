/**
 * YouTubeImportFlow.tsx
 *
 * Complete YouTube → JioSaavn playlist import UI.
 *
 * States:
 *   IDLE            → "Connect YouTube" button
 *   AUTH_REDIRECT   → Redirecting to Google
 *   PLAYLIST_SELECT → Shows user's playlists to choose from
 *   IMPORTING       → Animated progress bar + live counters
 *   DONE            → Summary: matched/unmatched, confidence badges, play button
 *   RETRY           → Retrying unmatched songs
 *   ERROR           → Error message + reconnect button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Youtube, Music2, Loader2, CheckCircle2, XCircle, RefreshCw, Play, List, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import toast from 'react-hot-toast';
import * as ytService from '../services/youtubeImportService';
import type { YTPlaylist, ImportResult, ImportProgress } from '../services/youtubeImportService';

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowState =
  | 'IDLE'
  | 'AUTH_REDIRECT'
  | 'PLAYLIST_SELECT'
  | 'IMPORTING'
  | 'DONE'
  | 'RETRY'
  | 'ERROR';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'text-emerald-400 bg-emerald-400/10' :
                pct >= 60 ? 'text-yellow-400 bg-yellow-400/10' :
                            'text-orange-400 bg-orange-400/10';
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
      {pct}%
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PlaylistCard({
  playlist,
  onSelect,
  loading,
}: {
  playlist: YTPlaylist;
  onSelect: (pl: YTPlaylist) => void;
  loading: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 cursor-pointer transition-all group"
      onClick={() => !loading && onSelect(playlist)}
    >
      {playlist.thumbnailUrl ? (
        <img
          src={playlist.thumbnailUrl}
          alt={playlist.title}
          className="w-10 h-10 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
          <List className="w-5 h-5 text-white/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{playlist.title}</p>
        <p className="text-xs text-white/50">{playlist.itemCount} songs</p>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 text-red-400 animate-spin flex-shrink-0" />
      ) : (
        <Play className="w-4 h-4 text-white/30 group-hover:text-red-400 flex-shrink-0 transition-colors" />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const YouTubeImportFlow: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { getAuthToken, user } = useAuth();
  const { savePlaylist, setQueue } = useMusic();

  const [flowState, setFlowState]         = useState<FlowState>('IDLE');
  const [importId, setImportId]           = useState<string | null>(null);
  const [playlists, setPlaylists]         = useState<YTPlaylist[]>([]);
  const [selectedPl, setSelectedPl]       = useState<YTPlaylist | null>(null);
  const [progress, setProgress]           = useState<ImportProgress>({ processed: 0, total: 0, matchedCount: 0, unmatchedCount: 0 });
  const [result, setResult]               = useState<ImportResult | null>(null);
  const [error, setError]                 = useState<string>('');
  const [showMatched, setShowMatched]     = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(true);
  const [selectingPl, setSelectingPl]     = useState<string | null>(null); // playlist id being selected
  const [retryLoading, setRetryLoading]   = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // ── Read importId from URL after OAuth callback ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ytImportId = params.get('yt_import_id');
    const ytError    = params.get('yt_import_error');

    if (ytImportId) {
      setImportId(ytImportId);
      setFlowState('PLAYLIST_SELECT');
      // Clean URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete('yt_import_id');
      window.history.replaceState({}, '', clean.toString());
    } else if (ytError) {
      setError(decodeURIComponent(ytError));
      setFlowState('ERROR');
      const clean = new URL(window.location.href);
      clean.searchParams.delete('yt_import_error');
      window.history.replaceState({}, '', clean.toString());
    }
  }, []);

  // ── Load playlists when entering PLAYLIST_SELECT ──────────────────────────
  useEffect(() => {
    if (flowState !== 'PLAYLIST_SELECT' || !importId) return;

    let cancelled = false;
    setPlaylistsLoading(true);

    // 15-second timeout — if backend doesn't respond, show error
    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setError('Playlist loading timed out. The server may be starting up — please try reconnecting.');
        setFlowState('ERROR');
      }
    }, 15000);

    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Not authenticated. Please sign in to AudioNova first.');
        const pls = await ytService.getUserPlaylists(importId, token);
        if (!cancelled) {
          clearTimeout(timeout);
          setPlaylists(pls);
          setPlaylistsLoading(false);
          // If API returned empty list, show a helpful message instead of infinite spinner
          if (pls.length === 0) {
            setError('No playlists found on this YouTube account. Make sure you have public or saved playlists in YouTube.');
            setFlowState('ERROR');
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          clearTimeout(timeout);
          setPlaylistsLoading(false);
          setError(err.message || 'Failed to load playlists. Please reconnect YouTube.');
          setFlowState('ERROR');
        }
      }
    })();

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [flowState, importId, getAuthToken]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConnectYouTube = useCallback(async () => {
    try {
      setFlowState('AUTH_REDIRECT');
      const token = await getAuthToken();
      if (!token) throw new Error('Please sign in to AudioNova first.');
      const { authUrl, importId: newId } = await ytService.getAuthUrl(token);
      setImportId(newId);
      // Redirect to Google
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to start authentication');
      setFlowState('ERROR');
    }
  }, [getAuthToken]);

  const handleSelectPlaylist = useCallback(async (playlist: YTPlaylist) => {
    if (!importId) return;
    setSelectedPl(playlist);
    setSelectingPl(playlist.id);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      await ytService.startImport(importId, playlist.id, playlist.title, token);
      setFlowState('IMPORTING');
      setProgress({ processed: 0, total: playlist.itemCount, matchedCount: 0, unmatchedCount: 0 });

      // Poll for completion
      const finalResult = await ytService.waitForCompletion(
        importId,
        token,
        (prog) => setProgress(prog)
      );

      setResult(finalResult);
      setFlowState('DONE');
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setFlowState('ERROR');
    } finally {
      setSelectingPl(null);
    }
  }, [importId, getAuthToken]);

  const handlePlayResult = useCallback(() => {
    if (!result) return;
    // Cast to any: MatchedSong.song shape is compatible with MusicContext Song at runtime
    const songs = result.matched.map(m => m.song as any);
    setQueue(songs);
    toast.success(`Playing ${songs.length} songs from "${result.playlistName}"`);
    onClose?.();
  }, [result, setQueue, onClose]);

  const handleSaveResult = useCallback(() => {
    if (!result) return;
    // Cast to any: MatchedSong.song shape is compatible with MusicContext Song at runtime
    const songs = result.matched.map(m => m.song as any);
    savePlaylist({
      id:     `yt-${result.playlistId}-${Date.now()}`,
      name:   result.playlistName,
      tracks: songs,
      image:  songs[0]?.image,
    });
    toast.success(`"${result.playlistName}" saved — ${songs.length} songs`);
  }, [result, savePlaylist]);

  const handleRetry = useCallback(async () => {
    if (!importId || !result?.unmatched?.length) return;
    setRetryLoading(true);
    setFlowState('RETRY');

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const retryResult = await ytService.retryUnmatched(importId, token);

      if (retryResult.newMatchCount > 0) {
        // Merge retry results into existing result
        setResult(prev => prev ? {
          ...prev,
          matched:       [...prev.matched, ...retryResult.newlyMatched],
          unmatched:     retryResult.stillUnmatched,
          matchedCount:  prev.matchedCount + retryResult.newMatchCount,
          unmatchedCount:retryResult.stillUnmatched.length,
        } : prev);

        toast.success(`Found ${retryResult.newMatchCount} more songs! (${retryResult.stillUnmatched.length} still not found)`);
      } else {
        toast(`No additional matches found on JioSaavn.`);
      }
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`);
    } finally {
      setRetryLoading(false);
      setFlowState('DONE');
    }
  }, [importId, result, getAuthToken]);

  const handleReset = () => {
    setFlowState('IDLE');
    setImportId(null);
    setPlaylists([]);
    setSelectedPl(null);
    setProgress({ processed: 0, total: 0, matchedCount: 0, unmatchedCount: 0 });
    setResult(null);
    setError('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // IDLE / AUTH_REDIRECT
  if (flowState === 'IDLE' || flowState === 'AUTH_REDIRECT') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="text-xs font-semibold text-white">YouTube Playlist Import</span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          Import any of your YouTube playlists and we'll match every song to JioSaavn automatically.
        </p>
        <Button
          onClick={handleConnectYouTube}
          disabled={flowState === 'AUTH_REDIRECT' || !user}
          className="w-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 transition-all"
        >
          {flowState === 'AUTH_REDIRECT' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting to Google…
            </>
          ) : (
            <>
              <Youtube className="w-4 h-4" />
              Connect YouTube & Import
            </>
          )}
        </Button>
        {!user && (
          <p className="text-[10px] text-yellow-500/80 text-center">Sign in to AudioNova first</p>
        )}
      </div>
    );
  }

  // PLAYLIST_SELECT
  if (flowState === 'PLAYLIST_SELECT') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="text-xs font-semibold text-white">Choose a Playlist</span>
        </div>
        {playlistsLoading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-red-400" />
            <span className="text-xs text-white/60">Loading your playlists…</span>
            <span className="text-[10px] text-white/30">This may take a moment if the server is starting up</span>
          </div>
        ) : playlists.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {playlists.map(pl => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                onSelect={handleSelectPlaylist}
                loading={selectingPl === pl.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-white/50 text-center py-4">
            No playlists found on this YouTube account.
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleReset} className="w-full text-xs text-white/40">
          Disconnect
        </Button>
      </div>
    );
  }

  // IMPORTING
  if (flowState === 'IMPORTING') {
    const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
          <span className="text-xs font-semibold text-white">Importing "{selectedPl?.title}"</span>
        </div>

        <ProgressBar value={progress.processed} max={progress.total || 1} />

        <div className="flex justify-between text-[10px] text-white/50">
          <span>{progress.processed} / {progress.total} songs processed</span>
          <span>{pct}%</span>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-400/10 rounded-lg p-2 text-center">
            <p className="text-emerald-400 font-bold text-lg leading-tight">{progress.matchedCount}</p>
            <p className="text-[10px] text-white/50">matched</p>
          </div>
          <div className="flex-1 bg-red-400/10 rounded-lg p-2 text-center">
            <p className="text-red-400 font-bold text-lg leading-tight">{progress.unmatchedCount}</p>
            <p className="text-[10px] text-white/50">not found</p>
          </div>
        </div>

        <p className="text-[10px] text-white/30 text-center">
          Matching songs with JioSaavn… this may take a minute.
        </p>
      </div>
    );
  }

  // RETRY (in-progress)
  if (flowState === 'RETRY') {
    return (
      <div className="space-y-3 py-4 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-yellow-400 mx-auto" />
        <p className="text-sm font-medium text-white">Retrying unmatched songs…</p>
        <p className="text-xs text-white/50">Using alternate search strategies with a lower threshold.</p>
      </div>
    );
  }

  // DONE
  if (flowState === 'DONE' && result) {
    const successRate = result.total > 0 ? Math.round((result.matchedCount / result.total) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Summary Header */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">Import Complete</span>
          <span className="ml-auto text-[10px] text-white/40">{successRate}% match rate</span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p className="text-white font-bold text-lg leading-tight">{result.total}</p>
            <p className="text-[10px] text-white/50">total</p>
          </div>
          <div className="bg-emerald-400/10 rounded-lg p-2 text-center">
            <p className="text-emerald-400 font-bold text-lg leading-tight">{result.matchedCount}</p>
            <p className="text-[10px] text-white/50">imported</p>
          </div>
          <div className="bg-red-400/10 rounded-lg p-2 text-center">
            <p className="text-red-400 font-bold text-lg leading-tight">{result.unmatchedCount}</p>
            <p className="text-[10px] text-white/50">not found</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handlePlayResult}
            disabled={result.matchedCount === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3" /> Play Now
          </Button>
          <Button
            onClick={handleSaveResult}
            disabled={result.matchedCount === 0}
            variant="secondary"
            className="flex-1 text-xs"
          >
            Save to Library
          </Button>
        </div>

        {/* Retry Unmatched */}
        {result.unmatchedCount > 0 && (
          <Button
            onClick={handleRetry}
            disabled={retryLoading}
            variant="outline"
            size="sm"
            className="w-full text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-400/10 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Retry {result.unmatchedCount} unmatched song{result.unmatchedCount !== 1 ? 's' : ''}
          </Button>
        )}

        {/* Matched songs (collapsible) */}
        {result.matchedCount > 0 && (
          <div>
            <button
              onClick={() => setShowMatched(v => !v)}
              className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors w-full"
            >
              <Music2 className="w-3 h-3" />
              {showMatched ? 'Hide' : 'Show'} {result.matchedCount} matched songs
              {showMatched ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {showMatched && (
              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1">
                {result.matched.slice(0, 100).map((m, i) => (
                  <div key={`${m.song.id}-${i}`} className="flex items-center gap-2 py-1 text-[11px]">
                    <span className="text-white/30 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 truncate">{m.song.name}</p>
                      <p className="text-white/40 truncate">{m.song.primaryArtists}</p>
                    </div>
                    <ConfidenceBadge confidence={m.confidence} />
                  </div>
                ))}
                {result.matched.length > 100 && (
                  <p className="text-[10px] text-white/30 text-center py-1">
                    + {result.matched.length - 100} more songs
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Unmatched songs (collapsible) */}
        {result.unmatchedCount > 0 && (
          <div>
            <button
              onClick={() => setShowUnmatched(v => !v)}
              className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors w-full"
            >
              <XCircle className="w-3 h-3 text-red-400" />
              {showUnmatched ? 'Hide' : 'Show'} {result.unmatchedCount} not found
              {showUnmatched ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {showUnmatched && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                {result.unmatched.map((u, i) => (
                  <div key={`unmatched-${i}`} className="flex items-start gap-2 py-1 text-[11px]">
                    <span className="text-white/20 w-5 text-right shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/60 truncate">{u.title}</p>
                      <p className="text-white/30 text-[10px]">{u.reason === 'low_confidence' ? `Low match (${Math.round(u.bestScore * 100)}%)` : 'Not found'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Start over */}
        <button
          onClick={handleReset}
          className="text-[10px] text-white/20 hover:text-white/50 transition-colors w-full text-center mt-1"
        >
          Import another playlist
        </button>
      </div>
    );
  }

  // ERROR
  if (flowState === 'ERROR') {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-red-400">Import Failed</span>
        </div>
        <p className="text-xs text-white/60 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          {error || 'An unexpected error occurred.'}
        </p>
        <Button onClick={handleReset} variant="outline" size="sm" className="w-full text-xs">
          Try Again
        </Button>
      </div>
    );
  }

  return null;
};

export default YouTubeImportFlow;
