import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchFollowedArtists,
  followArtist,
  unfollowArtist,
  fetchRecentlyPlayed,
  pushRecentPlay,
  type ArtistFollow,
  type RecentPlay,
} from '../services/socialService';

interface SocialContextType {
  followedArtists: ArtistFollow[];
  recentlyPlayed: RecentPlay[];
  isFollowingArtist: (artistId: string) => boolean;
  toggleFollowArtist: (artist: ArtistFollow) => Promise<void>;
  addToHistory: (play: Omit<RecentPlay, 'playedAt'>) => void;
  socialLoading: boolean;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const useSocial = () => {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
};

const LS_FOLLOWS_KEY = 'social_followed_artists';
const LS_HISTORY_KEY = 'social_play_history';

function loadLocalFollows(): ArtistFollow[] {
  try {
    const raw = localStorage.getItem(LS_FOLLOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadLocalHistory(): RecentPlay[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAuthToken } = useAuth();

  const [followedArtists, setFollowedArtists] = useState<ArtistFollow[]>(loadLocalFollows);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentPlay[]>(loadLocalHistory);
  const [socialLoading, setSocialLoading] = useState(false);

  // ── All useCallbacks FIRST — before any useEffect that references them ────

  const isFollowingArtist = useCallback(
    (artistId: string) => followedArtists.some(f => f.artistId === artistId),
    [followedArtists]
  );

  const addToHistory = useCallback(
    (play: Omit<RecentPlay, 'playedAt'>) => {
      const entry: RecentPlay = { ...play, playedAt: new Date().toISOString() };
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(p => p.songId !== play.songId);
        return [entry, ...filtered].slice(0, 50);
      });
      // Fire-and-forget backend sync
      getAuthToken()
        .then(token => { if (token) pushRecentPlay(token, play); })
        .catch(() => {});
    },
    [getAuthToken]
  );

  const toggleFollowArtist = useCallback(
    async (artist: ArtistFollow) => {
      const alreadyFollowing = followedArtists.some(f => f.artistId === artist.artistId);

      // Optimistic update
      if (alreadyFollowing) {
        setFollowedArtists(prev => prev.filter(f => f.artistId !== artist.artistId));
      } else {
        setFollowedArtists(prev => [{ ...artist, followedAt: new Date().toISOString() }, ...prev]);
      }

      // Sync to backend
      try {
        const token = await getAuthToken();
        if (!token) return;
        if (alreadyFollowing) {
          await unfollowArtist(token, artist.artistId);
        } else {
          await followArtist(token, artist);
        }
      } catch {
        // Revert on error
        if (alreadyFollowing) {
          setFollowedArtists(prev => [{ ...artist }, ...prev]);
        } else {
          setFollowedArtists(prev => prev.filter(f => f.artistId !== artist.artistId));
        }
      }
    },
    [followedArtists, getAuthToken]
  );

  // ── useEffects AFTER all callbacks are declared ───────────────────────────

  // Persist follows to localStorage
  useEffect(() => {
    localStorage.setItem(LS_FOLLOWS_KEY, JSON.stringify(followedArtists));
  }, [followedArtists]);

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  // Listen for song-played events dispatched by MusicContext
  useEffect(() => {
    const handleSongPlayed = (e: Event) => {
      const detail = (e as CustomEvent).detail as Omit<RecentPlay, 'playedAt'>;
      if (detail?.songId) addToHistory(detail);
    };
    window.addEventListener('audionova:songPlayed', handleSongPlayed);
    return () => window.removeEventListener('audionova:songPlayed', handleSongPlayed);
  }, [addToHistory]);

  // On login: sync from backend
  useEffect(() => {
    if (!user) return;

    const syncFromBackend = async () => {
      setSocialLoading(true);
      try {
        const token = await getAuthToken();
        if (!token) return;

        const [remoteFollows, remoteHistory] = await Promise.all([
          fetchFollowedArtists(token),
          fetchRecentlyPlayed(token),
        ]);

        if (remoteFollows.length > 0) setFollowedArtists(remoteFollows);
        if (remoteHistory.length > 0) setRecentlyPlayed(remoteHistory);
      } catch {
        // Silent fail — localStorage stays as fallback
      } finally {
        setSocialLoading(false);
      }
    };

    syncFromBackend();
  }, [user]);

  return (
    <SocialContext.Provider
      value={{
        followedArtists,
        recentlyPlayed,
        isFollowingArtist,
        toggleFollowArtist,
        addToHistory,
        socialLoading,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};
