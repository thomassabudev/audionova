import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'ui_settings_v1';

const DEFAULTS = {
  themeMode: 'dark' as 'light' | 'dark' | 'system',
  accentColor: '#ff5b5b',
  backgroundBlur: false,
  albumArtBackground: true,
  dynamicGradients: true
};

type ThemeSettings = typeof DEFAULTS;

interface ThemeContextType {
  previewSettings: ThemeSettings;
  savedSettings: ThemeSettings;
  setPreviewSetting: (key: keyof ThemeSettings, value: any) => void;
  savePreviewSettings: () => void;
  resetPreviewToSaved: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [savedSettings, setSavedSettings] = useState<ThemeSettings>(DEFAULTS);
  const [previewSettings, setPreviewSettings] = useState<ThemeSettings>(DEFAULTS);

  useEffect(() => {
    // Rehydrate saved settings
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSavedSettings(parsed);
        setPreviewSettings(parsed);
        applySettingsToDOM(parsed);
      } else {
        applySettingsToDOM(DEFAULTS);
      }
    } catch (e) {
      console.error('Failed to rehydrate theme settings:', e);
      applySettingsToDOM(DEFAULTS);
    }
  }, []);

  useEffect(() => {
    applySettingsToDOM(previewSettings);
  }, [previewSettings]);

  function setPreviewSetting(key: keyof ThemeSettings, value: any) {
    setPreviewSettings(prev => ({ ...prev, [key]: value }));
  }

  function savePreviewSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(previewSettings));
    setSavedSettings(previewSettings);
  }

  function resetPreviewToSaved() {
    setPreviewSettings(savedSettings);
  }

  return (
    <ThemeContext.Provider value={{
      previewSettings, 
      savedSettings, 
      setPreviewSetting,
      savePreviewSettings, 
      resetPreviewToSaved
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* Helper function to apply settings to DOM */
function applySettingsToDOM(settings: ThemeSettings) {
  const root = document.documentElement;
  
  // Theme class
  if (settings.themeMode === 'system') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('theme-dark', isDark);
    root.classList.toggle('theme-light', !isDark);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      root.classList.toggle('theme-dark', e.matches);
      root.classList.toggle('theme-light', !e.matches);
    };
    mediaQuery.addEventListener('change', listener);
  } else {
    root.classList.toggle('theme-dark', settings.themeMode === 'dark');
    root.classList.toggle('theme-light', settings.themeMode === 'light');
  }
  
  root.style.setProperty('--accent', settings.accentColor);
  root.style.setProperty('--blur-level', settings.backgroundBlur ? '6px' : '0px');
  root.classList.toggle('album-art-bg', !!settings.albumArtBackground);
  root.classList.toggle('dynamic-gradients', !!settings.dynamicGradients);
}