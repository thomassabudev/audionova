import React, { useState, useEffect } from 'react';

export function useAudioTime(audioRef: React.RefObject<HTMLAudioElement>) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      if (audioEl.currentTime !== undefined && !isNaN(audioEl.currentTime)) {
        setCurrentTime(audioEl.currentTime);
      }
    };

    const handleDurationChange = () => {
      if (audioEl.duration && !isNaN(audioEl.duration) && isFinite(audioEl.duration)) {
        setDuration(audioEl.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioEl.duration && !isNaN(audioEl.duration) && isFinite(audioEl.duration)) {
        setDuration(audioEl.duration);
      }
      setCurrentTime(0);
    };

    // Initialize values immediately
    handleTimeUpdate();
    handleDurationChange();

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('durationchange', handleDurationChange);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('durationchange', handleDurationChange);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioRef]);

  return { currentTime, duration };
}
