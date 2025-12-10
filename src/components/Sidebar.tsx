import React, { useState } from 'react';
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
  Pause
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { useMusic } from '../context/MusicContext';
import type { Song } from '../services/jiosaavnApi';
import SidebarQuickActions from './SidebarQuickActions';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Song[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const { isPlaying, togglePlayPause, currentSong, likedSongs } = useMusic();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: Heart, label: 'Liked Songs', path: '/liked-songs', count: likedSongs.length },
  ];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, you would update the theme here
    document.documentElement.classList.toggle('dark', !isDarkMode);
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

  return (
    <motion.aside 
      className={cn(
        "bg-card border-r border-border h-full flex flex-col",
        isCollapsed ? "w-20" : "w-64"
      )}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <img 
                src="/logo.jpg" 
                alt="AudioNova Logo" 
                className="h-8 w-8 object-contain"
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <img 
                src="/logo.jpg" 
                alt="AudioNova Logo" 
                className="h-8 w-auto"
              />
            </motion.div>
          )}
        </div>
      </div>
      
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg mb-2 transition-colors',
                isActive
                  ? 'bg-red-500 text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <motion.span 
                    className="font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isCollapsed ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                  {item.count !== undefined && item.count > 0 && (
                    <motion.span 
                      className="bg-red-500 text-primary-foreground text-xs rounded-full px-2 py-0.5 ml-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: isCollapsed ? 0 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.count}
                    </motion.span>
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
  );
};

export default Sidebar;