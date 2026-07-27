import { jiosaavnApi } from './jiosaavnApi';
import type { RecentPlay } from './socialService';

export interface Song {
  id: string;
  name: string;
  primaryArtists: string;
  image: Array<{ quality: string; link: string }> | string | null;
  duration: number;
  url: string;
  downloadUrl?: Array<{ quality?: string; link: string }>;
  album?: string | { id: string; name: string; url: string };
  year?: string;
  language?: string;
  playCount?: number;
  releaseDate?: string;
}

interface FrequencyMap {
  [key: string]: number;
}

// ── Language allow-list (only these 4 languages) ─────────────────────────────
const ALLOWED_LANGUAGES = new Set([
  'malayalam', 'english', 'hindi', 'tamil',
  'ml', 'en', 'hi', 'ta',
]);

// ── Devotional / Religious / Caste Keyword Exclusion List ─────────────────────
const DEVOTIONAL_KEYWORDS = [
  'bhakthi', 'bhakti', 'devotional', 'ayyappa', 'krishna', 'sivan', 'shiva',
  'vishnu', 'murugan', 'ganesha', 'ganpati', 'vinayagar', 'amman', 'devi',
  'bhajan', 'bhajans', 'stotram', 'stotra', 'shloka', 'sloka', 'kavacham',
  'suprabhatam', 'aarti', 'chalisa', 'mantra', 'chanting', 'prayer',
  'prarthana', 'namaz', 'qawwali', 'naat', 'islamic', 'nasheed', 'duas',
  'christian', 'gospel', 'carol', 'carols', 'church', 'praise', 'worship',
  'hymn', 'hymns', 'jesus', 'allah', 'bible', 'quran', 'kaaba', 'mecca',
  'temple', 'mandir', 'masjid', 'ramzan', 'eid', 'vishu', 'onam bhakthi',
  'subhanallah', 'alhamdulillah', 'harivarasanam', 'sharanm', 'saranam',
  'guruvayoor', 'shabarimala', 'sabarimala', 'chottanikkara', 'attukal',
  'mahadev', 'bholenath', 'bismillah', 'mappila pattu', 'mappilapattu',
  'caste', 'kavadi', 'karupatti', 'thevar', 'ezhava', 'brahmin', 'nair',
  'isai', 'bakthi', 'anmol', 'ram', 'sree', 'shree', 'swamy', 'swami',
  'ayyappan', 'hanuman', 'sita', 'radha', 'govinda', 'vithal', 'vithoba',
  'ganapati', 'saibaba', 'sai baba', 'buddha', 'churches', 'mosque',
  'namo', 'namah', 'shambho', 'shambhu', 'kedarnath', 'mahashivratri',
  'shivratri', 'har har', 'om namah', 'bhole', 'bholenath', 'trishul',
  'shankara', 'shankar', 'siva', 'rudra', 'rudram', 'tandav', 'tandava',
  'nayanar', 'alwar', 'vaishnav', 'shaiva', 'sanatan', 'bhagwan', 'deva',
  'jai shree', 'jai sri'
];

export function cleanSongTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function isDevotionalOrReligious(song: any): boolean {
  if (!song) return false;
  
  let imageUrls = '';
  if (typeof song.image === 'string') {
    imageUrls = song.image;
  } else if (Array.isArray(song.image)) {
    imageUrls = song.image.map((img: any) => typeof img === 'string' ? img : (img?.link || '')).join(' ');
  }

  const albumName = typeof song.album === 'string' ? song.album : (song.album?.name || '');
  const haystack = [
    song.name,
    albumName,
    song.primaryArtists,
    song.language,
    song.subtitle,
    imageUrls
  ].filter(Boolean).join(' ').toLowerCase();

  return DEVOTIONAL_KEYWORDS.some(kw => haystack.includes(kw));
}

function getSongReleaseYear(song: any): number {
  if (song.year) {
    const y = parseInt(String(song.year), 10);
    if (!isNaN(y) && y > 1900 && y < 2100) return y;
  }
  if (song.releaseDate) {
    const y = parseInt(String(song.releaseDate).substring(0, 4), 10);
    if (!isNaN(y) && y > 1900 && y < 2100) return y;
  }
  return 2024;
}

