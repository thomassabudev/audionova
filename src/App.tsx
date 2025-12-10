import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicProvider, useMusic } from './context/MusicContext';
import { SettingsProvider } from './context/SettingsContext';
import { QuickActionsProvider } from './context/QuickActionsContext';
import { PlaylistSidebarProvider } from './context/PlaylistSidebarContext';
import { Toaster as SonnerToaster } from 'sonner';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import ExpandedSongPlayer from './components/ExpandedSongPlayer';

import Signin from './pages/Signin';
import Register from './pages/Register';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import LibraryView from './views/LibraryView';
import LikedSongsView from './views/LikedSongsView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import HelpView from './views/HelpView';
import APITest from './components/APITest';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Audio element component that connects to MusicContext
const AudioElement: React.FC = () => {
  const { audioRef } = useMusic();
  return <audio ref={audioRef} crossOrigin="anonymous" />;
};

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isExpandedPlayerOpen, setIsExpandedPlayerOpen] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <MusicProvider>
          <SettingsProvider>
            <QuickActionsProvider>
              <PlaylistSidebarProvider>
                <ErrorBoundary>
                <div className="min-h-screen bg-background">
                  {/* Hidden audio element for playback */}
                  <AudioElement />
                  
                  <div className="flex h-screen">
                    {/* Sidebar */}
                    <Sidebar 
                      isCollapsed={isSidebarCollapsed} 
                      onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                    />
                  
                    {/* Main Content */}
                    <div className="flex-1 flex flex-col">
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/signin" element={
                            <RedirectAuthenticated>
                              <Signin />
                            </RedirectAuthenticated>
                          } />
                          <Route path="/register" element={
                            <RedirectAuthenticated>
                              <Register />
                            </RedirectAuthenticated>
                          } />
                          <Route path="/test" element={
                            <ProtectedRoute>
                              <APITest />
                            </ProtectedRoute>
                          } />
                          <Route path="/" element={
                            <ProtectedRoute>
                              <HomeView />
                            </ProtectedRoute>
                          } />
                          <Route path="/search" element={
                            <ProtectedRoute>
                              <SearchView />
                            </ProtectedRoute>
                          } />
                          <Route path="/search/:query" element={
                            <ProtectedRoute>
                              <SearchView />
                            </ProtectedRoute>
                          } />
                          <Route path="/library" element={
                            <ProtectedRoute>
                              <LibraryView />
                            </ProtectedRoute>
                          } />
                          <Route path="/liked-songs" element={
                            <ProtectedRoute>
                              <LikedSongsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/profile" element={
                            <ProtectedRoute>
                              <ProfileView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/account" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/privacy" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/playback" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/downloads" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/notifications" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/appearance" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/accessibility" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings/about" element={
                            <ProtectedRoute>
                              <SettingsView />
                            </ProtectedRoute>
                          } />
                          <Route path="/help" element={
                            <ProtectedRoute>
                              <HelpView />
                            </ProtectedRoute>
                          } />
                        </Routes>
                      </main>

                      {/* Music Player - Fixed at bottom */}
                      <MusicPlayer 
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                        onOpenExpandedPlayer={() => setIsExpandedPlayerOpen(true)}
                      />
                    </div>

                    {/* Expanded Song Player Sidebar */}
                    <ExpandedSongPlayer 
                      isOpen={isExpandedPlayerOpen}
                      onClose={() => setIsExpandedPlayerOpen(false)}
                    />
                  </div>
                  <SonnerToaster />
                </div>
                </ErrorBoundary>
              </PlaylistSidebarProvider>
            </QuickActionsProvider>
          </SettingsProvider>
        </MusicProvider>
      </AuthProvider>
    </Router>
  );
}

// Component to protect routes that require authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

// Component to redirect authenticated users away from auth pages
const RedirectAuthenticated: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default App;