import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { useMusic } from '../context/MusicContext';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import AudioVisualizer from './AudioVisualizer';

interface ExpandedSongPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExpandedSongPlayer: React.FC<ExpandedSongPlayerProps> = ({ isOpen, onClose }) => {
  const { 
    currentSong, 
    isPlaying, 
    togglePlayPause, 
    playPrevious, 
    playNext,
    currentTime,
    duration,
    seekTo,
    volume,
    setVolume
  } = useMusic();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageUrl = () => {
    if (!currentSong || !currentSong.image) {
      return null;
    }
    
    // Handle different image formats
    try {
      // If image is already a string (normalized format), use it directly
      if (typeof currentSong.image === 'string') {
        return currentSong.image || null;
      }
      
      // If image is an array, handle legacy formats
      if (Array.isArray(currentSong.image)) {
        if (currentSong.image.length === 0) {
          return null;
        }
        
        const firstImage = currentSong.image[0];
        if (typeof firstImage === 'string') {
          return firstImage;
        } else if (typeof firstImage === 'object' && firstImage !== null && 'link' in firstImage) {
          const imageArray = currentSong.image as unknown as Array<{ quality?: string; link: string }>;
          return getHighestQualityImage(imageArray);
        }
      }
    } catch (error) {
      console.error('Error getting image URL:', error);
    }
    
    return null;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
  };

  if (!currentSong) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Now Playing</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Album Art and Info */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
              <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-lg mb-8">
                {getImageUrl() ? (
                  <img 
                    src={getImageUrl()!} 
                    alt={currentSong.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center';
                        fallback.innerHTML = '<div class="bg-black/20 rounded-full p-6"><div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"><svg class="w-8 h-8 text-white fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <div className="bg-black/20 rounded-full p-6">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center mb-8 w-full px-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-foreground truncate">{currentSong.name}</h3>
                  <AudioVisualizer isPlaying={isPlaying} size="md" />
                </div>
                <p className="text-lg text-muted-foreground truncate mb-1">{currentSong.primaryArtists}</p>
                <p className="text-muted-foreground">
                  {typeof currentSong.album === 'object' && currentSong.album !== null && 'name' in currentSong.album
                    ? (currentSong.album as { name: string }).name 
                    : typeof currentSong.album === 'string' 
                      ? currentSong.album 
                      : 'Unknown Album'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md px-4 mb-8">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  aria-label="Seek position"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-8 mb-8">
                <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground h-12 w-12" onClick={playPrevious}>
                  <SkipBack className="w-6 h-6" />
                </Button>
                
                <Button 
                  className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90" 
                  onClick={togglePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-primary-foreground" />
                  ) : (
                    <Play className="w-7 h-7 text-primary-foreground ml-0.5" />
                  )}
                </Button>
                
                <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground h-12 w-12" onClick={playNext}>
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3 w-full max-w-xs">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  aria-label="Volume control"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExpandedSongPlayer;