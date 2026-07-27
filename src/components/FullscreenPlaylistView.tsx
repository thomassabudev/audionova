import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Play, Pause, Clock, Search, Heart, MoreHorizontal, Shuffle, SkipBack, SkipForward, Minimize2, Maximize2, Music, Share2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import type { Song } from '../services/jiosaavnApi';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import SharePlaylistModal from './SharePlaylistModal';
import PlayingEqualizerBadge from './PlayingEqualizerBadge';

// Define the Playlist interface locally since it's not exported from jiosaavnApi
interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Song[];
  image?: string;
  createdAt: Date;
}

interface FullscreenPlaylistViewProps {
  playlist: Playlist;
  onClose: () => void;
}

const FullscreenPlaylistView: React.FC<FullscreenPlaylistViewProps> = ({
  playlist,
  onClose
}) => {
  const { playSong, setQueue, currentSong, isSongLiked, addToLikedSongs, removeFromLikedSongs, isPlaying, togglePlayPause, currentTime, duration, seekTo, setPlaylistAndPlay, playNext, playPrevious, toggleRepeat, repeatMode } = useMusic();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const lastPlayedSongRef = useRef<string | null>(null);

  // Reset autoplay state when component unmounts
  useEffect(() => {
    return () => {
      setIsAutoplayEnabled(false);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLikeToggle = (song: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSongLiked(song.id)) {
      removeFromLikedSongs(song.id);
    } else {
      addToLikedSongs(song as any);
    }
  };

  const getSongImage = (song: Song) => {
    if (!song.image) return '';
    if (typeof song.image === 'string') return song.image;
    if (Array.isArray(song.image) && song.image.length > 0) return getHighestQualityImage(song.image as any);
    return '';
  };

  // Filter songs based on search query
  const filteredSongs = (playlist?.tracks || []).filter((song: Song) =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.primaryArtists.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Play a song from the playlist
  const playSongFromPlaylist = (song: any) => {
    if (!song) return;
    // Use filtered songs if there's a search query, otherwise use the full playlist
    const songsToUse = searchQuery ? filteredSongs : (playlist?.tracks || []);

    // Find the index of the song in the songs to use
    const songIndex = songsToUse.findIndex(track => track.id === song.id);
    if (songIndex !== -1) {
      // Use the new method to set the playlist and play the specific song
      setPlaylistAndPlay(songsToUse as any, songIndex);
    } else {
      // Fallback to the old method if song not found
      setQueue(songsToUse as any);
      playSong(song as any);
    }
  };

  // Play the next song in the playlist
  const playNextSong = () => {
    if (!currentSong) return;

    // Find the current song index
    const currentIndex = playlist.tracks.findIndex(track => track.id === currentSong.id);

    // If there's a next song, play it
    if (currentIndex >= 0 && currentIndex < playlist.tracks.length - 1) {
      // Use the global playNext function instead of setting queue manually
      playNext();
    }
  };

  // Play the previous song in the playlist
  const playPreviousSong = () => {
    if (!currentSong) return;

    // Find the current song index
    const currentIndex = playlist.tracks.findIndex(track => track.id === currentSong.id);

    // If there's a previous song, play it
    if (currentIndex > 0) {
      // Use the global playPrevious function instead of setting queue manually
      playPrevious();
    }
  };



  // Handle seek functionality
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !currentSong) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;

    // Use the seekTo function from MusicContext
    seekTo(newTime);
  };

  // Handle seek start (for drag functionality)
  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !currentSong) return;

    const handleSeekMove = (moveEvent: MouseEvent) => {
      const progressBar = e.currentTarget as HTMLDivElement;
      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newTime = percent * duration;

      // Update the seek position during drag
      seekTo(newTime);
    };

    const handleSeekEnd = () => {
      document.removeEventListener('mousemove', handleSeekMove);
      document.removeEventListener('mouseup', handleSeekEnd);
    };

    document.addEventListener('mousemove', handleSeekMove);
    document.addEventListener('mouseup', handleSeekEnd);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        className="relative h-1/3 min-h-[300px] flex items-end flex-shrink-0"
        initial={{ height: '30%' }}
        animate={{ height: '33.333%' }}
        transition={{ duration: 0.5 }}
      >
        {playlist.image ? (
          <img
            src={playlist.image}
            alt={playlist.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 w-full p-6 pb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-end gap-6">
            {playlist.image ? (
              <motion.img
                src={playlist.image}
                alt={playlist.name}
                className="w-48 h-48 rounded shadow-lg object-cover"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              />
            ) : (
              <motion.div
                className="w-48 h-48 bg-gradient-to-br from-purple-500 to-blue-500 rounded shadow-lg flex items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="bg-black/20 rounded-full p-4">
                  <Play className="w-12 h-12 text-white fill-current" />
                </div>
              </motion.div>
            )}

            <div className="pb-2">
              <p className="text-sm font-semibold text-white/90">Playlist</p>
              <motion.h1
                className="text-5xl font-bold text-white mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {playlist.name}
              </motion.h1>
              <motion.p
                className="text-white/90"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {playlist.description}
              </motion.p>
              <motion.p
                className="text-white/70 mt-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {playlist.tracks.length} song{playlist.tracks.length !== 1 ? 's' : ''}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Mini Player - Positioned under the right side */}
        <AnimatePresence>
          {isMiniPlayerOpen && currentSong && (
            <motion.div
              className="absolute top-32 right-6 w-80 bg-card/90 backdrop-blur-lg rounded-lg border border-border shadow-xl z-20"
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3">
                <div className="flex items-center gap-3">
                  {currentSong.image ? (
                    <img
                      src={typeof currentSong.image === 'string' ? currentSong.image : getHighestQualityImage(currentSong.image as any)}
                      alt={currentSong.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{currentSong.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{currentSong.primaryArtists}</p>
                  </div>
                  <button
                    onClick={() => setIsMiniPlayerOpen(false)}
                    className="p-1 rounded-full hover:bg-accent"
                  >
                    <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Progress Bar with Seek Functionality */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <div
                    className="w-full h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                    onClick={handleSeek}
                    onMouseDown={handleSeekStart}
                  >
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreviousSong();
                    }}
                    className="p-2 rounded-full hover:bg-accent"
                  >
                    <SkipBack className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="p-2 rounded-full bg-primary hover:bg-primary/90"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playNextSong();
                    }}
                    className="p-2 rounded-full hover:bg-accent"
                  >
                    <SkipForward className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 overflow-x-auto scrollbar-none max-w-full flex-nowrap"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <button
          onClick={() => {
            // If we're already playing a song from this playlist, toggle play/pause
            // Otherwise, play the first song
            const tracks = playlist?.tracks || [];
            if (isPlaying && currentSong && tracks.some(track => track.id === currentSong.id)) {
              togglePlayPause();
            } else if (currentSong && tracks.some(track => track.id === currentSong.id)) {
              togglePlayPause();
            } else if (tracks.length > 0) {
              playSongFromPlaylist(tracks[0]);
            }
          }}
          className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg hover:bg-emerald-600"
        >
          {isPlaying && currentSong && playlist.tracks.some(track => track.id === currentSong.id) ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>

        {/* Autoplay Toggle Button */}
        <button
          onClick={() => {
            const newAutoplayState = !isAutoplayEnabled;
            setIsAutoplayEnabled(newAutoplayState);
            // Toggle repeat mode to 'all' when enabling autoplay, 'off' when disabling
            if (newAutoplayState && repeatMode !== 'all') {
              toggleRepeat();
            } else if (!newAutoplayState && repeatMode === 'all') {
              toggleRepeat();
            }
          }}
          className={`px-4 py-2 flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-2 transition-all ${isAutoplayEnabled
            ? 'bg-green-500 text-white'
            : 'bg-card border border-border text-foreground hover:bg-accent'
            }`}
        >
          <Shuffle className="w-4 h-4" />
          <span className="text-sm font-medium">Autoplay</span>
          <div className={`w-2 h-2 rounded-full ${isAutoplayEnabled ? 'bg-white' : 'bg-muted-foreground'}`} />
        </button>

        {/* Share Playlist Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors"
          aria-label="Share playlist"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Mini Player Toggle Button */}
        {currentSong && (
          <button
            onClick={() => setIsMiniPlayerOpen(!isMiniPlayerOpen)}
            className="p-2 flex-shrink-0 rounded-full bg-card border border-border text-foreground hover:bg-accent transition-colors"
          >
            {isMiniPlayerOpen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        )}
      </motion.div>

      {/* Search Bar */}
      <motion.div
        className="px-4 md:px-6 py-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in playlist"
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </motion.div>

      {/* Songs List */}
      <motion.div
        className="flex-1 overflow-y-auto px-3 md:px-6 pb-32 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-red-500/30"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <div className="bg-card/80 rounded-lg overflow-hidden border border-border backdrop-blur-sm mt-4 min-h-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 md:gap-4 px-3 md:px-4 py-3 border-b border-border text-muted-foreground text-xs md:text-sm font-medium sticky top-0 bg-card/90 backdrop-blur z-10">
            <div className="col-span-1">#</div>
            <div className="col-span-9 md:col-span-5">Title</div>
            <div className="hidden md:flex col-span-3 items-center">Album</div>
            <div className="hidden md:flex col-span-2 items-center">Date Added</div>
            <div className="col-span-2 md:col-span-1 flex justify-end items-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* Songs */}
          <AnimatePresence>
            {filteredSongs.map((song: Song, index: number) => {
              const isCurrent = Boolean(
                currentSong && (
                  (currentSong.id && song.id && String(currentSong.id) === String(song.id)) ||
                  (currentSong.name && song.name && currentSong.name.toLowerCase().trim() === song.name.toLowerCase().trim())
                )
              );
              const songImage = getSongImage(song);

              return (
                <motion.div
                  key={`playlist-${playlist.id}-${song.id || index}`}
                  className={`grid grid-cols-12 gap-2 md:gap-4 px-3 md:px-4 py-3 hover:bg-accent/50 transition-colors group ${isCurrent ? 'bg-red-500/10 border-l-4 border-red-500' : ''
                    }`}
                  onClick={() => playSongFromPlaylist(song)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.9 + index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="col-span-1 flex items-center min-w-0">
                    {isCurrent ? (
                      <PlayingEqualizerBadge size="sm" />
                    ) : (
                      <span className="text-muted-foreground text-xs md:text-sm group-hover:hidden">{index + 1}</span>
                    )}
                    <button
                      className={`hidden group-hover:block ${isCurrent ? 'text-red-500' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        playSongFromPlaylist(song);
                      }}
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <div className="col-span-9 md:col-span-5 flex items-center gap-2.5 min-w-0">
                    {songImage && (
                      <img
                        src={songImage}
                        alt={song.name}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-xs md:text-sm truncate ${isCurrent ? 'text-red-500 font-semibold' : 'text-foreground'}`}>
                        {song.name}
                      </p>
                      <p className="text-[11px] md:text-xs text-muted-foreground truncate">
                        {song.primaryArtists}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:flex col-span-3 items-center min-w-0">
                    <p className="text-muted-foreground text-sm truncate">{song.album?.name || 'Unknown Album'}</p>
                  </div>

                  <div className="hidden md:flex col-span-2 items-center min-w-0">
                    <p className="text-muted-foreground text-sm truncate">
                      {song.year || new Date().getFullYear()}
                    </p>
                  </div>

                  <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1.5 min-w-0">
                    <button
                      onClick={(e) => handleLikeToggle(song, e)}
                      className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label={isSongLiked(song.id) ? "Unlike song" : "Like song"}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isSongLiked(song.id) ? 'fill-red-500 text-red-500' : ''
                          }`}
                      />
                    </button>
                    <span className="text-[10px] md:text-xs font-mono text-muted-foreground">
                      {song.duration ? formatDuration(song.duration) : '0:00'}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Share Playlist Modal */}
      <SharePlaylistModal
        playlist={playlist}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </motion.div>
  );
};

export default FullscreenPlaylistView;