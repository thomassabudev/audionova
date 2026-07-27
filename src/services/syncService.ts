const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5009';

interface Song {
  id: string;
  name: string;
  primaryArtists: string;
  image: string[] | string | null;
  duration: number;
  url: string;
  downloadUrl?: Array<{ quality?: string; link: string }>;
  album?: string;
  year?: string;
  language?: string;
  playCount?: number;
  releaseDate?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Song[];
  currentIndex?: number;
  language?: string;
}

export async function fetchLikedSongs(token: string): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/api/sync/liked-songs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as Song[]) : [];
  } catch {
    return [];
  }
}

export async function pushLikedSongs(token: string, songs: Song[]): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/sync/liked-songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs }),
    });
  } catch {
    // Silent fallback
  }
}

export async function fetchPlaylists(token: string): Promise<Playlist[]> {
  try {
    const res = await fetch(`${API_BASE}/api/sync/playlists`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as Playlist[]) : [];
  } catch {
    return [];
  }
}

export async function pushPlaylists(token: string, playlists: Playlist[]): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/sync/playlists`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlists }),
    });
  } catch {
    // Silent fallback
  }
}