function isAllowedLanguage(lang: string | undefined): boolean {
  if (!lang) return false;
  return ALLOWED_LANGUAGES.has(lang.toLowerCase());
}

function countFrequencies(items: string[]): FrequencyMap {
  return items.reduce((acc, item) => {
    if (item) acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as FrequencyMap);
}

function topN(freq: FrequencyMap, n: number): string[] {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

function primaryArtist(artistStr: string): string {
  return (artistStr || '').split(/[,&]/)[0].trim();
}

/**
 * Fallback queries focused strictly on NEW 2025 - 2026 releases
 */
const FALLBACK_QUERIES = [
  'Malayalam new songs 2026 2025',
  'Malayalam latest movie songs 2026',
  'Malayalam romantic hit songs 2025',
  'Hindi latest songs 2026 2025',
  'Hindi bollywood hits 2025 2026',
  'Tamil new movie songs 2026',
  'Tamil hit songs 2025 2026',
  'English new pop songs 2026 2025',
  'Sushin Shyam latest songs 2026',
  'Anirudh Ravichander new songs 2026',
  'Arijit Singh latest songs 2026',
  'A R Rahman hits 2025 2026',
  'Gopi Sundar new songs 2025',
  'Shreya Ghoshal new songs 2026'
];

/**
 * Generate personalized "For You" recommendations prioritizing brand new 2025-2026 releases.
 */
export async function getRecommendations(
  likedSongs: Song[],
  recentlyPlayed: RecentPlay[],
  limit: number = 20
): Promise<Song[]> {
  try {
    // ── Step 1: Gather signals from liked/recent ──────────────────────────
    const likedArtists  = likedSongs.map(s => primaryArtist(s.primaryArtists || ''));
    const recentArtists = recentlyPlayed.map(p => primaryArtist(p.artistName || ''));

    // Weight recent plays double
    const allArtists = [...likedArtists, ...recentArtists, ...recentArtists];
    const artistFreq = countFrequencies(allArtists.filter(Boolean));
    const topArtists = topN(artistFreq, 4);

    // ── Step 2: Build queries for 2025-2026 latest releases ─────────────────
    const queries: string[] = [];

    if (topArtists.length > 0) {
      topArtists.forEach(artist => {
        if (artist) queries.push(`${artist} new songs 2026 2025`);
      });
      queries.push('Malayalam new songs 2026', 'Hindi latest songs 2026', 'Tamil new songs 2026', 'English new pop hits 2026');
    } else {
      queries.push(...FALLBACK_QUERIES);
    }

    // ── Step 3: Gather known song IDs & names for deduplication ────────────
    const alreadyKnownIds = new Set(likedSongs.map(s => s.id));
    const alreadyKnownNames = new Set(
      [...likedSongs.map(s => (s.name || '').toLowerCase()),
       ...recentlyPlayed.map(p => (p.songName || '').toLowerCase())]
    );

    const shuffledQueries = [...queries].sort(() => Math.random() - 0.5);

    const fetchPromises = shuffledQueries.slice(0, 8).map(q =>
      jiosaavnApi.searchSongs(q, 30).catch(() => [])
    );
    const results = await Promise.all(fetchPromises);

    // ── Step 4: Merge, filter, deduplicate (Movie & Artist diversity) ─────
    const seenIds        = new Set<string>();
    const seenNames      = new Set<string>();
    const seenAlbums     = new Set<string>(); // Strict 1 song per movie/album!
    const artistCounts   = new Map<string, number>(); // Max 2 per artist
    const recommendations: Song[] = [];

    for (const songs of results) {
      // Shuffle inner query results slightly for variety
      const shuffledInner = [...songs].sort(() => Math.random() - 0.5);

      for (const song of shuffledInner) {
        if (!song || !song.id || !song.name) continue;

        // ① Skip devotional / religious / caste songs
        if (isDevotionalOrReligious(song)) continue;

        // ② Skip already-liked / recently-played songs
        if (alreadyKnownIds.has(song.id)) continue;

        // ③ Skip songs the user already knows by name
        const nameLower = (song.name || '').toLowerCase();
        if (alreadyKnownNames.has(nameLower)) continue;

        // ④ Deduplicate by ID
        if (seenIds.has(song.id)) continue;

        // ⑤ Deduplicate by song name
        if (seenNames.has(nameLower)) continue;

        // ⑥ Movie/Album Diversity — MAX 1 SONG PER MOVIE / ALBUM
        const rawAlbum = typeof song.album === 'string' ? song.album : (song.album?.name || '');
        const albumClean = rawAlbum.toLowerCase().trim();
        if (albumClean && seenAlbums.has(albumClean)) continue;

        // ⑦ Language filter — only Malayalam, English, Hindi, Tamil
        if (!isAllowedLanguage(song.language)) continue;

        // ⑧ Max 2 songs per artist for diversity
        const artist = primaryArtist(song.primaryArtists || '').toLowerCase();
        if (artist) {
          const artistCount = artistCounts.get(artist) || 0;
          if (artistCount >= 2) continue;
          artistCounts.set(artist, artistCount + 1);
        }

        // Mark as seen
        seenIds.add(song.id);
        seenNames.add(nameLower);
        if (albumClean) seenAlbums.add(albumClean);

        recommendations.push({
          id: song.id,
          name: cleanSongTitle(song.name),
          primaryArtists: cleanSongTitle(song.primaryArtists || ''),
          image: song.image,
          duration: song.duration || 0,
          url: song.url || '',
          downloadUrl: song.downloadUrl,
          album: cleanSongTitle(rawAlbum),
          year: song.year,
          language: song.language,
          playCount: song.playCount,
          releaseDate: song.releaseDate,
        });

        if (recommendations.length >= limit * 3) break;
      }
      if (recommendations.length >= limit * 3) break;
    }

    // ⑨ Sort by release year descending so 2026/2025 brand new songs appear FIRST
    recommendations.sort((a, b) => getSongReleaseYear(b) - getSongReleaseYear(a));

    return recommendations.slice(0, limit);
  } catch (err) {
    console.error('[Recommendations] Error:', err);
    return [];
  }
}

/**
 * Get songs similar to a specific song (artist radio).
 */
export async function getSimilarSongs(song: Song, limit: number = 15): Promise<Song[]> {
  try {
    const artist = primaryArtist(song.primaryArtists || '');
    const query = artist ? `${artist} new songs 2026 2025` : `${song.name} 2026`;
    const results = await jiosaavnApi.searchSongs(query, limit + 10);

    const seenNames  = new Set<string>();
    const seenAlbums = new Set<string>();

    const filtered = results
      .filter(s => {
        if (!s || s.id === song.id) return false;
        if (isDevotionalOrReligious(s)) return false;
        if (!isAllowedLanguage(s.language)) return false;

        const n = (s.name || '').toLowerCase();
        if (seenNames.has(n)) return false;

        const rawAlbum = typeof s.album === 'string' ? s.album : (s.album?.name || '');
        const albumClean = rawAlbum.toLowerCase().trim();
        if (albumClean && seenAlbums.has(albumClean)) return false;

        seenNames.add(n);
        if (albumClean) seenAlbums.add(albumClean);
        return true;
      })
      .map(s => ({
        id: s.id,
        name: s.name,
        primaryArtists: s.primaryArtists || '',
        image: s.image,
        duration: s.duration || 0,
        url: s.url || '',
        downloadUrl: s.downloadUrl,
        album: typeof s.album === 'string' ? s.album : (s.album?.name || ''),
        year: s.year,
        language: s.language,
        playCount: s.playCount,
        releaseDate: s.releaseDate,
      }));

    filtered.sort((a, b) => getSongReleaseYear(b) - getSongReleaseYear(a));
    return filtered.slice(0, limit);
  } catch (err) {
    console.error('[SimilarSongs] Error:', err);
    return [];
  }
}
