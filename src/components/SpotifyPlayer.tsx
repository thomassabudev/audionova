import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Heart, MonitorSpeaker } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Slider } from './ui/slider';
import { motion } from 'framer-motion';

const SpotifyPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    isSongLiked,
    addToLikedSongs,
    removeFromLikedSongs
  } = useMusic();

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (song: typeof currentSong) => {
    if (!song) return '';
    const highQuality = song.image?.find((img: any) => img.quality === '500x500') || song.image?.[0];
    return highQuality?.link || '';
  };

  const handleLikeToggle = () => {
    if (!currentSong) return;
    
    if (isSongLiked(currentSong.id)) {
      removeFromLikedSongs(currentSong.id);
    } else {
      addToLikedSongs(currentSong);
    }
  };

  if (!currentSong) {
    return (
      <div className="h-24 bg-card border-t border-border flex items-center justify-center">
        <p className="text-muted-foreground">No song playing</p>
      </div>
    );
  }

  const isLiked = isSongLiked(currentSong.id);

  return (
    <div className="h-24 bg-card border-t border-border flex items-center px-4 gap-4">
      {/* Song Info */}
      <div className="flex items-center gap-3 w-80">
        <motion.img
          src={getImageUrl(currentSong)}
          alt={currentSong.name}
          className="w-14 h-14 rounded object-cover"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">{currentSong.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{currentSong.primaryArtists}</p>
        </div>
        <button 
          onClick={handleLikeToggle}
          className="text-muted-foreground hover:text-emerald-500 transition-colors"
        >
          <Heart 
            className={`w-4 h-4 ${isLiked ? 'text-emerald-500 fill-current' : ''}`} 
          />
        </button>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            className={`text-muted-foreground hover:text-foreground transition ${isShuffle ? 'text-emerald-500' : ''}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={playPrevious}
            title="Previous track"
            className="text-muted-foreground hover:text-foreground transition hover:text-emerald-500"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <motion.button
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
            whileTap={{ scale: 0.9 }}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </motion.button>
          <button
            onClick={playNext}
            title="Next track"
            className="text-muted-foreground hover:text-foreground transition hover:text-emerald-500"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            onClick={toggleRepeat}
            title={repeatMode === 'off' ? 'Enable repeat' : 'Disable repeat'}
            className={`text-muted-foreground hover:text-foreground transition ${repeatMode !== 'off' ? 'text-emerald-500' : ''}`}
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

      {/* Volume Control and Additional Controls */}
      <div className="flex items-center gap-2 w-40">
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
          title={volume === 0 ? 'Unmute' : 'Mute'}
          className="text-muted-foreground hover:text-foreground transition hover:text-emerald-500"
        >
          {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <Slider
          value={[volume * 100]}
          max={100}
          step={1}
          onValueChange={(value: number[]) => setVolume(value[0] / 100)}
          className="flex-1"
        />
        <MonitorSpeaker className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default SpotifyPlayer;