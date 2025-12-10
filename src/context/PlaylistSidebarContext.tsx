import React, { createContext, useContext, useState } from 'react';

interface PlaylistSidebarContextType {
  isPlaylistSidebarOpen: boolean;
  setIsPlaylistSidebarOpen: (open: boolean) => void;
  togglePlaylistSidebar: () => void;
}

const PlaylistSidebarContext = createContext<PlaylistSidebarContextType | undefined>(undefined);

export const PlaylistSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaylistSidebarOpen, setIsPlaylistSidebarOpen] = useState(false);

  const togglePlaylistSidebar = () => {
    setIsPlaylistSidebarOpen(prev => !prev);
  };

  return (
    <PlaylistSidebarContext.Provider
      value={{
        isPlaylistSidebarOpen,
        setIsPlaylistSidebarOpen,
        togglePlaylistSidebar,
      }}
    >
      {children}
    </PlaylistSidebarContext.Provider>
  );
};

export const usePlaylistSidebar = () => {
  const context = useContext(PlaylistSidebarContext);
  if (!context) {
    throw new Error('usePlaylistSidebar must be used within a PlaylistSidebarProvider');
  }
  return context;
};
