import React, { useRef } from 'react';
import { Play, Pause, Heart, MoreHorizontal } from 'lucide-react';
import type { Song } from '../services/jiosaavnApi';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import { useMusic } from '../context/MusicContext';
import { useRegisterVisualizer } from '../hooks/useVisualizerRegistration';

interface SongCardSpotifyProps {
  song: Song;
  index: number;
  onPlay: (song: Song) => void;
  onPause: () => void;
  onSongSelect: (song: Song) => void;
}

const SongCardSpotify: React.FC<SongCardSpotifyProps> = ({ 
  song, 
  index,
  onPlay,
  onPause,
  onSongSelect
}) => {
  const { currentSong, currentSongId, isPlaying, isSongLiked, addToLikedSongs, removeFromLikedSongs, audioRef } = useMusic();
  const isCurrent = currentSongId === song.id;
  const isLiked = isSongLiked(song.id);
  const isCurrentlyPlaying = isCurrent && isPlaying;
  
  // Create refs for visualizer canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Register visualizer
  useRegisterVisualizer(canvasRef, isCurrent && isPlaying, audioRef);

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) {
      removeFromLikedSongs(song.id);
    } else {
      addToLikedSongs(song);
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentlyPlaying) {
      onPause();
    } else {
      onPlay(song);
    }
  };

  const getImageUrl = () => {
    if (!song.image || song.image.length === 0) {
      return '';
    }
    return getHighestQualityImage(song.image);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`grid grid-cols-12 gap-4 px-4 py-2 rounded-lg hover:bg-accent group transition-colors cursor-pointer ${
        isCurrent ? 'bg-red-500/10 border-l-4 border-red-500' : ''
      }`}
      onClick={() => onSongSelect(song)}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="col-span-1 flex items-center justify-center">
        <div className="relative w-10 h-10">
          {isCurrent && isPlaying ? (
            <canvas 
              ref={canvasRef} 
              className="mini-visual" 
              width="40" 
              height="40" 
              aria-hidden 
            />
          ) : getImageUrl() ? (
            <img 
              src={getImageUrl()} 
              alt={song.name} 
              className="w-full h-full rounded object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded-full"></div>
            </div>
          )}
          <button
            className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
              isCurrentlyPlaying ? 'opacity-100' : ''
            }`}
            onClick={handlePlayPause}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
        </div>
      </div>
      
      <div className="col-span-5 flex items-center">
        <div className="flex flex-col">
          <p className={`font-medium ${isCurrent ? 'text-emerald-500' : 'text-foreground'}`}>
            {song.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {song.primaryArtists}
          </p>
        </div>
      </div>
      
      <div className="col-span-3 flex items-center">
        <p className="text-muted-foreground text-sm">
          {song.album?.name || song.label || 'Unknown Album'}
        </p>
      </div>
      
      <div className="col-span-2 flex items-center">
        <p className="text-muted-foreground text-sm">
          {song.year || new Date().getFullYear()}
        </p>
      </div>
      
      <div className="col-span-1 flex items-center justify-end gap-3">
        <button 
          onClick={handleLikeToggle}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart 
            className={`w-4 h-4 ${
              isLiked 
                ? 'text-emerald-500 fill-current' 
                : 'text-muted-foreground hover:text-foreground'
            }`} 
          />
        </button>
        <span className="text-muted-foreground text-sm w-10 text-right">
          {formatDuration(song.duration)}
        </span>
        <button 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  );
};

export default SongCardSpotify;