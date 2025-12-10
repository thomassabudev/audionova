import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Music, Mail, Clock, X, Play } from 'lucide-react';
import { musicService } from '../services/musicService';
import type { Song } from '../services/jiosaavnApi';
import PlaylistView from '../components/PlaylistView';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import { useMusic } from '../context/MusicContext';
import { useParams } from 'react-router-dom';

interface SearchViewProps {
  onOpenExpandedPlayer?: () => void;
}

const SearchView: React.FC<SearchViewProps> = ({ onOpenExpandedPlayer }) => {
  const { query: urlQuery } = useParams<{ query?: string }>();
  const [query, setQuery] = useState(urlQuery || '');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Song[]>([]);
  const { playSong, setQueue, setPlaylistAndPlay } = useMusic();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedRecentSearches = localStorage.getItem('recentSearchSongs');
    if (savedRecentSearches) {
      try {
        setRecentSearches(JSON.parse(savedRecentSearches));
      } catch (e) {
        console.error('Failed to parse recent search songs:', e);
      }
    }
  }, []);

  // Handle URL parameter changes
  useEffect(() => {
    if (urlQuery) {
      setQuery(decodeURIComponent(urlQuery));
      debouncedSearch(decodeURIComponent(urlQuery));
    }
  }, [urlQuery]);

  // Save a song to recent searches
  const saveRecentSearchSong = (song: Song) => {
    setRecentSearches(prev => {
      // Remove duplicates and add to the beginning
      const filtered = prev.filter(item => item.id !== song.id);
      const updated = [song, ...filtered].slice(0, 10); // Limit to 10 songs
      localStorage.setItem('recentSearchSongs', JSON.stringify(updated));
      return updated;
    });
  };

  // Debounced search function
  const debouncedSearch = (searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const songs = await musicService.searchSongs(searchQuery, 50);
        setResults(songs);
        setSearched(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce delay
  };

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Handle search submission (e.g., pressing Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      debouncedSearch(query);
    }
  };

  // Convert songs to compatible format for the player
  const convertSongsForPlayer = (songs: Song[]): any[] => {
    return songs.map(song => {
      // Get the best quality download URL
      let audioUrl = '';
      if ((song as any).downloadUrl && Array.isArray((song as any).downloadUrl)) {
        // Sort by quality and get the highest quality URL
        const sortedUrls = [...(song as any).downloadUrl].sort((a, b) => {
          const qualityA = parseInt(a.quality || '0');
          const qualityB = parseInt(b.quality || '0');
          return qualityB - qualityA;
        });
        audioUrl = sortedUrls[0]?.link || '';
      }

      // Fallback to url property if downloadUrl is not available
      if (!audioUrl) {
        audioUrl = (song as any).url || '';
      }

      return {
        ...song,
        image: Array.isArray((song as any).image) ?
          (song as any).image.map((img: any) => typeof img === 'string' ? img : img.link) :
          [(song as any).image || ''],
        url: audioUrl,
        duration: (song as any).duration || 0
      };
    });
  };

  // Handle clicking on a search result song
  const handleSongClick = (song: Song) => {
    // Save the song to recent searches
    saveRecentSearchSong(song);
    // Play the song using setPlaylistAndPlay to ensure proper queue management
    const convertedSongs = convertSongsForPlayer(results);
    setPlaylistAndPlay(convertedSongs, results.findIndex(s => s.id === song.id));
    // Notify parent to open expanded player
    onOpenExpandedPlayer?.();
  };

  // Handle clicking on a recent search song
  const handleRecentSongClick = (song: Song) => {
    // Move the song to the beginning of the recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.id !== song.id);
      const updated = [song, ...filtered];
      localStorage.setItem('recentSearchSongs', JSON.stringify(updated));
      return updated;
    });
    // Play the song using setPlaylistAndPlay with just this song
    const convertedSong = convertSongsForPlayer([song]);
    setPlaylistAndPlay(convertedSong, 0);
    // Notify parent to open expanded player
    onOpenExpandedPlayer?.();
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearchSongs');
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6">
      {/* Search Banner Image */}
      <motion.div
        className="max-w-2xl mx-auto mb-8 rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="h-40 flex items-center justify-center">
          <div className="text-center p-6">
            <SearchIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Discover Music</h2>
            <p className="text-muted-foreground">Search for your favorite songs, artists, and albums</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="max-w-2xl mx-auto mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="What do you want to listen to?"
              className="w-full pl-12 pr-4 py-6 text-lg bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              autoFocus
            />
            {loading && (
              <motion.div
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}
          </div>
        </form>
      </motion.div>

      {loading && query && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-muted-foreground mt-4">Searching for "{query}"...</p>
        </motion.div>
      )}

      {!loading && searched && results && results.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <PlaylistView
            songs={results}
            title={`Search Results for "${query}"`}
            subtitle="Click on any song to play"
            onSongImageClick={handleSongClick}
          />
        </motion.div>
      )}

      {!loading && searched && query && results.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">We couldn't find any songs matching "{query}"</p>
        </motion.div>
      )}

      {/* Show recently searched songs when there's no active search or when search results are empty */}
      {(!searched || (searched && query && results.length === 0)) && !query && recentSearches.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recently Played</h2>
              <p className="text-muted-foreground">Songs you've played recently</p>
            </div>
            <Button
              variant="ghost"
              onClick={clearAllRecentSearches}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <AnimatePresence>
              {recentSearches.map((song, index) => (
                <motion.div
                  key={song.id}
                  className="group relative bg-card rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => handleRecentSongClick(song)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="aspect-square relative overflow-hidden">
                    {song.image && song.image.length > 0 ? (
                      <img
                        src={getHighestQualityImage(song.image)}
                        alt={song.name || 'Unknown Song'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <Music className="w-8 h-8 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                      >
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-foreground truncate text-sm">{song.name || 'Unknown Song'}</h3>
                    <p className="text-xs text-muted-foreground truncate">{song.primaryArtists || 'Unknown Artist'}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Show search prompt when there's no search and no recent searches */}
      {(!searched || (searched && query && results.length === 0)) && !query && recentSearches.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-accent p-6 rounded-full mb-6">
            <SearchIcon className="w-16 h-16 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Search for Music</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Find your favorite songs, artists, and albums by typing in the search box above
          </p>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-2">Need help?</p>
            <p className="text-sm text-muted-foreground">Contact us for support</p>
            <a
              href="mailto:thomassabucpz1234@gmail.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mt-1"
            >
              <Mail className="w-4 h-4" />
              thomassabucpz1234@gmail.com
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SearchView;