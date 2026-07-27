// src/components/SleepTimerModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Clock, X, Check, Plus, Power } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS = [
  { id: '5m', label: '5 Minutes', minutes: 5 },
  { id: '15m', label: '15 Minutes', minutes: 15 },
  { id: '30m', label: '30 Minutes', minutes: 30 },
  { id: '45m', label: '45 Minutes', minutes: 45 },
  { id: '60m', label: '1 Hour', minutes: 60 },
  { id: 'end_of_song', label: 'End of Current Song', minutes: 0 },
];

const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const {
    sleepTimerOption,
    sleepTimerRemaining,
    setSleepTimerOption,
    cancelSleepTimer,
    extendSleepTimer
  } = useMusic();

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  const formatRemainingTime = (seconds: number | null) => {
    if (seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm bg-card/95 border border-border rounded-2xl p-5 shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Moon className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Sleep Timer</h3>
                <p className="text-xs text-muted-foreground">Stop audio automatically</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Timer Countdown Banner */}
          {sleepTimerOption !== 'off' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                <div>
                  <div className="text-xs font-semibold text-red-400">
                    {sleepTimerOption === 'end_of_song' 
                      ? 'Stopping at end of song' 
                      : `Active: ${formatRemainingTime(sleepTimerRemaining)} left`}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Audio will fade out softly</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {sleepTimerOption !== 'end_of_song' && (
                  <button
                    onClick={() => extendSleepTimer(15)}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors flex items-center gap-0.5"
                    title="Add 15 minutes"
                  >
                    <Plus className="w-3 h-3" />
                    <span>15m</span>
                  </button>
                )}
                <button
                  onClick={cancelSleepTimer}
                  className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Cancel timer"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Timer Options List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {TIMER_OPTIONS.map((opt) => {
              const isSelected = sleepTimerOption === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSleepTimerOption(opt.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-red-500 text-white font-semibold shadow-md'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Turn off option if active */}
          {sleepTimerOption !== 'off' && (
            <button
              onClick={() => {
                cancelSleepTimer();
                onClose();
              }}
              className="w-full py-2 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors border-t border-border mt-2 pt-3 text-center"
            >
              Turn Off Sleep Timer
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SleepTimerModal;
