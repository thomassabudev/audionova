import React from 'react';
import { Play, Clock } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import PlaylistSongItem from './PlaylistSongItem';
import { getHighestQualityImage } from '../services/jiosaavnApi';

// Flexible song interface compatible with both MusicContext songs and JioSaavn API songs
export interface SongLike {
  id: string;
  name: string;
  primaryArtists: string;
  image: Array<{ quality?: string; link: string }> | string[] | string | null;
  duration: number;
  url: string;
  downloadUrl?: Array<{ quality?: string; link: string }>;
  album?: string | { id?: string; name: string; url?: string };
  year?: string;
  language?: string;
  playCount?: number;
  releaseDate?: string;
}

interface PlaylistViewProps {
  songs: SongLike[];
  title?: string;
  subtitle?: string;
  coverImage?: string;
  onSongImageClick?: (song: SongLike) => void;
  playlistId?: string;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ 
  songs, 
  title = 'Playlist', 
  subtitle = '', 
  coverImage,
  onSongImageClick,
  playlistId = 'default'
}) => {
  const { playSong, setQueue, currentSong, isSongLiked, addToLikedSongs, removeFromLikedSongs, isPlaying, togglePlayPause } = useMusic();

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLikeToggle = (song: SongLike, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSongLiked(song.id)) {
      removeFromLikedSongs(song.id);
    } else {
      // Cast to any to bridge the Song type gap — runtime shape is compatible
      addToLikedSongs(song as any);
    }
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
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
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
            const isCurrent = Boolean(
              currentSong && (
                (currentSong.id && song.id && String(currentSong.id) === String(song.id)) ||
                (currentSong.name && song.name && currentSong.name.toLowerCase().trim() === song.name.toLowerCase().trim())
              )
            );
            const playing = isCurrent && isPlaying;

            return (
              <PlaylistSongItem
                key={`${playlistId}-${song.id || `song-${index}`}`}
                song={song as any}
                index={index}
                isCurrent={isCurrent}
                playing={playing}
                onPlay={(s) => {
                  setQueue(songs as any[]);
                  playSong(s as any);
                  onSongImageClick?.(s as SongLike);
                }}
                onTogglePlayPause={togglePlayPause}
                onLikeToggle={handleLikeToggle as any}
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