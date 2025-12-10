import type { Song } from '@/services/jiosaavnApi';

export interface ReplacementReport {
    originalSong: Song;
    replacementSong: Song | null;
    reason: string;
}

/**
 * Enforces that no two songs in the list are from the same movie/album.
 * Prioritizes the first occurrence of a movie.
 */
export const enforceCrossMovieVariety = (songs: Song[]): Song[] => {
    const seenMovies = new Set<string>();
    const uniqueSongs: Song[] = [];

    for (const song of songs) {
        // Normalize movie/album name to handle slight variations
        let movieName = '';
        if (typeof song.album === 'string') {
            movieName = song.album;
        } else if (song.album?.name) {
            movieName = song.album.name;
        }
        movieName = movieName.toLowerCase().trim();

        // If we can't determine a movie name, we might include it or exclude it. 
        // Safest is to include but maybe treat as unique? 
        // Let's assume if no album name, it's a single or unique enough.
        if (!movieName) {
            uniqueSongs.push(song);
            continue;
        }

        if (!seenMovies.has(movieName)) {
            seenMovies.add(movieName);
            uniqueSongs.push(song);
        }
    }

    return uniqueSongs;
};

/**
 * Detects duplicates (same movie) and attempts to replace them using a fetcher function.
 * Returns the cleaned list and a report of replacements.
 */
export const detectAndReplaceDuplicates = async (
    songs: Song[],
    fetchReplacement: (excludeIds: string[], excludeMovies: string[]) => Promise<Song | null>
): Promise<{ songs: Song[]; replacements: ReplacementReport[] }> => {
    const seenMovies = new Set<string>();
    const seenIds = new Set<string>();
    const finalSongs: Song[] = [];
    const replacements: ReplacementReport[] = [];

    // First pass: Identify valid songs and duplicates
    for (const song of songs) {
        let movieName = '';
        if (typeof song.album === 'string') {
            movieName = song.album;
        } else if (song.album?.name) {
            movieName = song.album.name;
        }
        movieName = movieName.toLowerCase().trim();
        const songId = song.id;

        // Check for ID duplicate first
        if (seenIds.has(songId)) {
            // It's an exact duplicate song, skip or replace?
            // Let's try to replace it.
            replacements.push({
                originalSong: song,
                replacementSong: null, // Will be filled later
                reason: 'Duplicate Song ID'
            });
            continue;
        }

        // Check for Movie duplicate
        if (movieName && seenMovies.has(movieName)) {
            replacements.push({
                originalSong: song,
                replacementSong: null, // Will be filled later
                reason: `Duplicate Movie: ${movieName}`
            });
            continue;
        }

        // Valid song
        if (movieName) seenMovies.add(movieName);
        seenIds.add(songId);
        finalSongs.push(song);
    }

    // Second pass: Fetch replacements for the identified duplicates
    // We need to maintain the original size if possible, or just return unique list?
    // Requirement: "Replace duplicates with songs from different movies"

    for (let i = 0; i < replacements.length; i++) {
        const report = replacements[i];

        try {
            // Fetch a replacement that is NOT in seenIds and NOT in seenMovies
            const replacement = await fetchReplacement(
                Array.from(seenIds),
                Array.from(seenMovies)
            );

            if (replacement) {
                let repMovie = '';
                if (typeof replacement.album === 'string') {
                    repMovie = replacement.album;
                } else if (replacement.album?.name) {
                    repMovie = replacement.album.name;
                }
                repMovie = repMovie.toLowerCase().trim();

                seenIds.add(replacement.id);
                if (repMovie) seenMovies.add(repMovie);

                finalSongs.push(replacement);
                report.replacementSong = replacement;
            } else {
                // Could not find replacement
                // We just don't add anything to finalSongs, effectively removing the duplicate
            }
        } catch (error) {
            console.error('Error fetching replacement:', error);
            // Keep going
        }
    }

    return { songs: finalSongs, replacements };
};
