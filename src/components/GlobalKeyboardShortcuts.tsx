// src/components/GlobalKeyboardShortcuts.tsx
import React, { useEffect, useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { useAudioTime } from '../hooks/useAudioTime';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

interface GlobalKeyboardShortcutsProps {
  onToggleExpandedPlayer?: () => void;
}

const GlobalKeyboardShortcuts: React.FC<GlobalKeyboardShortcutsProps> = ({ onToggleExpandedPlayer }) => {
  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    seekTo,
    volume,
    setVolume,
    audioRef,
  } = useMusic();

  const { currentTime, duration } = useAudioTime(audioRef);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is typing inside text inputs, textareas or contentEditable elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      // 1. Shift + ? -> Open Shortcuts Modal
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsModalOpen(prev => !prev);
        return;
      }

      // Playback shortcuts require an active song
      if (!currentSong) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;

        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(duration, currentTime + 5));
          break;

        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 5));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;

        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;

        case 'KeyM':
          e.preventDefault();
          setVolume(volume > 0 ? 0 : 0.7);
          break;

        case 'KeyL':
          e.preventDefault();
          if (onToggleExpandedPlayer) {
            onToggleExpandedPlayer();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, isPlaying, togglePlayPause, currentTime, duration, seekTo, volume, setVolume, onToggleExpandedPlayer]);

  return <KeyboardShortcutsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />;
};

export default GlobalKeyboardShortcuts;
