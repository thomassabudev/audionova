import React from 'react';
import { Play, Pause, Clock, Heart, MoreHorizontal, Music } from 'lucide-react';
import { Button } from './ui/button';
import { useMusic } from '../context/MusicContext';
import type { Song } from '../services/jiosaavnApi';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import PlaylistSongItem from './PlaylistSongItem';

interface PlaylistViewProps {
  songs: Song[];
  title?: string;
  subtitle?: string;
  coverImage?: string;
  onSongImageClick?: (song: Song) => void;
  playlistId?: string; // Add playlistId prop
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ 
  songs, 
  title = 'Playlist', 
  subtitle = '', 
  coverImage,
  onSongImageClick,
  playlistId = 'default' // Default playlistId
}) => {
  const { playSong, setQueue, currentSong, isSongLiked, addToLikedSongs, removeFromLikedSongs, isPlaying, togglePlayPause, audioRef } = useMusic();

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLikeToggle = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSongLiked(song.id)) {
      removeFromLikedSongs(song.id);
    } else {
      addToLikedSongs(song);
    }
  };

  const getSongImage = (song: Song) => {
    if (!song.image || song.image.length === 0) return '';
    return getHighestQualityImage(song.image);
  };

  // Check if a song is currently playing
  const isSongPlaying = (song: Song) => {
    return isPlaying && currentSong?.id === song.id;
  };

  return (
    <div className="space-y-6">
      {/* Playlist Header */}
      {(title || subtitle) && (
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          {coverImage ? (
            <img 
              src={coverImage} 
              alt={title} 
              className="w-48 h-48 rounded shadow-lg object-cover"
            />
          ) : (
            <div className="w-48 h-48 bg-gradient-to-br from-green-500 to-emerald-700 rounded shadow-lg flex items-center justify-center">
              <div className="bg-black/20 rounded-full p-4">
                <Play className="w-12 h-12 text-white fill-current" />
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>
}
            <p className="text-muted-foreground mt-2">
              {songs.length} song{songs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="bg-card rounded-lg overflow-hidden border border-border">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border text-muted-foreground text-sm font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-3">Album</div>
          <div className="col-span-2">Date Added</div>
          <div className="col-span-1 flex justify-end">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Songs */}
        <div>
        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          const playing = isCurrent && isPlaying;
          
          return (
            <PlaylistSongItem
              key={`playlist-${playlistId}-${song.id || index}`}
              song={song}
              index={index}
              isCurrent={isCurrent}
              playlistId={playlistId}
              playing={playing}
              onPlay={(song) => {
                // Set the entire playlist as the queue
                setQueue(songs);
                // Play the selected song
                playSong(song);
                // Notify parent to open expanded player
                onSongImageClick?.(song);
              }}
              onTogglePlayPause={togglePlayPause}
              onLikeToggle={handleLikeToggle}
              isSongLiked={isSongLiked}
              formatDuration={formatDuration}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default PlaylistView;