import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Search, RefreshCw, Music, MoreVertical, Repeat, Shuffle, ListMusic, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { useMusic } from '@/context/MusicContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Song } from '@/services/jiosaavnApi';
import { jiosaavnApi } from '@/services/jiosaavnApi';
import { getHighestQualityImage } from '@/services/jiosaavnApi';
import { musicService } from '@/services/musicService';
import ExpandedSongPlayer from '@/components/ExpandedSongPlayer';
import ProfileDropdown from '@/components/ProfileDropdown';

const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for various data
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [romanceSongs, setRomanceSongs] = useState<Song[]>([]);
  const [malayalamSongs, setMalayalamSongs] = useState<Song[]>([]);
  const [tamilSongs, setTamilSongs] = useState<Song[]>([]);
  const [mixedRomanceSongs, setMixedRomanceSongs] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    queue,
    setPlaylistAndPlay,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    likedSongs,
    addToLikedSongs,
    removeFromLikedSongs,
    isSongLiked,
    savedPlaylists
  } = useMusic();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllNewReleases, setShowAllNewReleases] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [showAllRomance, setShowAllRomance] = useState(false);
  const [showAllMalayalam, setShowAllMalayalam] = useState(false);
  const [showAllTamil, setShowAllTamil] = useState(false);
  const [showAllMixedRomance, setShowAllMixedRomance] = useState(false);
  const [showAllRecentlyPlayed, setShowAllRecentlyPlayed] = useState(false);
  
  const [isRefreshingNewReleases, setIsRefreshingNewReleases] = useState(false);
  const [isRefreshingTrending, setIsRefreshingTrending] = useState(false);
  const [isRefreshingRomance, setIsRefreshingRomance] = useState(false);
  const [isRefreshingMalayalam, setIsRefreshingMalayalam] = useState(false);
  const [isRefreshingTamil, setIsRefreshingTamil] = useState(false);
  const [isRefreshingMixedRomance, setIsRefreshingMixedRomance] = useState(false);
  const [isRefreshingRecentlyPlayed, setIsRefreshingRecentlyPlayed] = useState(false);

  const [isPlaylistSidebarOpen, setIsPlaylistSidebarOpen] = useState(false);
  const [expandedSong, setExpandedSong] = useState<any>(null);
  const [isFullscreenPlaylist, setIsFullscreenPlaylist] = useState(false);

  // Data fetching functions
  const fetchNewReleases = async () => {
    try {
      const newReleasesData = await musicService.getNewReleases(50);
      setNewReleases(newReleasesData);
    } catch (error) {
      console.error('Error fetching new releases:', error);
      toast.error('Failed to load new releases');
    }
  };

  const fetchTrendingSongs = async () => {
    try {
      const trendingData = await musicService.getTrendingSongs(50);
      setTrendingSongs(trendingData);
    } catch (error) {
      console.error('Error fetching trending songs:', error);
      toast.error('Failed to load trending songs');
    }
  };

  const fetchRomanceSongs = async () => {
    try {
      const romanceData = await musicService.getMalayalamRomanceSongs(50);
      setRomanceSongs(romanceData);
    } catch (error) {
      console.error('Error fetching romance songs:', error);
      toast.error('Failed to load romance songs');
    }
  };

  const fetchMalayalamSongs = async () => {
    try {
      const malayalamData = await musicService.getTrendingSongs(50);
      setMalayalamSongs(malayalamData);
    } catch (error) {
      console.error('Error fetching Malayalam songs:', error);
      toast.error('Failed to load Malayalam songs');
    }
  };

  const fetchTamilSongs = async () => {
    try {
      const tamilData = await musicService.getTamilRomanceSongs(50);
      setTamilSongs(tamilData);
    } catch (error) {
      console.error('Error fetching Tamil songs:', error);
      toast.error('Failed to load Tamil songs');
    }
  };

  const fetchMixedRomanceSongs = async () => {
    try {
      const [malayalamRomance, tamilRomance, hindiRomance] = await Promise.all([
        musicService.getMalayalamRomanceSongs(20),
        musicService.getTamilRomanceSongs(20),
        musicService.getHindiRomanceSongs(10)
      ]);
      
      // Combine and shuffle the songs
      const combinedSongs = [...malayalamRomance, ...tamilRomance, ...hindiRomance];
      // Simple shuffle algorithm
      for (let i = combinedSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinedSongs[i], combinedSongs[j]] = [combinedSongs[j], combinedSongs[i]];
      }
      
      setMixedRomanceSongs(combinedSongs.slice(0, 50));
    } catch (error) {
      console.error('Error fetching mixed romance songs:', error);
      toast.error('Failed to load mixed romance songs');
    }
  };

  const fetchRecentlyPlayed = async () => {
    // For now, we'll just use a placeholder
    // In a real implementation, this would fetch from localStorage or a backend
    setRecentlyPlayed([]);
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchNewReleases(),
          fetchTrendingSongs(),
          fetchRomanceSongs(),
          fetchMalayalamSongs(),
          fetchTamilSongs(),
          fetchMixedRomanceSongs()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    if (user) {
      fetchRecentlyPlayed();
    }
  }, [user]);

  // Refresh handlers
  const handleRefreshNewReleases = async () => {
    setIsRefreshingNewReleases(true);
    await fetchNewReleases();
    setIsRefreshingNewReleases(false);
  };

  const handleRefreshTrending = async () => {
    setIsRefreshingTrending(true);
    await fetchTrendingSongs();
    setIsRefreshingTrending(false);
  };

  const handleRefreshRomance = async () => {
    setIsRefreshingRomance(true);
    await fetchRomanceSongs();
    setIsRefreshingRomance(false);
  };

  const handleRefreshMalayalam = async () => {
    setIsRefreshingMalayalam(true);
    await fetchMalayalamSongs();
    setIsRefreshingMalayalam(false);
  };

  const handleRefreshTamil = async () => {
    setIsRefreshingTamil(true);
    await fetchTamilSongs();
    setIsRefreshingTamil(false);
  };

  const handleRefreshMixedRomance = async () => {
    setIsRefreshingMixedRomance(true);
    await fetchMixedRomanceSongs();
    setIsRefreshingMixedRomance(false);
  };

  const handleRefreshRecentlyPlayed = async () => {
    setIsRefreshingRecentlyPlayed(true);
    await fetchRecentlyPlayed();
    setIsRefreshingRecentlyPlayed(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const closeExpandedPlayer = () => {
    setExpandedSong(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* PlaylistSidebar component is not available, removing it */}
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${isPlaylistSidebarOpen ? 'ml-80' : ''}`}>
        {/* Hero Section with Search */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative h-[60vh] bg-gradient-to-br from-red-600 via-purple-600 to-blue-600 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 text-center text-white max-w-2xl mx-auto px-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold mb-4"
            >
              Discover Your Music
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl mb-8 text-white/90"
            >
              Stream millions of songs, discover new artists, and create your perfect playlists
            </motion.p>
            
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              onSubmit={handleSearch}
              className="max-w-md mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search for songs, artists, or albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 rounded-full bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder-white/70 focus:bg-white/30 focus:border-white/50"
                />
              </div>
            </motion.form>
          </div>
          
          {/* Your Library Button - Top Right */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <ProfileDropdown />
            <Button 
              variant="secondary" 
              size="default"
              onClick={() => setIsPlaylistSidebarOpen(!isPlaylistSidebarOpen)}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              {isPlaylistSidebarOpen ? 'Close Library' : 'Your Library'}
            </Button>
          </div>
        </motion.div>

        {/* Content Sections */}
        <div className="container mx-auto px-4 py-8">
          
          {/* Currently Playing Section */}
          {currentSong && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold text-foreground">Now Playing</h2>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (isPlaying) {
                      togglePlayPause();
                    }
                  }}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              </div>
              
              <Card className="overflow-hidden rounded-xl border-0 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/4 relative">
                    {currentSong.image && currentSong.image.length > 0 ? (
                      <img
                        src={getHighestQualityImage(currentSong.image)}
                        alt={currentSong.name}
                        className="w-full h-32 md:h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 md:h-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Button 
                        size="icon"
                        className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="md:w-3/4 p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-foreground">{currentSong.name}</h3>
                        <p className="text-muted-foreground">{currentSong.primaryArtists}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          onClick={playPrevious}
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          size="icon"
                          className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600"
                          onClick={togglePlayPause}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 text-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          )}
                        </Button>
                        
                        <Button 
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          onClick={playNext}
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => {
                            if (isSongLiked(currentSong.id)) {
                              removeFromLikedSongs(currentSong.id);
                            } else {
                              addToLikedSongs(currentSong);
                            }
                          }}
                        >
                          <Heart className={`w-4 h-4 ${isSongLiked(currentSong.id) ? 'fill-current text-red-500' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(duration)}</span>
                      </div>
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={1}
                        onValueChange={([value]) => seekTo(value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* New Releases Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">New Releases</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleRefreshNewReleases}
                  disabled={isRefreshingNewReleases}
                >
                  {isRefreshingNewReleases ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowAllNewReleases(!showAllNewReleases)}
                >
                  {showAllNewReleases ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>
            
            {isLoading && (
              <div className="flex items-center justify-center h-32">
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="text-muted-foreground mt-2">Loading new releases...</p>
                </motion.div>
              </div>
            )}
            
            {!isLoading && newReleases.length === 0 && (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No new releases available</p>
              </div>
            )}
            
            {!isLoading && newReleases.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {newReleases.slice(0, showAllNewReleases ? 30 : 6).map((song: Song, index: number) => (
                  <motion.div
                    key={`new-${song.id}`}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    whileHover={{ y: -5 }}
                    onClick={() => {
                      // Play the song
                      setPlaylistAndPlay(newReleases, index);
                    }}
                  >
                    {index < 3 && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {index === 0 ? 'NEW' : index === 1 ? 'HOT' : 'TRENDING'}
                        </span>
                      </div>
                    )}
                    <div className="relative">
                      {song.image && song.image.length > 0 ? (
                        <img 
                          src={getHighestQualityImage(song.image)} 
                          alt={song.name} 
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
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
                            setPlaylistAndPlay(newReleases, index);
                          }}
                        >
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Songs Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Trending Songs</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleRefreshTrending}
                  disabled={isRefreshingTrending}
                >
                  {isRefreshingTrending ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowAllTrending(!showAllTrending)}
                >
                  {showAllTrending ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {trendingSongs.slice(0, showAllTrending ? 30 : 6).map((song: Song, index: number) => (
                <motion.div
                  key={`trending-${song.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    // Play the song
                    setPlaylistAndPlay(trendingSongs, index);
                  }}
                >
                  {index < 3 && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {index === 0 ? '#1' : index === 1 ? '#2' : '#3'}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    {song.image && song.image.length > 0 ? (
                      <img 
                        src={getHighestQualityImage(song.image)} 
                        alt={song.name} 
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
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
                          setPlaylistAndPlay(trendingSongs, index);
                        }}
                      >
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Romantic Songs Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Romantic Hits</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleRefreshRomance}
                  disabled={isRefreshingRomance}
                >
                  {isRefreshingRomance ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowAllRomance(!showAllRomance)}
                >
                  {showAllRomance ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {romanceSongs.slice(0, showAllRomance ? 30 : 6).map((song: Song, index: number) => (
                <motion.div
                  key={`romance-${song.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    // Play the song
                    setPlaylistAndPlay(romanceSongs, index);
                  }}
                >
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      LOVE
                    </span>
                  </div>
                  <div className="relative">
                    {song.image && song.image.length > 0 ? (
                      <img 
                        src={getHighestQualityImage(song.image)} 
                        alt={song.name} 
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
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
                          setPlaylistAndPlay(romanceSongs, index);
                        }}
                      >
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mixed Romantic Songs Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Mixed Romantic Songs</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleRefreshMixedRomance}
                  disabled={isRefreshingMixedRomance}
                >
                  {isRefreshingMixedRomance ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowAllMixedRomance(!showAllMixedRomance)}
                >
                  {showAllMixedRomance ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {mixedRomanceSongs.slice(0, showAllMixedRomance ? 30 : 6).map((song: Song, index: number) => (
                <motion.div
                  key={`mixed-romance-${song.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    // Play the song
                    setPlaylistAndPlay(mixedRomanceSongs, index);
                  }}
                >
                  {index < 2 && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {index === 0 ? 'ROMANTIC' : 'LOVE'}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    {song.image && song.image.length > 0 ? (
                      <img 
                        src={getHighestQualityImage(song.image)} 
                        alt={song.name} 
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
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
                          setPlaylistAndPlay(mixedRomanceSongs, index);
                        }}
                      >
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Malayalam Songs Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Malayalam Hits</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleRefreshMalayalam}
                  disabled={isRefreshingMalayalam}
                >
                  {isRefreshingMalayalam ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowAllMalayalam(!showAllMalayalam)}
                >
                  {showAllMalayalam ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {malayalamSongs.slice(0, showAllMalayalam ? 30 : 6).map((song: Song, index: number) => (
                <motion.div
                  key={`malayalam-${song.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    // Play the song
                    setPlaylistAndPlay(malayalamSongs, index);
                  }}
                >
                  {index < 3 && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {index === 0 ? 'ML' : index === 1 ? 'KERALA' : 'SOUTH'}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    {song.image && song.image.length > 0 ? (
                      <img 
                        src={getHighestQualityImage(song.image)} 
                        alt={song.name} 
                        className="w-full aspect-square object-cover"
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
                          setPlaylistAndPlay(malayalamSongs, index);
                        }}
                      >
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tamil Songs Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Tamil Hits</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleRefreshTamil}
                  disabled={isRefreshingTamil}
                >
                  {isRefreshingTamil ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowAllTamil(!showAllTamil)}
                >
                  {showAllTamil ? 'Show Less' : 'See All'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tamilSongs.slice(0, showAllTamil ? 30 : 6).map((song: Song, index: number) => (
                <motion.div
                  key={`tamil-${song.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    // Play the song
                    setPlaylistAndPlay(tamilSongs, index);
                  }}
                >
                  {index < 3 && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {index === 0 ? 'TN' : index === 1 ? 'TAMIL' : 'SOUTH'}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    {song.image && song.image.length > 0 ? (
                      <img 
                        src={getHighestQualityImage(song.image)} 
                        alt={song.name} 
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
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
                          setPlaylistAndPlay(tamilSongs, index);
                        }}
                      >
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recently Played Section */}
          {user && recentlyPlayed.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Recently Played</h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleRefreshRecentlyPlayed}
                    disabled={isRefreshingRecentlyPlayed}
                  >
                    {isRefreshingRecentlyPlayed ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setShowAllRecentlyPlayed(!showAllRecentlyPlayed)}
                  >
                    {showAllRecentlyPlayed ? 'Show Less' : 'See All'}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recentlyPlayed.slice(0, showAllRecentlyPlayed ? 30 : 6).map((song: Song, index: number) => (
                  <motion.div
                    key={`recent-${song.id}`}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    whileHover={{ y: -5 }}
                    onClick={() => {
                      // Play the song
                      setPlaylistAndPlay(recentlyPlayed, index);
                    }}
                  >
                    <div className="relative">
                      {song.image && song.image.length > 0 ? (
                        <img 
                          src={getHighestQualityImage(song.image)} 
                          alt={song.name} 
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
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
                            setPlaylistAndPlay(recentlyPlayed, index);
                          }}
                        >
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Expanded Song Player Modal */}
      <AnimatePresence>
        {expandedSong && (
          <ExpandedSongPlayer
            isOpen={!!expandedSong}
            onClose={closeExpandedPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeView;