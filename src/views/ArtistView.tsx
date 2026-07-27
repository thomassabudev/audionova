import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, UserCheck, Play, Pause, Music, Disc3,
  ArrowLeft, ExternalLink, Loader2, Users
} from 'lucide-react';
import { jiosaavnApi, getHighestQualityImage } from '../services/jiosaavnApi';
import { useSocial } from '../context/SocialContext';
import { useMusic } from '../context/MusicContext';
import SongCard from '../components/SongCard';
import type { ArtistFollow } from '../services/socialService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Album {
  id: string;
  name: string;
  year: string;
  language: string;
  playCount: string;
  image: Array<{ quality: string; link: string }>;
  url: string;
}

// ─── Album Card ───────────────────────────────────────────────────────────────
const AlbumCard: React.FC<{ album: Album; onClick: () => void }> = ({ album, onClick }) => {
  const imgSrc = getHighestQualityImage(album.image) || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23a855f7' width='300' height='300'/%3E%3Ctext fill='%23ffffff' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(album.name)}%3C/text%3E%3C/svg%3E`;

  return (
    <motion.div
      className="group cursor-pointer rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-shadow"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={imgSrc}
          alt={album.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Disc3 className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-3">
        <p className="font-medium text-foreground truncate text-sm">{album.name}</p>
        <p className="text-xs text-muted-foreground">{album.year || 'Unknown year'}</p>
      </div>
    </motion.div>
  );
};

// ─── Main ArtistView ──────────────────────────────────────────────────────────
const ArtistView: React.FC = () => {
  const { artistName } = useParams<{ artistName: string }>();
  const navigate = useNavigate();
  const { isFollowingArtist, toggleFollowArtist } = useSocial();
  const { setPlaylistAndPlay, currentSong, isPlaying } = useMusic();

  const decodedName = decodeURIComponent(artistName || '');

  const [songs, setSongs] = useState<any[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  // Derive a stable artistId from the name
  const artistId = decodedName.toLowerCase().replace(/\s+/g, '-');

  // Create the artist object for the social context
  const artistObj: ArtistFollow = {
    artistId,
    artistName: decodedName,
    artistImage: '',
  };

  const isFollowing = isFollowingArtist(artistId);

  // ── Fetch songs + albums ────────────────────────────────────────────────
  useEffect(() => {
    if (!decodedName) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [songResults, albumResults] = await Promise.all([
          jiosaavnApi.searchSongs(decodedName, 20),
          jiosaavnApi.searchAlbums(decodedName, 12),
        ]);

        // Filter to only songs where the artist matches
        const filteredSongs = songResults.filter(s =>
          (s.primaryArtists || '').toLowerCase().includes(decodedName.toLowerCase())
        );
        setSongs(filteredSongs.length > 0 ? filteredSongs : songResults.slice(0, 15));

        // Filter albums where artist matches
        const filteredAlbums = (albumResults as Album[]).filter(a => {
          const primaryArtists = (a as any).primaryArtists;
          if (Array.isArray(primaryArtists)) {
            return primaryArtists.some((pa: any) =>
              (pa.name || '').toLowerCase().includes(decodedName.toLowerCase())
            );
          }
          return true;
        });
        setAlbums(filteredAlbums.length > 0 ? filteredAlbums : (albumResults as Album[]).slice(0, 12));
      } catch (err) {
        console.error('[ArtistView] Failed to load artist data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [decodedName]);

  const handleFollow = async () => {
    setFollowLoading(true);
    // Update the artistImage from the first song if available
    const img = songs[0]?.image ? getHighestQualityImage(songs[0].image) : '';
    await toggleFollowArtist({ ...artistObj, artistImage: img });
    setFollowLoading(false);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) setPlaylistAndPlay(songs, 0);
  };

  // ── Gradient colors based on artist name hash ───────────────────────────
  const gradientColors = React.useMemo(() => {
    const hash = [...decodedName].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hue1 + 60) % 360;
    return { from: `hsl(${hue1}, 60%, 35%)`, to: `hsl(${hue2}, 70%, 20%)` };
  }, [decodedName]);

  // ── Artist avatar (first song image or gradient) ────────────────────────
  const artistImage = songs[0]?.image ? getHighestQualityImage(songs[0].image) : null;

  return (
    <div className="min-h-screen pb-32">
      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div
        className="relative h-72 md:h-80 flex items-end"
        style={{ background: `linear-gradient(135deg, ${gradientColors.from}, ${gradientColors.to})` }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/30 rounded-full px-3 py-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, white 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, white 0%, transparent 50%)' }}
        />

        {/* Artist avatar circle */}
        {artistImage && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
            <img src={artistImage} alt={decodedName} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Artist info */}
        <div className="relative z-10 p-6 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-white/70" />
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Artist</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">{decodedName}</h1>
          <div className="flex items-center gap-3 mt-2 text-white/70 text-sm">
            <span>{songs.length} songs</span>
            {albums.length > 0 && <><span>·</span><span>{albums.length} albums</span></>}
          </div>
        </div>
      </div>

      {/* ── Action Bar ───────────────────────────────────────────────────── */}
      <div className="px-6 py-4 flex items-center gap-3 bg-gradient-to-b from-background/50 to-transparent">
        <motion.button
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Play className="w-4 h-4 fill-current" />
          Play All
        </motion.button>

        <motion.button
          onClick={handleFollow}
          disabled={followLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border font-semibold text-sm transition-all ${
            isFollowing
              ? 'bg-primary/10 border-primary text-primary'
              : 'border-border text-foreground hover:bg-muted'
          }`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {followLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isFollowing ? (
            <UserCheck className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {isFollowing ? 'Following' : 'Follow'}
        </motion.button>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading artist...</p>
        </div>
      ) : (
        <div className="px-6 space-y-10">
          {/* Popular Songs */}
          {songs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Popular Songs
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {songs.map((song, i) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    playlist={songs}
                    index={i}
                    showNewBadge={false}
                    showLanguageBadge={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-primary" />
                Albums & Singles
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {albums.map(album => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onClick={() => navigate(`/album/${album.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {songs.length === 0 && albums.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Music className="w-12 h-12 opacity-30" />
              <p>No music found for "{decodedName}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtistView;
