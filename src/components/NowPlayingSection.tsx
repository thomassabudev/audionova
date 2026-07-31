import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useAudioTime } from '../hooks/useAudioTime';
import { selectMusicPlayerImage } from '../utils/imageQualitySelector';
import { useDynamicTheme, useThemeCSS, useAnimatedGradient } from '../hooks/useDynamicTheme';
import { useThemeDetection } from '../hooks/useThemeDetection';

const NowPlayingSection: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    audioRef,
  } = useMusic();

  const { currentTime, duration } = useAudioTime(audioRef);

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

  // Don't render if no song is playing
  if (!currentSong) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    setVolume(percentage);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.25, 0.1, 0.25, 1],
          scale: { duration: 0.4 }
        }}
        className="relative group"
        style={themeCSS}
      >
        {/* Glassmorphism Container */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/20 shadow-xl">
          {/* Dynamic Background Gradient Overlay - Theme-aware visibility */}
          <div className="absolute inset-0" style={{ opacity: getThemeAwareOpacity(0.8, 0.95) }}>
            {palette ? (
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: isPlaying && currentAnimatedGradient
                    ? currentAnimatedGradient
                    : `linear-gradient(135deg, ${palette.primary}${getThemeAwareColorIntensity(30, 60)}, ${palette.secondary}${getThemeAwareColorIntensity(25, 55)}, ${palette.accent}${getThemeAwareColorIntensity(20, 50)})`
                }}
                transition={{
                  duration: isPlaying ? 2 : 1,
                  ease: 'easeInOut'
                }}
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${isLightTheme 
                ? 'from-red-500/50 via-purple-500/50 to-blue-500/50' 
                : 'from-red-500/25 via-purple-500/25 to-blue-500/25'
              }`} />
            )}
          </div>
          
          {/* Animated Background Blur with Dynamic Colors - Theme-aware visibility */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: getThemeAwareOpacity(0.6, 0.85) }}
            animate={{
              background: palette && isPlaying 
                ? [
                    `linear-gradient(45deg, ${palette.primary}${getThemeAwareColorIntensity(35, 65)}, ${palette.secondary}${getThemeAwareColorIntensity(30, 60)})`,
                    `linear-gradient(135deg, ${palette.secondary}${getThemeAwareColorIntensity(35, 65)}, ${palette.accent}${getThemeAwareColorIntensity(30, 60)})`,
                    `linear-gradient(225deg, ${palette.accent}${getThemeAwareColorIntensity(35, 65)}, ${palette.vibrant}${getThemeAwareColorIntensity(30, 60)})`,
                    `linear-gradient(315deg, ${palette.vibrant}${getThemeAwareColorIntensity(35, 65)}, ${palette.primary}${getThemeAwareColorIntensity(30, 60)})`
                  ]
                : palette
                ? `linear-gradient(45deg, ${palette.primary}${getThemeAwareColorIntensity(25, 55)}, ${palette.secondary}${getThemeAwareColorIntensity(20, 50)})`
                : isLightTheme
                ? [
                    'linear-gradient(45deg, rgba(239, 68, 68, 0.55), rgba(147, 51, 234, 0.55))',
                    'linear-gradient(135deg, rgba(147, 51, 234, 0.55), rgba(59, 130, 246, 0.55))',
                    'linear-gradient(225deg, rgba(59, 130, 246, 0.55), rgba(239, 68, 68, 0.55))',
                    'linear-gradient(315deg, rgba(239, 68, 68, 0.55), rgba(147, 51, 234, 0.55))'
                  ]
                : [
                    'linear-gradient(45deg, rgba(239, 68, 68, 0.35), rgba(147, 51, 234, 0.35))',
                    'linear-gradient(135deg, rgba(147, 51, 234, 0.35), rgba(59, 130, 246, 0.35))',
                    'linear-gradient(225deg, rgba(59, 130, 246, 0.35), rgba(239, 68, 68, 0.35))',
                    'linear-gradient(315deg, rgba(239, 68, 68, 0.35), rgba(147, 51, 234, 0.35))'
                  ]
            }}
            transition={{
              duration: isPlaying ? 8 : 2,
              repeat: isPlaying ? Infinity : 0,
              ease: 'linear'
            }}
          />

          {/* Content */}
          <div className="relative z-10 p-4 md:p-5">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Album Art */}
              <motion.div
                className="relative flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shadow-2xl">
                  <img
                    src={selectMusicPlayerImage(currentSong)}
                    alt={currentSong.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23a855f7" width="200" height="200"/%3E%3Ctext fill="%23ffffff" font-family="Arial" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
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
                          rotate: { duration: 3, repeat: Infinity, ease: 'linear' }
                        }}
                        className="absolute inset-0 border-2 border-white/30 rounded-full"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1), transparent)'
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Glass reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-xl" />
                </div>

                {/* Floating music notes animation */}
                <AnimatePresence>
                  {isPlaying && (
                    <>
                      {[...Array(2)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 0, x: 0 }}
                          animate={{
                            opacity: [0, 1, 0],
                            y: [-15, -35],
                            x: [0, Math.random() * 30 - 15]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.7,
                            ease: 'easeOut'
                          }}
                          className="absolute top-0 left-1/2 text-white/60 text-sm"
                        >
                          ♪
                        </motion.div>
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Song Info and Controls */}
              <div className="flex-1 text-center md:text-left">
                {/* Song Title and Artist */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-3"
                >
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1 drop-shadow-lg">
                    {currentSong.name}
                  </h3>
                  <p className="text-sm md:text-base text-white/80 drop-shadow-md">
                    {currentSong.primaryArtists}
                  </p>
                </motion.div>

                {/* Progress Bar */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-3 text-sm text-white/70 mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <div
                      className="flex-1 h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden backdrop-blur-sm"
                      onClick={handleProgressClick}
                    >
                      <motion.div
                        className="h-full rounded-full shadow-lg"
                        style={{
                          background: palette 
                            ? `linear-gradient(90deg, ${palette.primary}, ${palette.secondary})`
                            : 'linear-gradient(90deg, #ef4444, #a855f7)',
                          width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                        }}
                        animate={{
                          boxShadow: isPlaying 
                            ? palette
                              ? [
                                  `0 0 10px ${palette.primary}50`,
                                  `0 0 20px ${palette.secondary}50`,
                                  `0 0 10px ${palette.primary}50`
                                ]
                              : [
                                  '0 0 10px rgba(239, 68, 68, 0.5)',
                                  '0 0 20px rgba(147, 51, 234, 0.5)',
                                  '0 0 10px rgba(239, 68, 68, 0.5)'
                                ]
                            : palette
                            ? `0 0 5px ${palette.primary}30`
                            : '0 0 5px rgba(239, 68, 68, 0.3)'
                        }}
                        transition={{
                          boxShadow: { duration: 2, repeat: isPlaying ? Infinity : 0 }
                        }}
                      />
                    </div>
                    <span>{formatTime(duration)}</span>
                  </div>
                </motion.div>

                {/* Control Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-3 mb-3"
                >
                  <motion.button
                    onClick={playPrevious}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <SkipBack className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    onClick={togglePlayPause}
                    className="p-3 rounded-full text-white shadow-2xl transition-all duration-300"
                    style={{
                      background: palette 
                        ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
                        : 'linear-gradient(135deg, #ef4444, #dc2626)'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      boxShadow: isPlaying 
                        ? palette
                          ? [
                              `0 0 20px ${palette.primary}40`,
                              `0 0 30px ${palette.secondary}40`,
                              `0 0 20px ${palette.accent}40`
                            ]
                          : [
                              '0 0 20px rgba(239, 68, 68, 0.4)',
                              '0 0 30px rgba(147, 51, 234, 0.4)',
                              '0 0 20px rgba(239, 68, 68, 0.4)'
                            ]
                        : palette
                        ? `0 0 15px ${palette.primary}30`
                        : '0 0 15px rgba(239, 68, 68, 0.3)'
                    }}
                    transition={{
                      boxShadow: { duration: 2, repeat: isPlaying ? Infinity : 0 }
                    }}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </motion.button>

                  <motion.button
                    onClick={playNext}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <SkipForward className="w-4 h-4" />
                  </motion.button>
                </motion.div>

                {/* Volume Control */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-3 max-w-xs mx-auto md:mx-0"
                >
                  <Volume2 className="w-4 h-4 text-white/70" />
                  <div
                    className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden backdrop-blur-sm"
                    onClick={handleVolumeChange}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ 
                        width: `${volume * 100}%`,
                        background: palette 
                          ? `linear-gradient(90deg, ${palette.muted}, ${palette.vibrant})`
                          : 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.8))'
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/70 w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Decorative elements with dynamic colors - Theme-aware visibility */}
          <div 
            className="absolute top-3 right-3 w-12 h-12 rounded-full blur-xl"
            style={{
              opacity: getThemeAwareOpacity(0.7, 0.95),
              background: palette 
                ? `linear-gradient(135deg, ${palette.primary}${getThemeAwareColorIntensity(40, 70)}, transparent)`
                : `linear-gradient(135deg, ${isLightTheme ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)'}, transparent)`
            }}
          />
          <div 
            className="absolute bottom-3 left-3 w-10 h-10 rounded-full blur-lg"
            style={{
              opacity: getThemeAwareOpacity(0.6, 0.9),
              background: palette 
                ? `linear-gradient(45deg, ${palette.accent}${getThemeAwareColorIntensity(50, 80)}, transparent)`
                : `linear-gradient(45deg, ${isLightTheme ? 'rgba(147, 51, 234, 0.6)' : 'rgba(147, 51, 234, 0.35)'}, transparent)`
            }}
          />
        </div>

        {/* Outer glow effect with dynamic colors - Theme-aware visibility */}
        <div 
          className="absolute inset-0 -z-10 rounded-2xl blur-xl scale-105"
          style={{
            opacity: getThemeAwareOpacity(0.8, 0.95),
            background: palette 
              ? `linear-gradient(135deg, ${palette.primary}${getThemeAwareColorIntensity(35, 65)}, ${palette.secondary}${getThemeAwareColorIntensity(30, 60)})`
              : `linear-gradient(135deg, ${isLightTheme ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.35)'}, ${isLightTheme ? 'rgba(147, 51, 234, 0.55)' : 'rgba(147, 51, 234, 0.30)'})`
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default NowPlayingSection;