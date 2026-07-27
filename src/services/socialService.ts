const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5009';

export interface ArtistFollow {
  artistId: string;
  artistName: string;
  artistImage: string;
  followedAt?: string;
}

export interface RecentPlay {
  songId: string;
  songName: string;
  artistName: string;
  language: string;
  playedAt?: string;
}

// ─── Follow Artists ────────────────────────────────────────────────────────────

export async function fetchFollowedArtists(token: string): Promise<ArtistFollow[]> {
  try {
    const res = await fetch(`${API_BASE}/api/social/follow/artists`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? (data.data as ArtistFollow[]) : [];
  } catch {
    return [];
  }
}

export async function followArtist(token: string, artist: ArtistFollow): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/social/follow/artists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...artist, action: 'follow' }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function unfollowArtist(token: string, artistId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/social/follow/artists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ artistId, artistName: '', action: 'unfollow' }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// ─── Play History ──────────────────────────────────────────────────────────────

export async function fetchRecentlyPlayed(token: string): Promise<RecentPlay[]> {
  try {
    const res = await fetch(`${API_BASE}/api/social/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? (data.data as RecentPlay[]) : [];
  } catch {
    return [];
  }
}

export async function pushRecentPlay(token: string, play: Omit<RecentPlay, 'playedAt'>): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/social/history`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(play),
    });
  } catch {
    // Silent fail — history tracking should never block playback
  }
}
