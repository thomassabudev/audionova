import { describe, it, expect, vi } from 'vitest';
import { enforceCrossMovieVariety, detectAndReplaceDuplicates } from '../utils/deduplication';
import type { Song } from '../services/jiosaavnApi';

// Mock Song Factory
const createMockSong = (id: string, name: string, albumName: string): Song => ({
    id,
    name,
    album: { id: 'alb-' + id, name: albumName, url: '' },
    year: '2024',
    releaseDate: '2024-01-01',
    duration: 200,
    label: 'Label',
    primaryArtists: 'Artist',
    primaryArtistsId: 'art-1',
    featuredArtists: '',
    featuredArtistsId: '',
    explicitContent: false,
    playCount: 100,
    language: 'Malayalam',
    hasLyrics: false,
    url: '',
    copyright: '',
    image: [],
    downloadUrl: []
});

describe('deduplication utils', () => {
    describe('enforceCrossMovieVariety', () => {
        it('should remove songs from the same movie', () => {
            const songs = [
                createMockSong('1', 'Song A', 'Movie 1'),
                createMockSong('2', 'Song B', 'Movie 1'), // Duplicate movie
                createMockSong('3', 'Song C', 'Movie 2'),
            ];

            const result = enforceCrossMovieVariety(songs);
            expect(result).toHaveLength(2);
            expect(result.map(s => s.id)).toEqual(['1', '3']);
        });

        it('should handle empty list', () => {
            expect(enforceCrossMovieVariety([])).toEqual([]);
        });

        it('should handle songs with no album name', () => {
            const s1 = createMockSong('1', 'Song A', '');
            const s2 = createMockSong('2', 'Song B', 'Movie 1');
            const s3 = createMockSong('3', 'Song C', ''); // Another no-album

            const result = enforceCrossMovieVariety([s1, s2, s3]);
            // Assuming implementation keeps both if name is empty
            expect(result).toHaveLength(3);
        });
    });

    describe('detectAndReplaceDuplicates', () => {
        it('should replace duplicates with new songs', async () => {
            const songs = [
                createMockSong('1', 'Song A', 'Movie 1'),
                createMockSong('2', 'Song B', 'Movie 1'), // Duplicate
            ];

            const replacement = createMockSong('3', 'Song C', 'Movie 2');
            const fetcher = vi.fn().mockResolvedValue(replacement);

            const { songs: finalSongs, replacements } = await detectAndReplaceDuplicates(songs, fetcher);

            expect(finalSongs).toHaveLength(2);
            expect(finalSongs.map(s => s.id)).toContain('1');
            expect(finalSongs.map(s => s.id)).toContain('3');
            expect(replacements).toHaveLength(1);
            expect(replacements[0].originalSong.id).toBe('2');
            expect(replacements[0].replacementSong?.id).toBe('3');
        });

        it('should handle replacement failure gracefully', async () => {
            const songs = [
                createMockSong('1', 'Song A', 'Movie 1'),
                createMockSong('2', 'Song B', 'Movie 1'), // Duplicate
            ];

            const fetcher = vi.fn().mockResolvedValue(null); // Fails to find replacement

            const { songs: finalSongs, replacements } = await detectAndReplaceDuplicates(songs, fetcher);

            expect(finalSongs).toHaveLength(1); // Only the original valid one
            expect(replacements).toHaveLength(1);
            expect(replacements[0].replacementSong).toBeNull();
        });
    });
});
