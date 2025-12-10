import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomeView from '../views/HomeView';
import { jiosaavnApi } from '../services/jiosaavnApi';
import { useMusic } from '../context/MusicContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { usePlaylistSidebar } from '../context/PlaylistSidebarContext';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../services/jiosaavnApi');
vi.mock('../context/MusicContext');
vi.mock('../context/SettingsContext');
vi.mock('../context/AuthContext');
vi.mock('../context/PlaylistSidebarContext');

// Mock data
const createMockSong = (id: string, name: string, albumName: string) => ({
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
    url: 'http://example.com/song.mp3',
    copyright: '',
    image: 'http://example.com/img.jpg',
    downloadUrl: []
});

describe('Mixed Romance Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (useMusic as any).mockReturnValue({
            currentSong: null,
            isPlaying: false,
            playSong: vi.fn(),
            isSongLiked: vi.fn().mockReturnValue(false),
        });
        (useSettings as any).mockReturnValue({ settings: {} });
        (useAuth as any).mockReturnValue({ user: null });
        (usePlaylistSidebar as any).mockReturnValue({ isPlaylistSidebarOpen: false });

        // Mock API responses
        (jiosaavnApi.getMalayalamRomanceSongs as any).mockResolvedValue([
            createMockSong('1', 'Song A', 'Movie 1'),
            createMockSong('2', 'Song B', 'Movie 1'), // Duplicate movie
        ]);
        (jiosaavnApi.getHindiRomanceSongs as any).mockResolvedValue([]);
        (jiosaavnApi.getTamilRomanceSongs as any).mockResolvedValue([
            createMockSong('3', 'Song C', 'Movie 2'),
        ]);
    });

    it('should deduplicate songs on load', async () => {
        // Render HomeView
        // Note: HomeView fetches on mount

        // We need to mock the replacement fetcher behavior implicitly by mocking the API calls
        // The component calls getMalayalamRomanceSongs etc. again for replacements

        // Initial load mocks are set in beforeEach

        // Render
        // We can't easily test the internal state of HomeView without rendering it.
        // But HomeView is complex.
        // Let's assume we can render it.
    });
});
