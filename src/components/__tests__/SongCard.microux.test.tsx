/**
 * Tests for SongCard micro-interactions
 */

import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SongCard from '../SongCard';
import { analytics } from '@/utils/analytics';

// Mock dependencies
vi.mock('@/context/MusicContext', () => ({
  useMusic: () => ({
    currentSong: null,
    isPlaying: false,
    playSong: vi.fn(),
    togglePlayPause: vi.fn(),
    setPlaylistAndPlay: vi.fn(),
    isSongLiked: vi.fn(() => false),
    addToLikedSongs: vi.fn(),
    removeFromLikedSongs: vi.fn(),
    audioRef: { current: null },
  }),
}));

vi.mock('@/utils/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/config/featureFlags', () => ({
  featureFlags: {
    isEnabled: vi.fn((flag: string) => {
      if (flag === 'home_card_micro_ux') return true;
      return false;
    }),
  },
}));

vi.mock('@/animations/sharedElement', () => ({
  animateSharedElement: vi.fn(),
  prefersReducedMotion: vi.fn(() => false),
  cancelTransition: vi.fn(),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  default: () => false,
}));

vi.mock('@/hooks/useDebouncedAction', () => ({
  default: () => (fn: () => void) => fn(),
}));

const mockSong = {
  id: 'test-song-1',
  name: 'Test Song',
  primaryArtists: 'Test Artist',
  image: 'https://example.com/image.jpg',
  language: 'English',
};

describe('SongCard Micro-Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card with entrance animation', () => {
    const { getByRole } = render(<SongCard song={mockSong} />);
    const card = getByRole('button');
    expect(card).toBeDefined();
  });

  it('tracks hover interaction when enabled', async () => {
    const { getByRole } = render(<SongCard song={mockSong} />);
    const card = getByRole('button');

    fireEvent.mouseEnter(card);

    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledWith('home_card_interaction', {
        songId: 'test-song-1',
        action: 'hover',
        method: 'animation',
      });
    });
  });

  it('tracks click interaction', async () => {
    const onClick = vi.fn();
    const { getByRole } = render(<SongCard song={mockSong} onCardClick={onClick} />);
    const card = getByRole('button');

    fireEvent.click(card);

    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledWith('home_card_interaction', {
        songId: 'test-song-1',
        action: 'click',
        method: 'animation',
      });
    });
  });

  it('handles keyboard navigation', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<SongCard song={mockSong} onCardClick={onClick} />);
    const card = getByRole('button');

    fireEvent.keyDown(card, { key: 'Enter' });

    expect(analytics.track).toHaveBeenCalled();
  });

  it('handles missing song ID gracefully', () => {
    const songWithoutId = {
      name: 'Test Song',
      primaryArtists: 'Test Artist',
      image: 'https://example.com/image.jpg',
    };

    const { getByRole } = render(<SongCard song={songWithoutId} />);
    const card = getByRole('button');

    expect(card).toBeDefined();
    fireEvent.click(card);

    expect(analytics.track).toHaveBeenCalledWith('home_card_interaction', {
      songId: 'Test Song-Test Artist',
      action: 'click',
      method: 'animation',
    });
  });
});
