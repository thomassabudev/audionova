import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import SongCard from '../SongCard';
import { useMusic } from '@/context/MusicContext';

// Mock the context
vi.mock('@/context/MusicContext', () => ({
  useMusic: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  useReducedMotion: () => false,
}));

// Mock components
vi.mock('../LanguageBadge', () => ({
  default: () => <div data-testid="language-badge">ML</div>,
}));

vi.mock('@/utils/isNewSong', () => ({
  isNewSong: () => false,
}));

vi.mock('@/services/jiosaavnApi', () => ({
  getHighestQualityImage: (img: any) => 'https://example.com/image.jpg',
}));

describe('SongCard', () => {
  const mockSong = {
    id: '123',
    name: 'Test Song',
    primaryArtists: 'Test Artist',
    primaryArtistsId: 'artist-123',
    featuredArtists: '',
    featuredArtistsId: '',
    image: [{ quality: '500x500', link: 'https://example.com/image.jpg' }],
    language: 'malayalam',
    duration: 180,
    url: 'https://example.com/song.mp3',
    downloadUrl: [{ quality: '320kbps', link: 'https://example.com/song.mp3' }],
    album: { id: 'album-123', name: 'Test Album', url: 'https://example.com/album' },
    year: '2024',
    releaseDate: '2024-01-01',
    label: 'Test Label',
    playCount: 1000,
    copyright: 'Test Copyright',
    hasLyrics: false,
    lyricsSnippet: '',
    explicitContent: false,
  };

  const mockPlaylist = [mockSong];

  const mockMusicContext = {
    currentSong: null,
    isPlaying: false,
    playSong: vi.fn(),
    togglePlayPause: vi.fn(),
    setPlaylistAndPlay: vi.fn(),
    isSongLiked: vi.fn(() => false),
    addToLikedSongs: vi.fn(),
    removeFromLikedSongs: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useMusic as any).mockReturnValue(mockMusicContext);
  });

  it('renders song information correctly', () => {
    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('shows Play icon when song is not playing', () => {
    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const playButton = screen.getByLabelText(/Play Test Song/i);
    expect(playButton).toBeInTheDocument();
  });

  it('shows Pause icon when song is currently playing', () => {
    (useMusic as any).mockReturnValue({
      ...mockMusicContext,
      currentSong: mockSong,
      isPlaying: true,
    });

    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const pauseButton = screen.getByLabelText(/Pause Test Song/i);
    expect(pauseButton).toBeInTheDocument();
  });

  it('calls setPlaylistAndPlay when Play button is clicked', () => {
    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const playButton = screen.getByLabelText(/Play Test Song/i);
    fireEvent.click(playButton);
    
    expect(mockMusicContext.setPlaylistAndPlay).toHaveBeenCalledWith(mockPlaylist, 0);
  });

  it('calls togglePlayPause when Pause button is clicked', () => {
    (useMusic as any).mockReturnValue({
      ...mockMusicContext,
      currentSong: mockSong,
      isPlaying: true,
    });

    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const pauseButton = screen.getByLabelText(/Pause Test Song/i);
    fireEvent.click(pauseButton);
    
    expect(mockMusicContext.togglePlayPause).toHaveBeenCalled();
  });

  it('does not trigger card click when Play button is clicked', () => {
    const onCardClick = vi.fn();
    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} onCardClick={onCardClick} />);
    
    const playButton = screen.getByLabelText(/Play Test Song/i);
    fireEvent.click(playButton);
    
    // Card click should not be triggered
    expect(onCardClick).not.toHaveBeenCalled();
    // But play action should be triggered
    expect(mockMusicContext.setPlaylistAndPlay).toHaveBeenCalled();
  });

  it('handles keyboard interaction on Play button', () => {
    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const playButton = screen.getByLabelText(/Play Test Song/i);
    fireEvent.keyDown(playButton, { key: 'Enter' });
    
    expect(mockMusicContext.setPlaylistAndPlay).toHaveBeenCalledWith(mockPlaylist, 0);
  });

  it('toggles like status when heart button is clicked', () => {
    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const likeButton = screen.getByLabelText(/Like Test Song/i);
    fireEvent.click(likeButton);
    
    expect(mockMusicContext.addToLikedSongs).toHaveBeenCalledWith(mockSong);
  });

  it('shows correct aria-pressed state for Play button', () => {
    (useMusic as any).mockReturnValue({
      ...mockMusicContext,
      currentSong: mockSong,
      isPlaying: true,
    });

    render(<SongCard song={mockSong} playlist={mockPlaylist} index={0} />);
    
    const pauseButton = screen.getByLabelText(/Pause Test Song/i);
    expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
  });
});
