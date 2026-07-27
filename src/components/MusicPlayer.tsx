import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, ListMusic, PanelLeft, Moon, Sliders, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useMusic } from '../context/MusicContext';
import { useSettings } from '../context/SettingsContext';
import { usePlaylistSidebar } from '../context/PlaylistSidebarContext';
import { useDynamicTheme, useThemeCSS, useAnimatedGradient } from '../hooks/useDynamicTheme';
import { useThemeDetection } from '../hooks/useThemeDetection';
import { selectMusicPlayerImage } from '../utils/imageQualitySelector';
import AudioVisualizer from './AudioVisualizer';
import SleepTimerModal from './SleepTimerModal';
import EqualizerModal from './EqualizerModal';
import ShareSongModal from './ShareSongModal';

interface MusicPlayerProps {
  onToggleSidebar?: () => void;
  onOpenExpandedPlayer?: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ onToggleSidebar, onOpenExpandedPlayer }) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
    setVolume,
    setIsShuffle,
    setRepeatMode,
    seekTo,
    sleepTimerOption,
    sleepTimerRemaining,
  } = useMusic();

  console.log("[MusicPlayer]", {
    currentTime,
    duration,
    currentSong: currentSong?.name
  });

  const { isPlaylistSidebarOpen } = usePlaylistSidebar();
  const { isLightTheme } = useThemeDetection();

  // Dynamic theme based on album artwork
  const {
    palette,
    animatedGradients,
    updateThemeFromImage
  } = useDynamicTheme();

  const themeCSS = useThemeCSS(palette);
  const currentAnimatedGradient = useAnimatedGradient(animatedGradients, isPlaying);

  // Theme-aware opacity and color intensity
  const getThemeAwareOpacity = (darkOpacity: number, lightOpacity: number) =>
    isLightTheme ? lightOpacity : darkOpacity;

  const getThemeAwareColorIntensity = (darkIntensity: number, lightIntensity: number) =>
    isLightTheme ? lightIntensity : darkIntensity;

  // OPTIMIZED: Update theme less frequently to reduce scroll lag
  useEffect(() => {
    if (currentSong) {
      const imageUrl = selectMusicPlayerImage(currentSong);
      if (imageUrl && !imageUrl.includes('data:image/svg+xml')) {
        // Debounce theme updates to reduce performance impact
        const timeoutId = setTimeout(() => {
          updateThemeFromImage(imageUrl);
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentSong?.id, updateThemeFromImage]); // Only update when song ID changes


  const displayDuration = (duration && duration > 0 && isFinite(duration))
    ? duration
    : (currentSong?.duration ? Number(currentSong.duration) : 0);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * displayDuration;
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    setVolume(percentage);
  };

  if (!currentSong) {
    return (
      <motion.div
        className="h-24 relative overflow-hidden flex items-center justify-center"
        style={{ willChange: 'margin-right' }}
        animate={{
          marginRight: isPlaylistSidebarOpen ? 320 : 0,
        }}
        transition={{
          duration: 0.25,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {/* Transparent Background for Empty State */}
        <div className="absolute inset-0 bg-transparent" />
        <div className="relative z-10">
          <p className="text-white/70">No song playing</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-24 relative overflow-hidden"
      style={{
        willChange: 'margin-right',
        ...themeCSS
      }}
      animate={{
        marginRight: isPlaylistSidebarOpen ? 320 : 0,
      }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Fully Transparent Background */}
      <div className="absolute inset-0 bg-transparent" />

      {/* Dynamic Background Gradient with Enhanced Animation - Theme-aware visibility */}
      <div className="absolute inset-0" style={{ opacity: getThemeAwareOpacity(0.5, 0.8) }}>
        {palette ? (
          <motion.div
            className="absolute inset-0"
            animate={{
              background: isPlaying && currentAnimatedGradient
                ? currentAnimatedGradient
                : `linear-gradient(90deg, ${palette.primary}${getThemeAwareColorIntensity(40, 70)}, ${palette.secondary}${getThemeAwareColorIntensity(35, 65)}, ${palette.accent}${getThemeAwareColorIntensity(30, 60)})`
            }}
            transition={{
              duration: isPlaying ? 3 : 1,
              ease: 'easeInOut'
            }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-r ${isLightTheme
            ? 'from-red-500/60 via-purple-500/60 to-blue-500/60'
            : 'from-red-500/40 via-purple-500/40 to-blue-500/40'
            }`} />
        )}
      </div>

      {/* Animated Flowing Background - Theme-aware visibility */}
      <motion.div
        className="absolute inset-0"
        style={{ opacity: getThemeAwareOpacity(0.4, 0.7) }}
        animate={{
          background: palette && isPlaying
            ? [
              `linear-gradient(90deg, ${palette.primary}${getThemeAwareColorIntensity(50, 80)}, ${palette.secondary}${getThemeAwareColorIntensity(45, 75)})`,
              `linear-gradient(90deg, ${palette.secondary}${getThemeAwareColorIntensity(50, 80)}, ${palette.accent}${getThemeAwareColorIntensity(45, 75)})`,
              `linear-gradient(90deg, ${palette.accent}${getThemeAwareColorIntensity(50, 80)}, ${palette.vibrant}${getThemeAwareColorIntensity(45, 75)})`,
              `linear-gradient(90deg, ${palette.vibrant}${getThemeAwareColorIntensity(50, 80)}, ${palette.primary}${getThemeAwareColorIntensity(45, 75)})`
            ]
            : palette
              ? `linear-gradient(90deg, ${palette.primary}${getThemeAwareColorIntensity(35, 65)}, ${palette.secondary}${getThemeAwareColorIntensity(30, 60)})`
              : isLightTheme
                ? [
                  'linear-gradient(90deg, rgba(239, 68, 68, 0.65), rgba(147, 51, 234, 0.65))',
                  'linear-gradient(90deg, rgba(147, 51, 234, 0.65), rgba(59, 130, 246, 0.65))',
                  'linear-gradient(90deg, rgba(59, 130, 246, 0.65), rgba(239, 68, 68, 0.65))'
                ]
                : [
                  'linear-gradient(90deg, rgba(239, 68, 68, 0.45), rgba(147, 51, 234, 0.45))',
                  'linear-gradient(90deg, rgba(147, 51, 234, 0.45), rgba(59, 130, 246, 0.45))',
                  'linear-gradient(90deg, rgba(59, 130, 246, 0.45), rgba(239, 68, 68, 0.45))'
                ]
        }}
        transition={{
          duration: isPlaying ? 12 : 2,
          repeat: isPlaying ? Infinity : 0,
          ease: 'linear'
        }}
      />

      {/* Decorative Glass Elements - Theme-aware visibility */}
      <div
        className="absolute top-2 right-4 w-8 h-8 rounded-full blur-lg"
        style={{
          opacity: getThemeAwareOpacity(0.6, 0.9),
          background: palette
            ? `linear-gradient(135deg, ${palette.primary}${getThemeAwareColorIntensity(40, 70)}, transparent)`
            : `linear-gradient(135deg, ${isLightTheme ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)'}, transparent)`
        }}
      />
      <div
        className="absolute bottom-2 left-4 w-6 h-6 rounded-full blur-md"
        style={{
          opacity: getThemeAwareOpacity(0.5, 0.8),
          background: palette
            ? `linear-gradient(45deg, ${palette.accent}${getThemeAwareColorIntensity(45, 75)}, transparent)`
            : `linear-gradient(45deg, ${isLightTheme ? 'rgba(147, 51, 234, 0.5)' : 'rgba(147, 51, 234, 0.30)'}, transparent)`
        }}
      />

      {/* Mobile Thin Top Seek Bar (< md screens) */}
      <div
        className="md:hidden absolute top-0 left-0 right-0 h-1 bg-white/20 cursor-pointer z-30"
        onClick={(e) => { e.stopPropagation(); handleProgressClick(e); }}
        title="Tap to seek"
      >
        <div
          className="h-full bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all"
          style={{ width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%` }}
        />
      </div>

      {/* Content with Mobile-Responsive Layout */}
      <div className="relative z-10 flex items-center px-3 md:px-4 gap-2 md:gap-4 h-full justify-between">
        {/* Sidebar Toggle Button (Hidden on mobile < md) */}
        <motion.button
          onClick={onToggleSidebar}
          className="hidden md:flex text-white/80 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10"
          title="Toggle sidebar"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PanelLeft className="w-5 h-5" />
        </motion.button>

        {/* Enhanced Song Info Section */}
        <div
          className="flex items-center gap-2.5 flex-1 min-w-0 md:w-80 md:flex-initial cursor-pointer"
          onClick={onOpenExpandedPlayer}
        >
          <motion.div
            className="relative flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-11 h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl overflow-hidden shadow-xl">
              <img
                src={selectMusicPlayerImage(currentSong)}
                alt={currentSong.name}
                className="w-full h-full object-cover"
              />

              {/* Spinning vinyl effect when playing */}
              <AnimatePresence>
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      opacity: { duration: 0.3 },
                      rotate: { duration: 4, repeat: Infinity, ease: 'linear' }
                    }}
                    className="absolute inset-0 border border-white/40 rounded-lg md:rounded-xl"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.15), transparent)'
                    }}
                  />
                )}
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg md:rounded-xl pointer-events-none" />
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs md:text-sm font-semibold text-white truncate drop-shadow-md">
                {currentSong.name}
              </h4>
              {settings.showWaveform && (
                <div className="flex items-center">
                  <AudioVisualizer isPlaying={isPlaying} size="sm" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] md:text-xs text-white/70 truncate drop-shadow">
                {currentSong.primaryArtists}
              </p>
              <span className="md:hidden text-[10px] text-red-300 font-mono font-medium">
                {formatTime(currentTime)} / {formatTime(displayDuration)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Player Controls (Visible on mobile < md) */}
        <div className="flex md:hidden items-center gap-1 flex-shrink-0">
          <motion.button
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg bg-red-500 hover:bg-red-600 transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </motion.button>
          <motion.button
            onClick={(e) => { e.stopPropagation(); playNext(); }}
            title="Next track"
            className="p-2 text-white/80 hover:text-white"
            whileTap={{ scale: 0.9 }}
          >
            <SkipForward className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Enhanced Player Controls (Hidden on mobile < md) */}
        <div className="hidden md:flex flex-1 flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => setIsShuffle(!isShuffle)}
              title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
              aria-pressed={isShuffle ? "true" : "false"}
              className={cn(
                'text-white/70 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10',
                isShuffle && palette ? `text-[${palette.primary}] bg-[${palette.primary}]/10` : isShuffle && 'text-red-400 bg-red-400/10'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Shuffle className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={playPrevious}
              title="Previous track"
              className="text-white/70 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <SkipBack className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-pressed={isPlaying ? "true" : "false"}
              className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-300 border border-white/30"
              style={{
                background: palette
                  ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
                  : 'linear-gradient(135deg, #ef4444, #dc2626)'
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              animate={{
                boxShadow: isPlaying
                  ? palette
                    ? [
                      `0 0 20px ${palette.primary}50`,
                      `0 0 30px ${palette.secondary}50`,
                      `0 0 20px ${palette.accent}50`
                    ]
                    : [
                      '0 0 20px rgba(239, 68, 68, 0.5)',
                      '0 0 30px rgba(147, 51, 234, 0.5)',
                      '0 0 20px rgba(239, 68, 68, 0.5)'
                    ]
                  : palette
                    ? `0 0 15px ${palette.primary}40`
                    : '0 0 15px rgba(239, 68, 68, 0.4)'
              }}
              transition={{
                boxShadow: { duration: 2, repeat: isPlaying ? Infinity : 0 }
              }}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </motion.button>

            <motion.button
              onClick={playNext}
              title="Next track"
              className="text-white/70 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => {
                if (repeatMode === 'none') setRepeatMode('all');
                else if (repeatMode === 'all') setRepeatMode('one');
                else setRepeatMode('none');
              }}
              title={repeatMode === 'none' ? 'Enable repeat' : repeatMode === 'all' ? 'Repeat one' : 'Disable repeat'}
              aria-pressed={repeatMode !== 'none' ? "true" : "false"}
              className={cn(
                'text-white/70 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10',
                repeatMode !== 'none' && palette ? `text-[${palette.primary}] bg-[${palette.primary}]/10` : repeatMode !== 'none' && 'text-red-400 bg-red-400/10'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Repeat className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="w-full max-w-2xl flex items-center gap-3">
            <span className="text-xs text-white/80 w-10 text-right font-medium">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <div
                className="h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer shadow-inner"
                onClick={handleProgressClick}
              >
                <motion.div
                  className="h-full rounded-full shadow-lg"
                  style={{
                    background: palette
                      ? `linear-gradient(90deg, ${palette.primary}, ${palette.secondary})`
                      : 'linear-gradient(90deg, #ef4444, #a855f7)',
                    width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%`
                  }}
                  animate={{
                    boxShadow: isPlaying
                      ? palette
                        ? [
                          `0 0 10px ${palette.primary}60`,
                          `0 0 15px ${palette.secondary}60`,
                          `0 0 10px ${palette.primary}60`
                        ]
                        : [
                          '0 0 10px rgba(239, 68, 68, 0.6)',
                          '0 0 15px rgba(147, 51, 234, 0.6)',
                          '0 0 10px rgba(239, 68, 68, 0.6)'
                        ]
                      : 'none'
                  }}
                  transition={{
                    boxShadow: { duration: 2, repeat: isPlaying ? Infinity : 0 }
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-white/80 w-10 font-medium">
              {formatTime(displayDuration)}
            </span>
          </div>
        </div>

        {/* Enhanced Volume Control and Queue (Hidden on mobile < md) */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3 w-40">
            <motion.button
              onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
              title={volume === 0 ? 'Unmute' : 'Mute'}
              aria-pressed={volume === 0 ? "true" : "false"}
              className="text-white/70 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </motion.button>
            <div className="flex-1 relative">
              <div
                className="h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer shadow-inner"
                onClick={handleVolumeChange}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${volume * 100}%`,
                    background: palette
                      ? `linear-gradient(90deg, ${palette.muted}, ${palette.vibrant})`
                      : 'linear-gradient(90deg, rgba(255,255,255,0.7), rgba(255,255,255,0.9))'
                  }}
                  animate={{
                    boxShadow: volume > 0
                      ? palette
                        ? `0 0 8px ${palette.vibrant}40`
                        : '0 0 8px rgba(255,255,255,0.4)'
                      : 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sleep Timer Button */}
          <motion.button
            onClick={() => setIsSleepModalOpen(true)}
            className={`relative p-2 transition-all duration-300 rounded-lg hover:bg-white/10 ${sleepTimerOption !== 'off' ? 'text-red-400 font-bold bg-red-500/20' : 'text-white/70 hover:text-white'
              }`}
            title={sleepTimerOption !== 'off' ? `Sleep Timer: ${sleepTimerOption}` : 'Sleep Timer'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Moon className="w-5 h-5" />
            {sleepTimerRemaining !== null && (
              <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.2 rounded-full shadow">
                {Math.ceil(sleepTimerRemaining / 60)}m
              </span>
            )}
          </motion.button>

          {/* Equalizer (EQ) Button */}
          <motion.button
            onClick={() => setIsEqModalOpen(true)}
            className="p-2 text-white/70 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/10"
            title="Audio Equalizer (EQ)"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sliders className="w-5 h-5" />
          </motion.button>

          {/* Share Song Button */}
          <motion.button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 text-white/70 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/10"
            title="Share Song"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Share2 className="w-5 h-5" />
          </motion.button>

          {/* Enhanced Queue Button with Badge */}
          <motion.button
            onClick={onOpenExpandedPlayer}
            className="relative p-2 text-white/70 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/10"
            title="Open queue"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ListMusic className="w-5 h-5" />
            {queue.length > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg border border-white/30"
                style={{
                  background: palette
                    ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
                    : 'linear-gradient(135deg, #ef4444, #dc2626)'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {queue.length}
              </motion.span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Modals */}
      <SleepTimerModal isOpen={isSleepModalOpen} onClose={() => setIsSleepModalOpen(false)} />
      <EqualizerModal isOpen={isEqModalOpen} onClose={() => setIsEqModalOpen(false)} />
      <ShareSongModal song={currentSong} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

      {/* Outer glow effect with dynamic colors - Theme-aware visibility */}
      <div
        className="absolute inset-0 -z-10 blur-xl scale-105"
        style={{
          opacity: getThemeAwareOpacity(0.4, 0.7),
          background: palette
            ? `linear-gradient(90deg, ${palette.primary}${getThemeAwareColorIntensity(25, 50)}, ${palette.secondary}${getThemeAwareColorIntensity(20, 45)})`
            : `linear-gradient(90deg, ${isLightTheme ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.25)'}, ${isLightTheme ? 'rgba(147, 51, 234, 0.40)' : 'rgba(147, 51, 234, 0.20)'})`
        }}
      />
    </motion.div>
  );
};

export default MusicPlayer;