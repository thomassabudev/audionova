import React, { useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 18, height: 18, barWidth: 2, barCount: 3, gap: 1 },
    md: { width: 24, height: 24, barWidth: 3, barCount: 3, gap: 2 },
    lg: { width: 32, height: 32, barWidth: 4, barCount: 3, gap: 3 }
  };
  
  const config = sizeConfig[size];
  
  return (
    <div 
      ref={containerRef}
      className={`inline-flex items-end justify-center ${className}`}
      style={{ 
        width: config.width, 
        height: config.height 
      }}
      role="img"
      aria-label={isPlaying ? "Currently playing" : "Audio visualizer"}
    >
      {Array.from({ length: config.barCount }).map((_, index) => (
        <div
          key={index}
          className={`bg-red-500 rounded-t transition-all duration-150 ${
            isPlaying 
              ? 'animate-pulse' 
              : ''
          }`}
          style={{
            width: config.barWidth,
            height: `${20 + (index * 10)}%`,
            marginLeft: index === 0 ? 0 : config.gap,
            animationDelay: isPlaying ? `${index * 100}ms` : '0ms',
            animationDuration: isPlaying ? '0.8s' : '0s',
            animationIterationCount: isPlaying ? 'infinite' : '1'
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;