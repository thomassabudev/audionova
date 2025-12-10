import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Heart, ListMusic } from 'lucide-react';
import { Button } from './ui/button';
import { useMusic } from '@/context/MusicContext';
import PlaylistView from './PlaylistView';

interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: any[]; // Using any[] to avoid importing Song type
  image?: string;
  createdAt: Date;
  curator?: string;
  followers?: number;
  version: number;
}

interface PlaylistSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistSelect?: (playlist: Playlist) => void;
}

const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({ isOpen, onClose, onPlaylistSelect }) => {
  const { savedPlaylists, likedSongs } = useMusic();

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Sidebar - Attached to the right without blur */}
          <motion.div 
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{ willChange: 'transform' }}
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ 
              duration: 0.25,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Library</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
                aria-label="Close library"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto h-[calc(100%-60px)] scrollbar-hide">
              {/* Liked Songs */}
              {likedSongs.length > 0 && (
                <div className="p-4">
                  <div 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => {
                      // In a real implementation, you would navigate to the liked songs view
                      console.log('Navigate to liked songs');
                    }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded flex items-center justify-center">
                      <Heart className="w-6 h-6 text-white fill-current" />
                    </div>
                    <div>
                      <h3 className="font-medium">Liked Songs</h3>
                      <p className="text-sm text-muted-foreground">{likedSongs.length} songs</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Playlists */}
              {savedPlaylists.length > 0 ? (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Playlists
                  </h3>
                  <div className="space-y-2">
                    {savedPlaylists.map((playlist: any) => (
                      <div 
                        key={playlist.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => {
                          if (onPlaylistSelect) {
                            onPlaylistSelect(playlist);
                            onClose();
                          }
                        }}
                      >
                        {playlist.image ? (
                          <img 
                            src={playlist.image} 
                            alt={playlist.name} 
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
                            <Music className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{playlist.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{playlist.tracks.length} songs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No playlists yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import playlists from Spotify or YouTube
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PlaylistSidebar;