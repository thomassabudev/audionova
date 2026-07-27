import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Music2, ListMusic, Sliders, Moon, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { useMusic } from '../context/MusicContext';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import AudioVisualizer from './AudioVisualizer';
import LyricsViewer from './LyricsViewer';
import QueuePanel from './QueuePanel';
import EqualizerPanel from './EqualizerPanel';
import SleepTimerModal from './SleepTimerModal';
import ShareSongModal from './ShareSongModal';

type Tab = 'player' | 'lyrics' | 'queue' | 'eq';

interface ExpandedSongPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'player', label: 'Player',    icon: <Play className="w-3.5 h-3.5" /> },
  { id: 'lyrics', label: 'Lyrics',    icon: <Music2 className="w-3.5 h-3.5" /> },
  { id: 'queue',  label: 'Queue',     icon: <ListMusic className="w-3.5 h-3.5" /> },
  { id: 'eq',     label: 'Equalizer', icon: <Sliders className="w-3.5 h-3.5" /> },
];

const ExpandedSongPlayer: React.FC<ExpandedSongPlayerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('player');
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    playPrevious,
    playNext,
    currentTime,
    duration,
    seekTo,
    volume,
    setVolume,
    sleepTimerOption,
    sleepTimerRemaining,
  } = useMusic();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageUrl = () => {
    if (!currentSong?.image) return null;
    try {
      if (typeof currentSong.image === 'string') return currentSong.image || null;
      if (Array.isArray(currentSong.image)) {
        if (!currentSong.image.length) return null;
        const first = currentSong.image[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'object' && first !== null && 'link' in first) {
          return getHighestQualityImage(currentSong.image as unknown as Array<{ quality?: string; link: string }>);
        }
      }
    } catch { /* ignore */ }
    return null;
  };

  if (!currentSong) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold">Now Playing</h2>
              <div className="flex items-center gap-1">
                {/* Sleep Timer */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSleepModalOpen(true)}
                  className={`relative ${sleepTimerOption !== 'off' ? 'text-red-400 font-bold bg-red-500/20' : ''}`}
                  title={sleepTimerOption !== 'off' ? `Sleep Timer: ${sleepTimerOption}` : 'Sleep Timer'}
                >
                  <Moon className="w-5 h-5" />
                  {sleepTimerRemaining !== null && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.2 rounded-full shadow">
                      {Math.ceil(sleepTimerRemaining / 60)}m
                    </span>
                  )}
                </Button>

                {/* Share Song */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsShareModalOpen(true)}
                  title="Share Song"
                >
                  <Share2 className="w-5 h-5" />
                </Button>

                {/* Close */}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border shrink-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">

              {/* NOW PLAYING */}
              {activeTab === 'player' && (
                <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto">
                  {/* Album art */}
                  <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden shadow-lg mb-6">
                    {getImageUrl() ? (
                      <img
                        src={getImageUrl()!}
                        alt={currentSong.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Play className="w-16 h-16 text-white fill-current ml-1" />
                      </div>
                    )}
                  </div>

                  {/* Song info */}
                  <div className="text-center mb-6 w-full px-2">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground truncate">{currentSong.name}</h3>
                      <AudioVisualizer isPlaying={isPlaying} size="md" />
                    </div>
                    <p className="text-muted-foreground truncate">{currentSong.primaryArtists}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {typeof currentSong.album === 'object' && currentSong.album !== null && 'name' in currentSong.album
                        ? (currentSong.album as { name: string }).name
                        : typeof currentSong.album === 'string'
                          ? currentSong.album
                          : ''}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full max-w-xs mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={e => seekTo(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      aria-label="Seek position"
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <Button variant="ghost" size="icon" className="h-12 w-12" onClick={playPrevious}>
                      <SkipBack className="w-6 h-6" />
                    </Button>
                    <Button className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90" onClick={togglePlayPause}>
                      {isPlaying
                        ? <Pause className="w-7 h-7 text-primary-foreground" />
                        : <Play  className="w-7 h-7 text-primary-foreground ml-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-12 w-12" onClick={playNext}>
                      <SkipForward className="w-6 h-6" />
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={e => setVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      aria-label="Volume control"
                    />
                  </div>
                </div>
              )}

              {/* LYRICS */}
              {activeTab === 'lyrics' && (
                <div className="h-full overflow-hidden">
                  <LyricsViewer
                    currentSong={currentSong as any}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                  />
                </div>
              )}

              {/* QUEUE */}
              {activeTab === 'queue' && (
                <div className="h-full overflow-hidden">
                  <QueuePanel />
                </div>
              )}

              {/* EQUALIZER */}
              {activeTab === 'eq' && (
                <div className="h-full overflow-y-auto">
                  <EqualizerPanel />
                </div>
              )}
            </div>

            {/* Modals */}
            <SleepTimerModal isOpen={isSleepModalOpen} onClose={() => setIsSleepModalOpen(false)} />
            <ShareSongModal song={currentSong} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExpandedSongPlayer;
