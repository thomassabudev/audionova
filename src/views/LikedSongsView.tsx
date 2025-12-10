import React from 'react';
import { useMusic } from '../context/MusicContext';
import PlaylistView from '../components/PlaylistView';
import { Heart, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const LikedSongsView: React.FC = () => {
  const { likedSongs } = useMusic();

  return (
    <div className="p-6 relative">
      <motion.h2 
        className="text-3xl font-bold text-foreground mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Liked Songs
      </motion.h2>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {likedSongs && likedSongs.length > 0 ? (
          <PlaylistView 
            songs={likedSongs} 
            title="Liked Songs" 
            subtitle={`${likedSongs.length} favorite tracks`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <Heart className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No liked songs yet</p>
            <p className="text-muted-foreground text-sm">Like songs to save them to your library</p>
          </div>
        )}
      </motion.div>

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

export default LikedSongsView;