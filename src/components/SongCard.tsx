import React, { useRef, useCallback, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Play, Pause, Heart } from 'lucide-react';
import { getHighestQualityImage } from '@/services/jiosaavnApi';
import { useMusic } from '@/context/MusicContext';
import { isNewSong } from '@/utils/isNewSong';
import LanguageBadge from './LanguageBadge';

interface SongCardProps {
  song: any;
  playlist?: any[];
  index?: number;
  onCardClick?: (song: any) => void;
  showNewBadge?: boolean;
  showLanguageBadge?: boolean;
}

const sheenVariants = {
  rest: { x: '-110%' },
  press: { x: '120%' },
};

const playBtnVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 700, damping: 28 }
  },
  active: {
    opacity: 1,
    scale: 1.06,
    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
    transition: { type: 'spring' as const, stiffness: 700, damping: 28 }
  },
};

const getPlaceholderImage = (text: string) => {
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23a855f7" width="300" height="300"/%3E%3Ctext fill="%23ffffff" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
};

export default function SongCard({ song, playlist, index, onCardClick, showNewBadge = false, showLanguageBadge = true }: SongCardProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Music context
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    setPlaylistAndPlay,
    isSongLiked,
    addToLikedSongs,
    removeFromLikedSongs
  } = useMusic();

  const isCurrent = currentSong?.id === song.id;
  const playing = isCurrent && isPlaying;

  // Get image URL
  const getImageUrl = () => {
    if (!song.image) {
      return getPlaceholderImage(song.name || 'No Image');
    }
    const url = getHighestQualityImage(song.image);
    return url || getPlaceholderImage(song.name || 'No Image');
  };

  const imageSrc = getImageUrl();

  // Play/pause handler for the button
  const handlePlayButton = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();

    // If this song is currently playing, toggle pause
    if (isCurrent) {
      togglePlayPause();
      return;
    }

    // Otherwise play this song
    if (playlist && typeof index === 'number') {
      setPlaylistAndPlay(playlist, index);
    } else if (typeof playSong === 'function') {
      playSong(song);
    }
  }, [isCurrent, togglePlayPause, setPlaylistAndPlay, playSong, song, playlist, index]);

  // Simple card click handler
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(song);
    } else if (playlist && typeof index === 'number') {
      setPlaylistAndPlay(playlist, index);
    } else {
      playSong(song);
    }
  };

  // Handle hover events
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleCardClick();
    }
  };

  // Like toggle handler
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSongLiked(song.id)) {
      removeFromLikedSongs(song.id);
    } else {
      addToLikedSongs(song);
    }
  };

  return (
    <motion.div
      className="song-card-liquid relative rounded-xl overflow-hidden bg-card border border-border shadow-sm cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={handleKey}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
      aria-label={`${song.name} - ${song.primaryArtists || 'artist'}`}
    >
      <div className="relative w-full aspect-square overflow-hidden">
        <motion.img
          ref={imgRef}
          src={imageSrc}
          alt={song.name || 'song'}
          className="w-full h-full object-cover"
          draggable={false}
          decoding="async"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.2 }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getPlaceholderImage(song.name || 'Error');
          }}
        />

        {/* Sheen overlay (moves on press/play) */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial="rest"
          animate={playing ? 'press' : 'rest'}
          variants={sheenVariants}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          aria-hidden="true"
        >
          <div
            className="liquid-sheen absolute -left-[120%] top-0 w-[240%] h-full"
            style={{
              background:
                'linear-gradient(120deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.00) 100%)',
              transform: 'skewX(-12deg)',
              filter: 'blur(6px)',
            }}
          />
        </motion.div>

        {/* Play/Pause button (center) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.button
            type="button"
            onClick={handlePlayButton}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handlePlayButton(e);
              }
            }}
            className="pointer-events-auto h-12 w-12 rounded-full bg-red-500 shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 hover:bg-red-600 transition-colors"
            aria-label={playing ? `Pause ${song.name}` : `Play ${song.name}`}
            aria-pressed={playing}
            initial="hidden"
            animate={playing ? 'active' : 'visible'}
            variants={playBtnVariants}
            whileTap={{ scale: 0.96 }}
            style={{ translateZ: 0 }}
          >
            {playing ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </motion.button>
        </div>

        {/* Like button (top-right) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            type="button"
            onClick={handleLikeToggle}
            className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={isSongLiked(song.id) ? `Unlike ${song.name}` : `Like ${song.name}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Heart
              className={`w-4 h-4 ${isSongLiked(song.id) ? 'fill-current text-red-500' : 'text-white'
                }`}
            />
          </motion.button>
        </div>

        {/* NEW Badge - top-left */}
        {showNewBadge && isNewSong(song) && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white shadow-lg">
              NEW
            </span>
          </div>
        )}

        {/* Language badge bottom-left */}
        {showLanguageBadge && <LanguageBadge language={song.language} />}
      </div>

      <div className="p-3 bg-card">
        <h3 className="font-medium text-foreground truncate">{song.name}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {song.primaryArtists || 'Unknown Artist'}
        </p>
      </div>
    </motion.div>
  );
}
