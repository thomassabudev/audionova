import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the settings structure - Simplified for essential features only
interface Settings {
  // Playback settings
  audioQuality: string;
  crossfade: number;
  gaplessPlayback: boolean;
  normalizeVolume: boolean;
  
  // Display settings
  themeMode: string;
  enableAnimations: boolean;
  showWaveform: boolean;
}

// Default settings values
const DEFAULT_SETTINGS: Settings = {
  // Playback settings
  audioQuality: 'normal',
  crossfade: 0,
  gaplessPlayback: false,
  normalizeVolume: true,
  
  // Display settings
  themeMode: 'dark',
  enableAnimations: true,
  showWaveform: true,
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load settings from localStorage if available
    const savedSettings = localStorage.getItem('userSettings');
    return savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};