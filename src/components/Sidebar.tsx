import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  Moon, 
  Sun, 
  Mail, 
  Code, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  Shield
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { useMusic } from '../context/MusicContext';
import { useAuth } from '../context/AuthContext';
import type { Song } from '../services/jiosaavnApi';
import SidebarQuickActions from './SidebarQuickActions';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();
  // Default to Dark Mode for all new and existing users
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // Default DARK mode
  });
  const [selectedTracks, setSelectedTracks] = useState<Song[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const { isPlaying, togglePlayPause, currentSong, likedSongs } = useMusic();
  const { isAdmin } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: Heart, label: 'Liked Songs', path: '/liked-songs', count: likedSongs.length },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin Dashboard', path: '/admin' }] : []),
  ];

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleSelectionChange = (tracks: Song[]) => {
    setSelectedTracks(tracks);
  };

  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    // Clear selection when exiting multi-select mode
    if (isMultiSelectMode) {
      setSelectedTracks([]);
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768 && !isCollapsed && onToggle) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Dark Backdrop Overlay when sidebar is open on mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <motion.aside 
        className={cn(
          "bg-card border-r border-border h-full flex flex-col z-50 transition-all duration-300",
          "fixed inset-y-0 left-0 md:relative md:inset-auto",
          isCollapsed ? "-translate-x-full md:translate-x-0 md:w-20" : "translate-x-0 w-64 md:w-64"
        )}
        animate={{ width: window.innerWidth >= 768 ? (isCollapsed ? 80 : 256) : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Link to="/landing" title="View Landing Page" onClick={handleNavClick}>
                  <img 
                    src="/logo.jpg" 
                    alt="AudioNova Logo" 
                    className="h-8 w-8 object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Link to="/landing" title="View Landing Page" onClick={handleNavClick}>
                  <img 
                    src="/logo.jpg" 
                    alt="AudioNova Logo" 
                    className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </Link>
              </motion.div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={onToggle}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground md:hidden"
            title="Close menu"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg mb-2 transition-colors',
                  isActive
                    ? 'bg-red-500 text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || window.innerWidth < 768) && (
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-medium">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="bg-red-500 text-primary-foreground text-xs rounded-full px-2 py-0.5 ml-2 font-bold">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      
      {/* Sidebar Quick Actions */}
      <SidebarQuickActions
        isCollapsed={isCollapsed}
        selectedTracks={selectedTracks}
        onSelectionChange={handleSelectionChange}
        isMultiSelectMode={isMultiSelectMode}
        onToggleMultiSelect={handleToggleMultiSelect}
      />
      
      <div className="p-3 border-t border-border">
        {/* Play/Pause Button */}
        {currentSong && (
          <Button
            onClick={togglePlayPause}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent mb-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 mr-3" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isCollapsed ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    Pause
                  </motion.span>
                )}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-3" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isCollapsed ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    Play
                  </motion.span>
                )}
              </>
            )}
          </Button>
        )}
        
        {/* Developer Information */}
        {!isCollapsed && (
          <motion.div 
            className="mb-4 p-3 bg-accent rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">DEVELOPED BY</span>
            </div>
            <p className="text-sm font-medium text-foreground">Thomas Sabu</p>
            <a 
              href="mailto:thomassabucpz1234@gmail.com" 
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <Mail className="w-3 h-3" />
              <span className="truncate">thomassabucpz1234@gmail.com</span>
            </a>
          </motion.div>
        )}
        
        {/* Theme Toggle */}
        <Button
          onClick={toggleTheme}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent mb-2"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-5 h-5 mr-3" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isCollapsed ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Light Mode
                </motion.span>
              )}
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 mr-3" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isCollapsed ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Dark Mode
                </motion.span>
              )}
            </>
          )}
        </Button>
        
        {/* Collapse/Expand Button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-full mt-4"
          onClick={onToggle}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </div>
    </motion.aside>
  </>
  );
};

export default Sidebar;