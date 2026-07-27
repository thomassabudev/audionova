// src/components/AudioVisualizer.tsx
import React from 'react';

interface AudioVisualizerProps {
  isPlaying?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isPlaying = false, 
  size = 'md',
  className = '' 
}) => {
  const sizeConfig = {
    sm: { width: 24, height: 16, barWidth: 3, barCount: 4, gap: 2 },
    md: { width: 30, height: 20, barWidth: 4, barCount: 4, gap: 2.5 },
    lg: { width: 38, height: 26, barWidth: 5, barCount: 4, gap: 3 }
  };
  
  const config = sizeConfig[size];
  
  return (
    <div 
      className={`inline-flex items-end justify-center px-1 py-0.5 rounded-md bg-black/20 border border-white/10 backdrop-blur-xs ${className}`}
      style={{ 
        width: config.width, 
        height: config.height 
      }}
      role="img"
      aria-label={isPlaying ? "Audio playing visualizer" : "Audio visualizer"}
    >
      {[60, 100, 40, 85].map((hPercent, index) => (
        <div
          key={index}
          className="rounded-full bg-gradient-to-t from-red-500 via-pink-500 to-purple-400 shadow-[0_0_6px_rgba(239,68,68,0.7)] transition-all duration-300"
          style={{
            width: config.barWidth,
            height: isPlaying ? `${Math.max(25, (hPercent + index * 15) % 100)}%` : '25%',
            marginLeft: index === 0 ? 0 : config.gap,
            animation: isPlaying ? `equalizer-pulse ${0.5 + index * 0.12}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes equalizer-pulse {
          0% { height: 15%; opacity: 0.5; }
          100% { height: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AudioVisualizer;