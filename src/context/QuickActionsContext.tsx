import React, { createContext, useContext, useState, useEffect } from 'react';

interface QuickActionsContextType {
  defaultPlaylistId: string | null;
  setDefaultPlaylistId: (id: string | null) => void;
  isQuickActionsEnabled: boolean;
  setIsQuickActionsEnabled: (enabled: boolean) => void;
}

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(undefined);

export const QuickActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [defaultPlaylistId, setDefaultPlaylistId] = useState<string | null>(null);
  const [isQuickActionsEnabled, setIsQuickActionsEnabled] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    const savedPlaylistId = localStorage.getItem('defaultQuickPlaylistId');
    const savedQuickActionsEnabled = localStorage.getItem('quickActionsEnabled');
    
    if (savedPlaylistId) {
      setDefaultPlaylistId(savedPlaylistId);
    }
    
    if (savedQuickActionsEnabled) {
      setIsQuickActionsEnabled(savedQuickActionsEnabled === 'true');
    }
  }, []);

  // Save settings to localStorage
  const updateDefaultPlaylistId = (id: string | null) => {
    setDefaultPlaylistId(id);
    if (id) {
      localStorage.setItem('defaultQuickPlaylistId', id);
    } else {
      localStorage.removeItem('defaultQuickPlaylistId');
    }
  };

  const updateIsQuickActionsEnabled = (enabled: boolean) => {
    setIsQuickActionsEnabled(enabled);
    localStorage.setItem('quickActionsEnabled', enabled.toString());
  };

  return (
    <QuickActionsContext.Provider
      value={{
        defaultPlaylistId,
        setDefaultPlaylistId: updateDefaultPlaylistId,
        isQuickActionsEnabled,
        setIsQuickActionsEnabled: updateIsQuickActionsEnabled
      }}
    >
      {children}
    </QuickActionsContext.Provider>
  );
};

export const useQuickActions = () => {
  const context = useContext(QuickActionsContext);
  if (context === undefined) {
    throw new Error('useQuickActions must be used within a QuickActionsProvider');
  }
  return context;
};