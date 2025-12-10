/**
 * Helper utility to determine if a song is "new"
 * A song is considered new if:
 * - It was released in 2025 (or target year)
 * - OR it was released within the last 14 days (configurable)
 */

export interface SimpleSong {
  releaseDate?: string | null;
  year?: string | number | null;
}

export interface IsNewSongOptions {
  targetYear?: number;   // default 2025
  recentDays?: number;   // default 14
  now?: number;          // for testing
}

/**
 * Determines if a song is considered "new"
 * @param song - Song object with releaseDate and/or year
 * @param options - Configuration options
 * @returns true if song is new, false otherwise
 */
export function isNewSong(
  song: SimpleSong | undefined | null,
  options?: IsNewSongOptions
): boolean {
  if (!song) return false;

  const targetYear = options?.targetYear ?? 2025;
  const recentDays = options?.recentDays ?? 14;
  const now = options?.now ?? Date.now();

  // 1 — If releaseDate exists and is valid
  if (song.releaseDate) {
    const parsed = Date.parse(song.releaseDate);
    if (!isNaN(parsed)) {
      const diffDays = (now - parsed) / (1000 * 60 * 60 * 24);

      // Condition B: Very recent (within recentDays)
      if (diffDays >= 0 && diffDays <= recentDays) return true;

      // Condition A: Year is target year (2025)
      const relYear = new Date(parsed).getFullYear();
      if (relYear === targetYear) return true;

      return false;
    }
  }

  // 2 — Fallback: use year
  if (song.year !== undefined && song.year !== null) {
    const y = Number(song.year);
    if (!isNaN(y) && y === targetYear) return true;
  }

  return false;
}
