import React, { useRef } from 'react';
import { Play, Pause, Heart, MoreHorizontal, Music } from 'lucide-react';
import { Button } from './ui/button';
import { useMusic } from '../context/MusicContext';
import { useRegisterVisualizer } from '../hooks/useVisualizerRegistration';
import type { Song } from '../services/jiosaavnApi';
import { getHighestQualityImage } from '../services/jiosaavnApi';

interface PlaylistSongItemProps {
  song: Song;
  index: number;
  isCurrent: boolean;
  playlistId: string;
  playing: boolean;
  onPlay: (song: Song) => void;
  onTogglePlayPause: () => void;
  onLikeToggle: (song: Song, e: React.MouseEvent) => void;
  isSongLiked: (songId: string) => boolean;
  formatDuration: (seconds: number) => string;
}

const PlaylistSongItem: React.FC<PlaylistSongItemProps> = ({
  song,
  index,
  isCurrent,
  playlistId,
  playing,
  onPlay,
  onTogglePlayPause,
  onLikeToggle,
  isSongLiked,
  formatDuration
}) => {
  const { audioRef } = useMusic();
  
  // Create refs for visualizer canvas
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
  const desktopCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Register visualizers
  useRegisterVisualizer(mobileCanvasRef, isCurrent && playing, audioRef);
  useRegisterVisualizer(desktopCanvasRef, isCurrent && playing, audioRef);
  
  // Get highest quality image URL
  const getSongImageUrl = (): string | null => {
    try {
      if (!song.image) {
        return null;
      }
      
      // If image is already a string (normalized format), use it directly
      if (typeof song.image === 'string') {
        return song.image || null;
      }
      
      // If image is an array, handle legacy formats
      if (Array.isArray(song.image)) {
        if (song.image.length === 0) {
          return null;
        }
        
        const firstImage = song.image[0];
        if (typeof firstImage === 'string') {
          // If it's a string array, find the highest resolution
          // JioSaavn URLs typically have quality indicators like 150x150, 500x500
          const sortedImages = [...song.image].sort((a, b) => {
            const getResolution = (url: unknown) => {
              if (typeof url !== 'string') return 0;
              const match = url.match(/(\d+)x(\d+)/);
              return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
            };
            return getResolution(b) - getResolution(a);
          });
          const highestQuality = sortedImages[0];
          return typeof highestQuality === 'string' ? highestQuality : null;
        } else if (typeof firstImage === 'object' && firstImage !== null && 'link' in firstImage) {
          // If it's an object array, use getHighestQualityImage to get the best quality
          return getHighestQualityImage(song.image as any);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting image URL for song:', song.name, error);
      return null;
    }
  };
  
  const songImage = getSongImageUrl();
  
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle(song, e);
  };
  
  return (
    <div 
      key={`playlist-${playlistId}-${song.id || index}`}
      className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-3 hover:bg-accent transition-colors group ${
        isCurrent ? 'bg-red-500/10 border-l-4 border-red-500' : ''
      }`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      {/* Mobile view - simplified */}
      <div className="md:hidden flex items-center gap-3">
        <div className="relative">
          {songImage ? (
            <img 
              src={songImage} 
              alt={song.name} 
              className="w-12 h-12 rounded object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-icon w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center';
                  fallback.innerHTML = '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>';
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="playlistCard"
              onClick={(e) => {
                e.stopPropagation();
                if (playing) {
                  onTogglePlayPause();
                } else {
                  onPlay(song);
                }
              }}
            >
              {playing ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium truncate ${isCurrent ? 'text-red-500' : 'text-foreground'}`}>
              {song.name}
            </p>
            {isCurrent && playing ? (
              <canvas 
                ref={mobileCanvasRef} 
                className="mini-visual" 
                width="48" 
                height="18" 
                aria-hidden 
              />
            ) : isCurrent ? (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
              </div>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {song.primaryArtists}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {song.duration ? formatDuration(song.duration) : '0:00'}
            </span>
            <button 
              onClick={handleLikeToggle}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Heart 
                className={`w-4 h-4 ${
                  isSongLiked(song.id) 
                    ? 'text-red-500 fill-current' 
                    : 'text-muted-foreground hover:text-foreground'
                }`} 
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Desktop view */}
      <div className="hidden md:contents">
        <div className="col-span-1 flex items-center">
          {isCurrent && playing ? (
            <canvas 
              ref={desktopCanvasRef} 
              className="mini-visual" 
              width="48" 
              height="18" 
              aria-hidden 
            />
          ) : isCurrent ? (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          ) : (
            <span className="text-muted-foreground group-hover:hidden">{index + 1}</span>
          )}
          <button 
            className={`hidden group-hover:block ${isCurrent ? 'text-red-500' : ''} w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors`}
            onClick={(e) => {
              e.stopPropagation();
              if (playing) {
                onTogglePlayPause();
              } else {
                onPlay(song);
              }
            }}
          >
            {playing ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>
        </div>
        
        <div className="col-span-5 flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            {songImage ? (
              <img 
                src={songImage} 
                alt={song.name} 
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-icon')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-icon w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center';
                    fallback.innerHTML = '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <div>
            <p className={`font-medium ${isCurrent ? 'text-red-500' : 'text-foreground'}`}>
              {song.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {song.primaryArtists}
            </p>
          </div>
        </div>
        
        <div className="col-span-3 flex items-center">
          <p className="text-muted-foreground text-sm">{song.album?.name || song.label || 'Unknown Album'}</p>
        </div>
        
        <div className="col-span-2 flex items-center">
          <p className="text-muted-foreground text-sm">
            {song.year || new Date().getFullYear()}
          </p>
        </div>
        
        <div className="col-span-1 flex items-center justify-end gap-2">
          <button 
            onClick={handleLikeToggle}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart 
              className={`w-4 h-4 ${
                isSongLiked(song.id) 
                  ? 'text-red-500 fill-current' 
                  : 'text-muted-foreground hover:text-foreground'
              }`} 
            />
          </button>
          <span className="text-muted-foreground text-sm">
            {song.duration ? formatDuration(song.duration) : '0:00'}
          </span>
          <button 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistSongItem;