import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import PlaylistImportDialog from '../components/PlaylistImportDialog';
import PlaylistView, { type SongLike } from '../components/PlaylistView';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Heart, Music, Download, ListMusic, Play, Clock, Mail, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import EnhancedFullscreenPlaylistView from '../components/EnhancedFullscreenPlaylistView';

interface LibraryViewProps {
  onOpenExpandedPlayer?: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onOpenExpandedPlayer }) => {
  const { queue, likedSongs, savedPlaylists, playSong, setQueue, deletePlaylist } = useMusic();
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);

  const calculatePlaylistDuration = (tracks: any[]) => {
    if (!Array.isArray(tracks) || tracks.length === 0) return 0;
    return tracks.reduce((total, song) => {
      let dur = 0;
      if (typeof song.duration === 'number' && !isNaN(song.duration) && isFinite(song.duration)) {
        dur = song.duration;
      } else if (typeof song.duration === 'string') {
        if (song.duration.includes(':')) {
          const parts = song.duration.split(':');
          dur = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        } else {
          const parsed = Number(song.duration);
          if (!isNaN(parsed) && isFinite(parsed)) dur = parsed;
        }
      }
      return total + dur;
    }, 0);
  };

  const formatPlaylistDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs} hr ${remMins} min`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <motion.h2 
          className="text-3xl font-bold text-foreground"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Your Library
        </motion.h2>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <PlaylistImportDialog>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Import Playlist
            </Button>
          </PlaylistImportDialog>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Liked Songs
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Playlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-0">
            {queue && queue.length > 0 ? (
              <PlaylistView 
                songs={queue as unknown as SongLike[]} 
                title="Queue" 
                subtitle="Songs to be played next"
                onSongImageClick={(song) => {
                  playSong(song as any);
                  onOpenExpandedPlayer?.();
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <ListMusic className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">Your queue is empty</p>
                <p className="text-muted-foreground text-sm">Add songs to your queue to see them here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked" className="mt-0">
            {likedSongs && likedSongs.length > 0 ? (
              <PlaylistView 
                songs={likedSongs as unknown as SongLike[]} 
                title="Liked Songs" 
                subtitle="Your favorite tracks"
                onSongImageClick={(song) => {
                  playSong(song as any);
                  onOpenExpandedPlayer?.();
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <Heart className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No liked songs yet</p>
                <p className="text-muted-foreground text-sm">Like songs to save them to your library</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="playlists" className="mt-0">
            {savedPlaylists && savedPlaylists.length > 0 ? (
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Saved Playlists</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {savedPlaylists.map((playlist, index) => {
                    const totalSecs = calculatePlaylistDuration(playlist.tracks || []);
                    const durationStr = formatPlaylistDuration(totalSecs);

                    // Safely resolve cover image from string, string[], or ImageOption[] 
                    const rawImg = playlist.image || (playlist.tracks && playlist.tracks[0]?.image);
                    let coverSrc: string | string[] = '';
                    if (typeof rawImg === 'string') {
                      coverSrc = rawImg;
                    } else if (Array.isArray(rawImg) && rawImg.length > 0) {
                      if (typeof rawImg[0] === 'string') {
                         if (rawImg.length === 4) {
                            coverSrc = rawImg as string[];
                         } else {
                            coverSrc = rawImg[0];
                         }
                      } else {
                         const last = rawImg[rawImg.length - 1];
                         coverSrc = typeof last === 'string' ? last : (last?.link || '');
                      }
                    }

                    return (
                      <motion.div
                        key={`library-${playlist.id || index}-${index}`} 
                        className="group relative bg-card/60 hover:bg-accent/70 border border-border/40 rounded-xl p-3 transition-all duration-300 hover:shadow-xl flex flex-col h-full cursor-pointer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPlaylist(playlist)}
                      >
                        {/* Playlist Cover */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center shadow-md">
                          {Array.isArray(coverSrc) ? (
                            <div className="w-full h-full grid grid-cols-2 group-hover:scale-105 transition-transform duration-300">
                              {coverSrc.map((src, i) => (
                                <img key={i} src={src} alt="cover part" className="w-full h-full object-cover" />
                              ))}
                            </div>
                          ) : coverSrc ? (
                            <img 
                              src={coverSrc} 
                              alt={playlist.name || 'Playlist'} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-500/80 via-purple-600/80 to-blue-600/80 flex items-center justify-center">
                              <Music className="w-8 h-8 text-white" />
                            </div>
                          )}
                          
                          {/* Delete Button Overlay */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(playlist.id);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg hover:scale-110"
                            title="Remove Playlist"
                            aria-label="Remove playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Play Button Overlay */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playlist.tracks && playlist.tracks.length > 0) {
                                setQueue(playlist.tracks);
                                playSong(playlist.tracks[0]);
                              }
                            }}
                            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 hover:scale-105 hover:bg-emerald-600 z-10"
                            aria-label="Play playlist"
                          >
                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                          </button>
                        </div>

                        {/* Title & Info */}
                        <div className="mt-2.5 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {playlist.name || 'Untitled Playlist'}
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {playlist.tracks?.length || 0} song{playlist.tracks?.length !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {durationStr ? (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-1.5 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{durationStr}</span>
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <Music className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No playlists yet</p>
                <p className="text-muted-foreground text-sm mb-4">Import playlists from Spotify or YouTube</p>
                <PlaylistImportDialog>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Import Playlist
                  </Button>
                </PlaylistImportDialog>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Fullscreen Playlist View */}
      {selectedPlaylist && (
        <EnhancedFullscreenPlaylistView 
          playlist={{
            ...selectedPlaylist,
            version: selectedPlaylist.version || 1
          }} 
          onClose={() => setSelectedPlaylist(null)} 
        />
      )}
      
      {/* Developer Information Footer */}
      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          Developed by <span className="font-medium">Thomas Sabu</span>
        </p>
        <a 
          href="mailto:thomassabucpz1234@gmail.com" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mt-1"
        >
          <Mail className="w-4 h-4" />
          thomassabucpz1234@gmail.com
        </a>
      </div>
    </div>
  );
};

export default LibraryView;