import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import PlaylistImportDialog from '../components/PlaylistImportDialog';
import PlaylistView from '../components/PlaylistView';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Heart, Music, Download, ListMusic, Play, Clock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import EnhancedFullscreenPlaylistView from '../components/EnhancedFullscreenPlaylistView';

interface LibraryViewProps {
  onOpenExpandedPlayer?: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onOpenExpandedPlayer }) => {
  const { queue, likedSongs, savedPlaylists, playSong, setQueue } = useMusic();
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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
                songs={queue} 
                title="Queue" 
                subtitle="Songs to be played next"
                onSongImageClick={(song) => {
                  // Play the song and notify parent to open expanded player
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
                songs={likedSongs} 
                title="Liked Songs" 
                subtitle="Your favorite tracks"
                onSongImageClick={(song) => {
                  // Play the song and notify parent to open expanded player
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
            {savedPlaylists.length > 0 ? (
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-6">Saved Playlists</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {savedPlaylists.map((playlist, index) => (
                    <motion.div
                      key={`library-${playlist.id}`} 
                      className="cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPlaylist(playlist)}
                    >
                      <Card className="overflow-hidden hover:bg-accent transition-colors group h-full flex flex-col">
                        {playlist.image ? (
                          <img 
                            src={playlist.image} 
                            alt={playlist.name} 
                            className="w-full aspect-square object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <Music className="w-12 h-12 text-white" />
                          </div>
                        )}
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg font-semibold truncate">{playlist.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 mt-auto">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{playlist.tracks.length} songs</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {playlist.tracks.reduce((total, song) => total + (song.duration || 0), 0) > 0 
                                ? formatDuration(playlist.tracks.reduce((total, song) => total + (song.duration || 0), 0)) 
                                : '0:00'}
                            </span>
                          </div>
                          <Button 
                            className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Set the entire playlist as the queue and play the first song
                              console.log('Setting playlist tracks as queue:', playlist.tracks.length);
                              setQueue(playlist.tracks);
                              playSong(playlist.tracks[0]);

                            }}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
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