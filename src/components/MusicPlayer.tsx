import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Download, MoreHorizontal, Shuffle, Repeat, ListMusic, Home, Search, Library, PanelLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Slider } from './ui/slider';
import { useMusic } from '../context/MusicContext';
import { usePlaylistSidebar } from '../context/PlaylistSidebarContext';
import type { Song } from '../services/jiosaavnApi';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import AudioVisualizer from './AudioVisualizer';

interface MusicPlayerProps {
  onToggleSidebar?: () => void;
  onOpenExpandedPlayer?: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ onToggleSidebar, onOpenExpandedPlayer }) => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    queue,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    setIsShuffle,
    setRepeatMode,
  } = useMusic();

  const { isPlaylistSidebarOpen } = usePlaylistSidebar();

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (song: Song) => {
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23a855f7" width="150" height="150"/%3E%3Ctext fill="%23ffffff" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    
    if (!song || !song.image) {
      return placeholder;
    }
    
    // Handle different image formats
    try {
      // If image is already a string (normalized format), use it directly
      if (typeof song.image === 'string') {
        return song.image || placeholder;
      }
      
      // If image is an array, handle legacy formats
      if (Array.isArray(song.image)) {
        if (song.image.length === 0) {
          return placeholder;
        }
        
        // If image is array of strings (URLs)
        if (typeof song.image[0] === 'string') {
          return song.image[0] || placeholder;
        }
        
        // If image is array of objects with quality and link
        if (typeof song.image[0] === 'object' && song.image[0].link) {
          return getHighestQualityImage(song.image as Array<{ quality?: string; link: string }>) || placeholder;
        }
      }
      
      return placeholder;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return placeholder;
    }
  };

  if (!currentSong) {
    return (
      <motion.div 
        className="h-24 bg-card border-t border-border flex items-center justify-center"
        style={{ willChange: 'margin-right' }}
        animate={{ 
          marginRight: isPlaylistSidebarOpen ? 320 : 0,
        }}
        transition={{ 
          duration: 0.25,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        <p className="text-muted-foreground">No song playing</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="h-24 bg-card border-t border-border flex items-center px-4 gap-4"
      style={{ willChange: 'margin-right' }}
      animate={{ 
        marginRight: isPlaylistSidebarOpen ? 320 : 0,
      }}
      transition={{ 
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className="text-muted-foreground hover:text-foreground transition hover:text-red-500 p-2 rounded hover:bg-accent"
        title="Toggle sidebar"
      >
        <PanelLeft className="w-5 h-5" />
      </button>

      {/* Song Info */}
      <div className="flex items-center gap-3 w-80">
        <motion.img
          src={getImageUrl(currentSong as any)}
          alt={currentSong.name}
          className="w-14 h-14 rounded object-cover cursor-pointer"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={onOpenExpandedPlayer}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate cursor-pointer" onClick={onOpenExpandedPlayer}>
              {currentSong.name}
            </h4>
            <AudioVisualizer isPlaying={isPlaying} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground truncate cursor-pointer" onClick={onOpenExpandedPlayer}>
            {currentSong.primaryArtists}
          </p>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={isShuffle ? "true" : "false"}
            className={cn(
              'text-muted-foreground hover:text-foreground transition',
              isShuffle && 'text-red-500'
            )}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={playPrevious}
            title="Previous track"
            className="text-muted-foreground hover:text-foreground transition hover:text-red-500"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <motion.button
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-pressed={isPlaying ? "true" : "false"}
            className="w-10 h-10 rounded-full bg-red-500 text-primary-foreground flex items-center justify-center hover:scale-105 transition"
            whileTap={{ scale: 0.9 }}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </motion.button>
          <button
            onClick={playNext}
            title="Next track"
            className="text-muted-foreground hover:text-foreground transition hover:text-red-500"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (repeatMode === 'none') setRepeatMode('all');
              else if (repeatMode === 'all') setRepeatMode('one');
              else setRepeatMode('none');
            }}
            title={repeatMode === 'none' ? 'Enable repeat' : repeatMode === 'all' ? 'Repeat one' : 'Disable repeat'}
            aria-pressed={repeatMode !== 'none' ? "true" : "false"}
            className={cn(
              'text-muted-foreground hover:text-foreground transition',
              repeatMode !== 'none' && 'text-red-500'
            )}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-2xl flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={(value: number[]) => seekTo(value[0])}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume Control and Queue */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 w-40">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
            title={volume === 0 ? 'Unmute' : 'Mute'}
            aria-pressed={volume === 0 ? "true" : "false"}
            className="text-muted-foreground hover:text-foreground transition hover:text-red-500"
          >
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={(value: number[]) => setVolume(value[0] / 100)}
            className="flex-1"
          />
        </div>
        
        {/* Queue Button with Badge */}
        <button
          onClick={onOpenExpandedPlayer}
          className="relative p-2 text-muted-foreground hover:text-foreground transition hover:text-red-500 rounded hover:bg-accent"
          title="Open queue"
        >
          <ListMusic className="w-5 h-5" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default MusicPlayer;