import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumLoaderProps {
  isFirstVisit: boolean;
}

const MESSAGES = [
  "Loading your soundtrack...",
  "Curating your experience...",
  "Preparing your library...",
  "Syncing your playlists...",
  "Almost ready..."
];

export default function PremiumLoader({ isFirstVisit }: PremiumLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages only on first visit
  useEffect(() => {
    if (!isFirstVisit) return;
    
    const interval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, MESSAGES.length - 1));
    }, 1500); // 1.5s per message
    
    return () => clearInterval(interval);
  }, [isFirstVisit]);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090B] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
    >
      {/* Inline styles for ambient particles and equalizer to avoid polluting global css */}
      <style>{`
        @keyframes ambient-float {
          0% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.4; }
          100% { transform: translateY(0) scale(1); opacity: 0.2; }
        }
        
        @keyframes eq-play {
          0% { height: 8px; }
          50% { height: 100%; }
          100% { height: 8px; }
        }
        
        .eq-bar {
          width: 4px;
          background-color: white;
          border-radius: 9999px;
          animation: eq-play 1.2s ease-in-out infinite;
          transform-origin: bottom;
          will-change: height;
        }
        
        .ambient-particle {
          position: absolute;
          border-radius: 50%;
          filter: blur(8px);
          animation: ambient-float 8s ease-in-out infinite;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Subtle Radial Glow in background */}
      <motion.div 
        className="absolute w-[600px] h-[600px] rounded-full bg-white/5 blur-[120px] pointer-events-none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      {/* Ambient Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i}
            className="ambient-particle bg-white/10"
            style={{
              width: `${Math.random() * 40 + 20}px`,
              height: `${Math.random() * 40 + 20}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 4 + 6}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo and Glow Interaction */}
        <div className="relative flex items-center justify-center mb-10">
          <motion.div
            className="absolute inset-0 bg-white/20 blur-[30px] rounded-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <motion.div
            className="relative z-10 flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img src="/logo.jpg" alt="AudioNova" className="w-12 h-12 object-contain rounded-xl shadow-2xl" />
            <span className="font-black text-2xl tracking-tight text-white">AudioNova</span>
          </motion.div>
        </div>

        {/* 12-bar Equalizer simulating audio waveforms */}
        <motion.div 
          className="flex items-end justify-center gap-1.5 h-12 mb-8 w-48"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className="eq-bar"
              style={{
                // Stagger animations to look like a waveform
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${1.0 + (i % 3) * 0.2}s`,
              }}
            />
          ))}
        </motion.div>

        {/* Rotating Premium Messages (First Visit Only) */}
        {isFirstVisit && (
          <div className="h-8 flex items-center justify-center overflow-hidden w-64 text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="text-white/60 text-sm font-medium tracking-wide"
              >
                {MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
