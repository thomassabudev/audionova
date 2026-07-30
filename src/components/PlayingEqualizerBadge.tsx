import React from 'react';
import { motion } from 'framer-motion';

interface PlayingEqualizerBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isPlaying?: boolean;
}

export const PlayingEqualizerBadge: React.FC<PlayingEqualizerBadgeProps> = ({
  className = '',
  size = 'md',
  isPlaying = true
}) => {
  // Use exact valid Tailwind classes and explicit pixel animation values
  const sizeConfigs = {
    sm: { container: 'h-5 px-2 gap-0.5 min-w-[32px]', barWidth: 'w-1', maxHeight: 13 },
    md: { container: 'h-6 px-2.5 gap-1 min-w-[40px]', barWidth: 'w-1', maxHeight: 16 },
    lg: { container: 'h-7 px-3 gap-1 min-w-[48px]', barWidth: 'w-1.5', maxHeight: 20 },
  };

  const config = sizeConfigs[size] || sizeConfigs.md;
  const h = config.maxHeight;

  return (
    <div
      className={`inline-flex items-center justify-center bg-red-500/20 border border-red-500/40 backdrop-blur-md rounded-full px-2 py-0.5 shadow-lg shrink-0 ${config.container} ${className}`}
      title="Now Playing"
      style={{ zIndex: 10 }}
    >
      <motion.span
        className={`${config.barWidth} rounded-full bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 inline-block`}
        animate={isPlaying ? { height: [Math.round(h * 0.2), Math.round(h * 0.85), Math.round(h * 0.35), Math.round(h * 0.95), Math.round(h * 0.25)] } : { height: Math.round(h * 0.3) }}
        transition={{ duration: 0.75, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
      />
      <motion.span
        className={`${config.barWidth} rounded-full bg-gradient-to-t from-rose-500 via-pink-500 to-red-400 inline-block`}
        animate={isPlaying ? { height: [Math.round(h * 0.8), Math.round(h * 0.25), Math.round(h * 0.95), Math.round(h * 0.45), Math.round(h * 0.8)] } : { height: Math.round(h * 0.6) }}
        transition={{ duration: 0.6, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
      />
      <motion.span
        className={`${config.barWidth} rounded-full bg-gradient-to-t from-pink-500 via-purple-500 to-rose-400 inline-block`}
        animate={isPlaying ? { height: [Math.round(h * 0.35), Math.round(h * 0.95), Math.round(h * 0.3), Math.round(h * 0.85), Math.round(h * 0.25)] } : { height: Math.round(h * 0.4) }}
        transition={{ duration: 0.85, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
      />
      <motion.span
        className={`${config.barWidth} rounded-full bg-gradient-to-t from-purple-500 to-rose-500 inline-block`}
        animate={isPlaying ? { height: [Math.round(h * 0.9), Math.round(h * 0.3), Math.round(h * 0.75), Math.round(h * 0.25), Math.round(h * 0.9)] } : { height: Math.round(h * 0.8) }}
        transition={{ duration: 0.7, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
      />
    </div>
  );
};

export default PlayingEqualizerBadge;
