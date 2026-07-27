// src/components/LyricsViewer.tsx
// Component for displaying synced lyrics with auto-scroll, karaoke highlight, Malayalam script singing mode & translation

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSyncedLyrics, parseLRC, translateLyricsBatch } from '../services/lyricsProvider';
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

type TransMode = 'off' | 'sing_ml' | 'sing_en' | 'meaning';

const SUPPORTED_LANGUAGES = [
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'kn', label: 'Kannada (കന്നഡ)' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
];

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
  const [transMode, setTransMode] = useState<TransMode>('off');
  const [selectedLang, setSelectedLang] = useState<string>('ml');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
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
      setTranslatedLines([]);
      setTransMode('off');
      return;
    }

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const lyricsData = await fetchSyncedLyrics(
          currentSong.id,
          currentSong.name,
          currentSong.primaryArtists,
          (currentSong as any).hasLyrics
        );
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
  }, [currentSong?.id, currentSong?.name]);

  // Update current line based on audio time
  useEffect(() => {
    if (!isPlaying || parsedLines.length === 0) return;

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

  // Process lyrics when mode or language changes
  useEffect(() => {
    if (transMode === 'off' || parsedLines.length === 0) return;

    let isMounted = true;
    const runTranslation = async () => {
      setIsTranslating(true);
      try {
        const lineTexts = parsedLines.map(l => l.text);
        const translated = await translateLyricsBatch(lineTexts, selectedLang, transMode);
        if (isMounted) {
          setTranslatedLines(translated);
        }
      } catch (err) {
        console.error('Translation error:', err);
      } finally {
        if (isMounted) setIsTranslating(false);
      }
    };

    runTranslation();

    return () => { isMounted = false; };
  }, [transMode, selectedLang, parsedLines]);

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
      <div className="flex justify-between items-center p-4 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Lyrics</h2>
          {isTranslating && (
            <span className="text-xs text-red-500 animate-pulse flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              Processing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language selector dropdown when Meaning Mode is active */}
          {transMode === 'meaning' && (
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="text-xs bg-accent text-foreground border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}

          {/* 1. Sing in Malayalam Script Mode */}
          <button
            onClick={() => setTransMode(transMode === 'sing_ml' ? 'off' : 'sing_ml')}
            className={`px-3 py-1 text-xs md:text-sm rounded-full transition-colors flex items-center gap-1 font-medium ${
              transMode === 'sing_ml' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Sing along in Malayalam script"
          >
            <span>🎤</span>
            <span>{transMode === 'sing_ml' ? 'Malayalam Sing Mode (ON)' : 'Sing (മലയാളത്തിൽ)'}</span>
          </button>

          {/* 2. Meaning Translation Mode */}
          <button
            onClick={() => setTransMode(transMode === 'meaning' ? 'off' : 'meaning')}
            className={`px-3 py-1 text-xs md:text-sm rounded-full transition-colors flex items-center gap-1 font-medium ${
              transMode === 'meaning' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Translate song meaning"
          >
            <span>📖</span>
            <span>{transMode === 'meaning' ? 'Meaning (ON)' : 'Meaning (അർത്ഥം)'}</span>
          </button>

          {/* 3. Manglish Sing Mode */}
          <button
            onClick={() => setTransMode(transMode === 'sing_en' ? 'off' : 'sing_en')}
            className={`px-3 py-1 text-xs md:text-sm rounded-full transition-colors flex items-center gap-1 font-medium ${
              transMode === 'sing_en' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Sing along in Manglish/English script"
          >
            <span>🔤</span>
            <span>Sing (Manglish)</span>
          </button>

          {/* Karaoke Mode */}
          <button
            onClick={() => setIsKaraokeMode(!isKaraokeMode)}
            className={`px-3 py-1 text-xs md:text-sm rounded-full transition-colors font-medium ${
              isKaraokeMode 
                ? 'bg-red-500 text-white shadow-sm' 
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
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md"></div>
            <div className="relative z-10 text-center max-w-2xl w-full">
              <AnimatePresence mode="wait">
                {currentLineIndex >= 0 && currentLineIndex < parsedLines.length ? (
                  <motion.div
                    key={currentLineIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <div className="text-2xl md:text-4xl font-bold text-white leading-relaxed">
                      {parsedLines[currentLineIndex].text}
                    </div>
                    {transMode !== 'off' && (
                      <div className="text-lg md:text-2xl text-red-400 font-medium italic">
                        {isTranslating && (!translatedLines[currentLineIndex] || translatedLines[currentLineIndex] === parsedLines[currentLineIndex].text) ? (
                          <span className="animate-pulse">Loading singing lyrics...</span>
                        ) : (
                          translatedLines[currentLineIndex] || parsedLines[currentLineIndex].text
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xl text-white/80 font-medium"
                  >
                    {currentSong.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setIsKaraokeMode(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          // Normal mode - scrollable list with dual-line display
          <div className="space-y-4">
            {parsedLines.map((line, index) => (
              <div
                key={index}
                ref={index === currentLineIndex ? currentLineRef : null}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  index === currentLineIndex
                    ? 'bg-red-500/15 border border-red-500/30 text-white font-semibold scale-[1.01] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Original lyrics line */}
                <div className="text-base leading-snug">{line.text}</div>
                
                {/* Processed line (Malayalam Sing Mode / Manglish / Meaning) */}
                {transMode !== 'off' && (
                  <div className="text-xs text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] opacity-75">
                      {transMode === 'sing_ml' ? '🎤' : transMode === 'sing_en' ? '🔤' : '📖'}
                    </span>
                    {isTranslating && (!translatedLines[index] || translatedLines[index] === line.text) ? (
                      <span className="animate-pulse opacity-70">Processing lyrics...</span>
                    ) : (
                      <span>{translatedLines[index] || line.text}</span>
                    )}
                  </div>
                )}
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
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Report
          </button>
        </div>
      )}
    </div>
  );
};

export default LyricsViewer;