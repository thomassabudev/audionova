import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicProvider, useMusic } from './context/MusicContext';
import { SettingsProvider } from './context/SettingsContext';
import { QuickActionsProvider } from './context/QuickActionsContext';
import { PlaylistSidebarProvider } from './context/PlaylistSidebarContext';
import { SocialProvider } from './context/SocialContext';
import { Toaster as SonnerToaster } from 'sonner';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import ExpandedSongPlayer from './components/ExpandedSongPlayer';
import GlobalKeyboardShortcuts from './components/GlobalKeyboardShortcuts';

import Signin from './pages/Signin';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import LibraryView from './views/LibraryView';
import LikedSongsView from './views/LikedSongsView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import HelpView from './views/HelpView';
import AdminDashboard from './views/AdminDashboard';
import CoAdminLoginView from './views/CoAdminLoginView';
import ArtistView from './views/ArtistView';
import AlbumView from './views/AlbumView';
import APITest from './components/APITest';
import ErrorBoundary from './components/ErrorBoundary';
import AppBootstrap from './components/AppBootstrap';
import './App.css';

// Audio element component that connects to MusicContext
const AudioElement: React.FC = () => {
  const { audioRef } = useMusic();

  React.useEffect(() => {
    if (audioRef.current) {
    }
  }, [audioRef]);

  return <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />;
};

function App() {
  // Default to collapsed (off-screen drawer) on mobile screens < 768px
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.innerWidth < 768;
  });
  const [isExpandedPlayerOpen, setIsExpandedPlayerOpen] = useState(false);

  // Simple error suppression for Firebase and CORS issues
  React.useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const message = String(args[0] || '').toLowerCase();
      const fullMessage = args.join(' ').toLowerCase();

      if (message.includes('cross-origin-opener-policy') ||
        message.includes('window.closed') ||
        message.includes('firebase_auth.js') ||
        message.includes('policy would block') ||
        fullMessage.includes('cross-origin-opener-policy') ||
        fullMessage.includes('window.closed') ||
        fullMessage.includes('firebase_auth.js') ||
        fullMessage.includes('policy would block')) {
        return;
      }

      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = String(args[0] || '').toLowerCase();
      const fullMessage = args.join(' ').toLowerCase();

      if (message.includes('cross-origin-opener-policy') ||
        message.includes('window.closed') ||
        message.includes('firebase_auth.js') ||
        message.includes('policy would block') ||
        fullMessage.includes('cross-origin-opener-policy') ||
        fullMessage.includes('window.closed') ||
        fullMessage.includes('firebase_auth.js') ||
        fullMessage.includes('policy would block')) {
        return;
      }

      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <MusicProvider>
          <SocialProvider>
            <SettingsProvider>
              <QuickActionsProvider>
                <PlaylistSidebarProvider>
                  <AppBootstrap>
                    <ErrorBoundary>
                      <Routes>
                        {/* ── Full-screen routes (NO sidebar, NO music player) ── */}
                        <Route path="/landing" element={<LandingPage />} />
                      <Route path="/signin" element={
                        <RedirectAuthenticated><Signin /></RedirectAuthenticated>
                      } />
                      <Route path="/register" element={
                        <RedirectAuthenticated><Register /></RedirectAuthenticated>
                      } />
                      <Route path="/admin/login" element={<CoAdminLoginView />} />
                      <Route path="/admin" element={<AdminDashboard />} />

                      {/* ── App routes (WITH sidebar + music player) ── */}
                      <Route path="/*" element={
                        <div className="min-h-screen bg-background">
                          <AudioElement />
                          <GlobalKeyboardShortcuts onToggleExpandedPlayer={() => setIsExpandedPlayerOpen(prev => !prev)} />
                          <div className="flex h-screen overflow-hidden relative">
                            <Sidebar
                              isCollapsed={isSidebarCollapsed}
                              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            />
                            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                              {/* Mobile Top Header Bar (< md screens) */}
                              <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-card/95 backdrop-blur-md border-b border-border z-30 flex-shrink-0">
                                <button
                                  onClick={() => setIsSidebarCollapsed(false)}
                                  className="p-1.5 rounded-lg text-foreground hover:bg-accent transition-colors"
                                  title="Open menu"
                                >
                                  <Menu className="w-5 h-5" />
                                </button>

                                <Link to="/" className="flex items-center gap-2">
                                  <img src="/logo.jpg" alt="AudioNova" className="w-6 h-6 object-contain rounded-md" />
                                  <span className="font-black text-sm tracking-tight text-foreground">AudioNova</span>
                                </Link>

                                <div className="w-8" />
                              </div>
                              <main className="flex-1 overflow-auto">
                                <Routes>
                                  <Route path="/" element={<RootRoute />} />
                                  <Route path="/test" element={<ProtectedRoute><APITest /></ProtectedRoute>} />
                                  <Route path="/search" element={<ProtectedRoute><SearchView /></ProtectedRoute>} />
                                  <Route path="/search/:query" element={<ProtectedRoute><SearchView /></ProtectedRoute>} />
                                  <Route path="/library" element={<ProtectedRoute><LibraryView /></ProtectedRoute>} />
                                  <Route path="/liked-songs" element={<ProtectedRoute><LikedSongsView /></ProtectedRoute>} />
                                  <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
                                  <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/account" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/privacy" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/playback" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/downloads" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/notifications" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/appearance" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/accessibility" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/settings/about" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
                                  <Route path="/help" element={<ProtectedRoute><HelpView /></ProtectedRoute>} />
                                  <Route path="/artist/:artistName" element={<ProtectedRoute><ArtistView /></ProtectedRoute>} />
                                  <Route path="/album/:albumId" element={<ProtectedRoute><AlbumView /></ProtectedRoute>} />
                                </Routes>
                              </main>
                              <MusicPlayer
                                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                onOpenExpandedPlayer={() => setIsExpandedPlayerOpen(true)}
                              />
                            </div>
                            <ExpandedSongPlayer
                              isOpen={isExpandedPlayerOpen}
                              onClose={() => setIsExpandedPlayerOpen(false)}
                            />
                          </div>
                          <SonnerToaster />
                        </div>
                      } />
                    </Routes>
                  </ErrorBoundary>
                  </AppBootstrap>
                </PlaylistSidebarProvider>
              </QuickActionsProvider>
            </SettingsProvider>
          </SocialProvider>
        </MusicProvider>
      </AuthProvider>
    </Router>
  );
}


// Root route: landing page for guests, home for logged-in users
const RootRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Logged-in users go to HomeView, guests redirect to /landing (no sidebar)
  if (user) {
    return <HomeView />;
  }

  return <Navigate to="/landing" replace />;
};

// Component to protect routes that require authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
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
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default App;