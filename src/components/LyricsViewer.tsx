// src/components/LyricsViewer.tsx
// Component for displaying synced lyrics with auto-scroll and karaoke highlight

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSyncedLyrics, parseLRC, translateLyrics } from '../services/lyricsProvider';
import type { LyricsLine, LyricsResponse } from '../services/lyricsProvider';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import type { Song } from '../services/jiosaavnApi';

interface LyricsViewerProps {
  currentSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  onReportLyrics?: () => void;
  onContributeLyrics?: () => void;
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({ 
  currentSong, 
  currentTime, 
  isPlaying,
  onReportLyrics,
  onContributeLyrics
}) => {
  const [lyrics, setLyrics] = useState<LyricsResponse | null>(null);
  const [parsedLines, setParsedLines] = useState<LyricsLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [translatedLines, setTranslatedLines] = useState<string[]>([]);
  const [isKaraokeMode, setIsKaraokeMode] = useState<boolean>(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const currentLineRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!currentSong) {
      setLyrics(null);
      setParsedLines([]);
      setCurrentLineIndex(-1);
      return;
    }

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const lyricsData = await fetchSyncedLyrics(currentSong.id);
        setLyrics(lyricsData);
        
        if (lyricsData?.lines && lyricsData.lines.length > 0) {
          setParsedLines(lyricsData.lines);
        } else {
          setParsedLines([]);
        }
      } catch (err) {
        console.error('Failed to fetch lyrics:', err);
        setError('Failed to load lyrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [currentSong]);

  // Update current line based on audio time
  useEffect(() => {
    if (!isPlaying || parsedLines.length === 0) return;

    // Find the current line based on currentTime
    let newIndex = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time <= currentTime) {
        newIndex = i;
      } else {
        break;
      }
    }
    
    setCurrentLineIndex(newIndex);
  }, [currentTime, isPlaying, parsedLines]);

  // Auto-scroll to current line
  useEffect(() => {
    if (!isKaraokeMode && currentLineRef.current && lyricsContainerRef.current) {
      currentLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLineIndex, isKaraokeMode]);

  // Translate lyrics when toggle is switched
  useEffect(() => {
    if (showTranslation && parsedLines.length > 0) {
      const translateAll = async () => {
        const translations = await Promise.all(
          parsedLines.map(line => translateLyrics(line.text, 'en'))
        );
        setTranslatedLines(translations);
      };
      
      translateAll();
    }
  }, [showTranslation, parsedLines]);

  // Parse LRC if we get raw LRC text (for future implementation)
  const parseLrcText = (lrcText: string) => {
    const lines = parseLRC(lrcText);
    setParsedLines(lines);
  };

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No song selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show fallback UI if no lyrics available
  if (!lyrics || !lyrics.lines || lyrics.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Lyrics not available</h3>
        <p className="text-muted-foreground mb-4">
          {lyrics?.externalUrl ? (
            <a 
              href={lyrics.externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View official lyrics
            </a>
          ) : (
            "We couldn't find lyrics for this song"
          )}
        </p>
        <button 
          onClick={onContributeLyrics}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 mb-2"
        >
          Contribute Lyrics
        </button>
        {lyrics?.attribution && (
          <p className="text-xs text-muted-foreground mt-4">
            {lyrics.attribution}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex justify-between items-center p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Lyrics</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`px-3 py-1 text-sm rounded-full ${
              showTranslation 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Translate
          </button>
          <button
            onClick={() => setIsKaraokeMode(!isKaraokeMode)}
            className={`px-3 py-1 text-sm rounded-full ${
              isKaraokeMode 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Karaoke
          </button>
        </div>
      </div>

      {/* Lyrics content */}
      <div 
        ref={lyricsContainerRef}
        className={`flex-1 overflow-y-auto p-4 ${
          isKaraokeMode ? 'bg-black' : ''
        }`}
      >
        {isKaraokeMode ? (
          // Karaoke mode - fullscreen with blurred background
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{
              backgroundImage: currentSong.image ? `url(${getHighestQualityImage(currentSong.image)})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            <div className="relative z-10 text-center max-w-2xl w-full">
              <AnimatePresence mode="wait">
                {currentLineIndex >= 0 && currentLineIndex < parsedLines.length ? (
                  <motion.div
                    key={currentLineIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl md:text-4xl font-bold text-white"
                  >
                    {showTranslation && translatedLines[currentLineIndex] 
                      ? translatedLines[currentLineIndex] 
                      : parsedLines[currentLineIndex].text}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xl text-white/80"
                  >
                    {currentSong.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setIsKaraokeMode(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          // Normal mode - scrollable list
          <div className="space-y-4">
            {parsedLines.map((line, index) => (
              <div
                key={index}
                ref={index === currentLineIndex ? currentLineRef : null}
                className={`p-2 rounded transition-all duration-300 ${
                  index === currentLineIndex
                    ? 'bg-primary/20 text-primary font-medium scale-105'
                    : 'text-muted-foreground'
                }`}
              >
                {showTranslation && translatedLines[index] 
                  ? translatedLines[index] 
                  : line.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with attribution */}
      {lyrics && lyrics.attribution && !isKaraokeMode && (
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {lyrics.attribution}
          </p>
          <button 
            onClick={onReportLyrics}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Report
          </button>
        </div>
      )}
    </div>
  );
};

export default LyricsViewer;