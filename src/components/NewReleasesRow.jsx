import React, { useState, useEffect } from 'react';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Play, Clock, Music, Heart, RefreshCw, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMusic } from '../context/MusicContext';
import { toast } from 'sonner';

const NewReleasesRow = () => {
  const [newReleases, setNewReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('all'); // Language filter state
  
  const { 
    playSong, 
    setQueue, 
    isSongLiked,
    addToLikedSongs,
    removeFromLikedSongs
  } = useMusic();

  // Fetch new releases from backend API with fallback to trending songs
  const fetchNewReleases = async (retryAttempt = 0) => {
    try {
      setLoading(true);
      
      // Build API endpoint based on selected language
      let apiUrl = 'http://localhost:5008/api/new-releases?limit=25'; // Changed from 20 to 25
      if (selectedLanguage !== 'all') {
        apiUrl = `http://localhost:5008/api/new-releases/${selectedLanguage}?limit=25`; // Changed from 20 to 25
      }
      
      console.log('Fetching from URL:', apiUrl);
      
      // Try to fetch from the new releases API first
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          console.log('Received data:', data);
          // Convert backend song format to frontend format
          const convertedSongs = data.data.map((song) => ({
            id: song.external_id || song.id,
            name: song.title || 'Unknown Title',
            primaryArtists: song.artists || 'Unknown Artist',
            album: {
              name: song.album || 'Unknown Album'
            },
            image: (song.metadata?.image || song.image || []),
            duration: song.duration || 0,
            releaseDate: song.release_date || new Date().toISOString(),
            language: song.language || 'unknown' // Include language information
          })).filter(song => song.id && song.name); // Filter out invalid songs
          
          console.log('Converted songs:', convertedSongs);
          setNewReleases(convertedSongs);
          setError(null);
        } else {
          throw new Error(data.error || 'Failed to fetch new releases');
        }
      } else if (response.status === 404) {
        // New releases endpoint not found, fallback to trending
        throw new Error('New releases endpoint not available');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching new releases:', err);
      
      // Fallback to trending songs if new releases API fails
      try {
        const trendingResponse = await fetch('http://localhost:5008/api/trending?limit=25'); // Changed from 20 to 25
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json();
          if (trendingData.success) {
            // Convert trending song format to frontend format
            const convertedSongs = trendingData.data.map((song) => ({
              id: song.external_id || song.id,
              name: song.title || song.name || 'Unknown Title',
              primaryArtists: song.artists || song.primaryArtists || 'Unknown Artist',
              album: {
                name: song.album || (song.album?.name) || 'Unknown Album'
              },
              image: (song.metadata?.image || song.image || []),
              duration: song.duration || 0,
              releaseDate: song.release_date || new Date().toISOString(),
              language: song.language || 'unknown'
            })).filter(song => song.id && song.name); // Filter out invalid songs
            
            setNewReleases(convertedSongs);
            setError('Showing trending songs as fallback');
          } else {
            throw new Error(trendingData.error || 'Failed to fetch trending songs');
          }
        } else {
          throw new Error(`HTTP ${trendingResponse.status}: ${trendingResponse.statusText}`);
        }
      } catch (trendingErr) {
        console.error('Error fetching trending songs as fallback:', trendingErr);
        
        // If this is a retry attempt, don't retry again to avoid infinite loop
        if (retryAttempt < 3) {
          // Retry after a delay
          setTimeout(() => {
            fetchNewReleases(retryAttempt + 1);
          }, 2000 * (retryAttempt + 1)); // Exponential backoff
        } else {
          setError('Failed to load new releases. Please try again later.');
          setNewReleases([]); // Clear any previous data
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNewReleases();
  }, [selectedLanguage]); // Refetch when language filter changes

  // Retry function
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchNewReleases();
  };

  // Connect to SSE for real-time updates (only if backend supports it)
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.EventSource) {
      return;
    }

    let eventSource;
    let reconnectTimeout;

    const connect = () => {
      try {
        // Only attempt SSE connection if we're not already showing an error
        if (!error || !error.includes('Failed to load')) {
          eventSource = new EventSource('http://localhost:5008/api/new-releases/events');
          
          eventSource.onopen = () => {
            console.log('SSE connection opened for new releases');
          };
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'connected') {
                console.log('Connected to new releases stream');
                return;
              }
              
              if (data.type === 'new_release') {
                setNewReleases(prev => {
                  // Check if song already exists to avoid duplicates
                  const exists = prev.some(song => song.id === data.song.external_id);
                  if (!exists) {
                    // Show toast notification
                    toast(`🎵 New release: ${data.song.title}`, {
                      description: `From ${data.song.album}`,
                      action: {
                        label: 'Play',
                        onClick: () => {
                          // Convert song format for playback
                          const convertedSong = {
                            id: data.song.external_id,
                            name: data.song.title,
                            primaryArtists: data.song.artists,
                            album: {
                              name: data.song.album
                            },
                            image: data.song.metadata?.image || [],
                            duration: 0,
                            language: data.song.language || 'unknown'
                          };
                          setQueue([convertedSong, ...newReleases.slice(0, 24)]);
                          playSong(convertedSong);
                        }
                      }
                    });
                    
                    // Convert and add to the beginning of the list, but limit to 25 songs
                    const convertedSong = {
                      id: data.song.external_id,
                      name: data.song.title,
                      primaryArtists: data.song.artists,
                      album: {
                        name: data.song.album
                      },
                      image: data.song.metadata?.image || [],
                      duration: 0,
                      releaseDate: data.song.release_date,
                      language: data.song.language || 'unknown'
                    };
                    
                    // Add new song to the beginning but keep only the first 25 songs
                    const updatedList = [convertedSong, ...prev];
                    return updatedList.slice(0, 25);
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.error('Error parsing SSE message:', err);
            }
          };
          
          eventSource.onerror = (err) => {
            console.error('SSE error for new releases:', err);
            
            // Close the connection and attempt to reconnect after 10 seconds
            if (eventSource) {
              eventSource.close();
            }
            
            reconnectTimeout = setTimeout(() => {
              connect();
            }, 10000);
          };
        }
      } catch (err) {
        console.error('Error creating EventSource for new releases:', err);
      }
    };

    // Only connect if we're not showing a critical error
    if (!error || !error.includes('Failed to load')) {
      connect();
    }

    // Cleanup
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [playSong, setQueue, error]); // Removed newReleases from dependencies to prevent multiple connections

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isNewRelease = (releaseDate) => {
    if (!releaseDate) return false;
    
    const release = new Date(releaseDate);
    const now = new Date();
    const diffTime = Math.abs(now - release);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 7;
  };

  // Get language display name and color
  const getLanguageInfo = (langCode) => {
    switch (langCode) {
      case 'ml':
        return { name: 'ML', color: 'bg-green-500' }; // Malayalam green
      case 'hi':
        return { name: 'HI', color: 'bg-orange-500' }; // Hindi orange
      case 'ta':
        return { name: 'TA', color: 'bg-purple-500' }; // Tamil purple
      default:
        return { name: 'UN', color: 'bg-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">🔥 New Releases (Malayalam • Hindi • Tamil)</h2>
          <p className="text-sm text-muted-foreground">Updated hourly — mixed latest hits</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardContent className="p-3">
                <div className="h-4 bg-muted rounded mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">🔥 New Releases (Malayalam • Hindi • Tamil)</h2>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Updated hourly — mixed latest hits</p>
          <div className="relative">
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="appearance-none bg-card border border-border rounded-md py-1 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Languages</option>
              <option value="ml">Malayalam</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
            </select>
            <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded flex items-center justify-between">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="border-yellow-600 text-yellow-700 hover:bg-yellow-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
      
      {newReleases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="w-12 h-12 mx-auto mb-4" />
          <p>No songs available at the moment</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {newReleases.slice(0, 25).map((song, index) => (
            <motion.div
              key={`new-releases-${song.id}`}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
              whileHover={{ y: -5 }}
              onClick={() => {
                // Play the song
                setQueue(newReleases.slice(0, 25));
                playSong(song);
              }}
            >
              {isNewRelease(song.releaseDate) && (
                <div className="absolute top-2 left-2 z-10">
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    NEW
                  </span>
                </div>
              )}
              {/* Language badge */}
              <div className="absolute top-2 right-2 z-10">
                <span className={`${getLanguageInfo(song.language).color} text-white text-xs font-bold px-1.5 py-0.5 rounded-full`}>
                  {getLanguageInfo(song.language).name}
                </span>
              </div>
              <div className="relative">
                {song.image && song.image.length > 0 ? (
                  <img 
                    src={getHighestQualityImage(song.image)} 
                    alt={song.name} 
                    className="w-full aspect-square object-cover"
                    onError={(e) => {
                      // Fallback to gradient if image fails to load
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = `
                        <div class="w-full aspect-square bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                          <Music className="w-8 h-8 text-white" />
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                    <Music className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon"
                    className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Play the song
                      setQueue(newReleases.slice(0, 25));
                      playSong(song);
                    }}
                  >
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </Button>
                </div>
                <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSongLiked(song.id)) {
                        removeFromLikedSongs(song.id);
                      } else {
                        addToLikedSongs(song);
                      }
                    }}
                  >
                    <Heart className={`w-4 h-4 ${isSongLiked(song.id) ? 'fill-current text-red-500' : 'text-white'}`} />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-foreground truncate">{song.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{song.primaryArtists}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{song.album?.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewReleasesRow;