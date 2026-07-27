import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Pause, ArrowLeft, Clock, Disc3, Music,
  Loader2, ExternalLink, Heart
} from 'lucide-react';
import { jiosaavnApi, getHighestQualityImage } from '../services/jiosaavnApi';
import { useMusic } from '../context/MusicContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Track Row ────────────────────────────────────────────────────────────────
interface TrackRowProps {
  song: any;
  index: number;
  onPlay: () => void;
  isCurrentSong: boolean;
  isPlaying: boolean;
}

const TrackRow: React.FC<TrackRowProps> = ({ song, index, onPlay, isCurrentSong, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const { isSongLiked, addToLikedSongs, removeFromLikedSongs } = useMusic();
  const liked = isSongLiked(song.id);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) removeFromLikedSongs(song.id);
    else addToLikedSongs(song);
  };

  return (
    <motion.div
      className={`group flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
        isCurrentSong ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
    >
      {/* Track number / play icon */}
      <div className="w-8 text-center flex-shrink-0">
        {hovered || isCurrentSong ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="w-6 h-6 flex items-center justify-center"
            aria-label={isCurrentSong && isPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentSong && isPlaying ? (
              <Pause className="w-4 h-4 text-primary" />
            ) : (
              <Play className="w-4 h-4 text-primary fill-current" />
            )}
          </button>
        ) : (
          <span className={`text-sm ${isCurrentSong ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Song artwork */}
      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 shadow-sm">
        <img
          src={getHighestQualityImage(song.image) || ''}
          alt={song.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23a855f7' width='40' height='40'/%3E%3C/svg%3E`;
          }}
        />
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate text-sm ${isCurrentSong ? 'text-primary' : 'text-foreground'}`}>
          {song.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{song.primaryArtists || 'Unknown Artist'}</p>
      </div>

      {/* Like button */}
      <button
        onClick={handleLike}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted"
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart className={`w-4 h-4 ${liked ? 'fill-current text-red-500' : 'text-muted-foreground'}`} />
      </button>

      {/* Duration */}
      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
        {formatDuration(song.duration)}
      </span>
    </motion.div>
  );
};

// ─── Main AlbumView ───────────────────────────────────────────────────────────
const AlbumView: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { setPlaylistAndPlay, playSong, togglePlayPause, currentSong, isPlaying } = useMusic();

  const [albumData, setAlbumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!albumId) return;
    setLoading(true);

    jiosaavnApi.getAlbumById(albumId)
      .then(data => setAlbumData(data))
      .catch(err => console.error('[AlbumView] Failed to load album:', err))
      .finally(() => setLoading(false));
  }, [albumId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading album...</p>
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <Disc3 className="w-12 h-12 opacity-30" />
        <p>Album not found</p>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline text-sm">Go back</button>
      </div>
    );
  }

  const songs: any[] = albumData.songs || albumData.tracks || [];
  const albumImage = getHighestQualityImage(albumData.image) || '';
  const artistName = Array.isArray(albumData.primaryArtists)
    ? albumData.primaryArtists.map((a: any) => a.name).join(', ')
    : albumData.primaryArtists || 'Various Artists';
  const totalDuration = songs.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);

  const handlePlaySong = (song: any, index: number) => {
    if (currentSong?.id === song.id) {
      togglePlayPause();
    } else {
      setPlaylistAndPlay(songs, index);
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) setPlaylistAndPlay(songs, 0);
  };

  return (
    <div className="min-h-screen pb-32">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Blurred background */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110"
          style={{ backgroundImage: albumImage ? `url(${albumImage})` : undefined }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />

        <div className="relative z-10 px-6 pt-6 pb-8">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Album art */}
            <motion.div
              className="w-44 h-44 rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {albumImage ? (
                <img src={albumImage} alt={albumData.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            {/* Album metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Disc3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Album</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2 truncate">{albumData.name}</h1>
              <button
                onClick={() => navigate(`/artist/${encodeURIComponent(artistName)}`)}
                className="text-foreground font-semibold hover:text-primary transition-colors"
              >
                {artistName}
              </button>
              <div className="flex items-center gap-3 mt-2 text-muted-foreground text-sm">
                {albumData.year && <span>{albumData.year}</span>}
                {songs.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{songs.length} songs</span>
                  </>
                )}
                {totalDuration > 0 && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(totalDuration)}</span>
                  </>
                )}
                {albumData.language && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{albumData.language}</span>
                  </>
                )}
              </div>

              {/* Play All */}
              <motion.button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Play className="w-4 h-4 fill-current" />
                Play All
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Track List ───────────────────────────────────────────────────── */}
      <div className="px-6">
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider border-b border-border mb-2">
          <span className="w-8 text-center">#</span>
          <span className="w-10" />
          <span className="flex-1">Title</span>
          <span className="w-10 text-right"><Clock className="w-3.5 h-3.5 inline" /></span>
        </div>

        <div className="space-y-1">
          {songs.length > 0 ? (
            songs.map((song: any, i: number) => (
              <TrackRow
                key={song.id || i}
                song={song}
                index={i}
                onPlay={() => handlePlaySong(song, i)}
                isCurrentSong={currentSong?.id === song.id}
                isPlaying={isPlaying}
              />
            ))
          ) : (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
              <Music className="w-10 h-10 opacity-30" />
              <p className="text-sm">No tracks available for this album</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumView;
