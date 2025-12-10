/**
 * Trending Songs Section Component
 * Displays auto-updating trending songs with rank, delta, and badges
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, TrendingUp, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trendingService } from '@/services/trendingService';
import { formatDelta, getTimeAgo } from '@/utils/trending';
import SongCard from '@/components/SongCard';
import type { TrendingSong } from '@/utils/trending';

interface TrendingSongsSectionProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  showSparkline?: boolean;
  initialShowCount?: number; // How many to show initially before "See All"
}

const TrendingSongsSection: React.FC<TrendingSongsSectionProps> = ({
  limit = 50,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  showSparkline = false,
  initialShowCount = 6, // Show 6 cards initially
}) => {
  const [songs, setSongs] = useState<TrendingSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isStale, setIsStale] = useState(false);
  const [showAll, setShowAll] = useState(false);



  // Fetch trending songs
  const fetchTrending = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const trendingSongs = await trendingService.getTrendingSongs({
        limit,
        forceRefresh,
      });

      setSongs(trendingSongs);
      setLastUpdate(trendingService.getLastUpdateTime());
      setIsStale(trendingService.isStale());
    } catch (err) {
      console.error('Failed to fetch trending songs:', err);
      setError('Failed to load trending songs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTrending(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTrending]);

  // Manual refresh
  const handleRefresh = () => {
    console.log('[TrendingSongsSection] Manual refresh clicked - forcing new data');
    fetchTrending(true);
  };

  // Convert songs for player
  const convertSongsForPlayer = (songs: TrendingSong[]): any[] => {
    return songs.map(song => ({
      ...song,
      url: song.downloadUrl?.[0]?.link || '',
    }));
  };

  // Render badge
  const renderBadge = (badge: 'HOT' | 'RISING' | 'NEW') => {
    const badgeConfig = {
      HOT: {
        icon: Flame,
        color: 'bg-red-600',
        text: 'HOT',
      },
      RISING: {
        icon: TrendingUp,
        color: 'bg-orange-600',
        text: 'RISING',
      },
      NEW: {
        icon: Sparkles,
        color: 'bg-blue-600',
        text: 'NEW',
      },
    };

    const config = badgeConfig[badge];
    const Icon = config.icon;

    return (
      <span
        key={badge}
        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${config.color} text-white shadow-sm`}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.text}
      </span>
    );
  };

  if (loading && songs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-muted-foreground mt-2">Loading trending songs...</p>
        </motion.div>
      </div>
    );
  }

  if (error && songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const displayedSongs = showAll ? songs : songs.slice(0, initialShowCount);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Trending Now</h2>
          {lastUpdate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {isStale && <span className="text-orange-500">⚠ Stale data • </span>}
              Updated {getTimeAgo(lastUpdate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            {refreshing ? (
              <motion.div
                className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50" 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'See All'}
          </Button>
        </div>
      </div>

      {/* Songs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <AnimatePresence mode="popLayout">
          {displayedSongs.map((song, index) => {
            const delta = formatDelta(song.delta);
            
            return (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* Rank Badge - Top Left */}
                <div className="absolute top-2 left-2 z-20 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {song.rank}
                  </span>
                </div>

                {/* Delta Badge - Top Right */}
                {delta.text !== '—' && (
                  <div className={`absolute top-2 right-2 z-20 px-2 py-1 rounded-full text-xs font-bold ${delta.color} bg-black/60 backdrop-blur-sm`}>
                    {delta.icon} {delta.text}
                  </div>
                )}

                {/* Smart Badges - Below Image */}
                {song.badges.length > 0 && (
                  <div className="absolute bottom-16 left-2 right-2 z-20 flex items-center gap-1 flex-wrap">
                    {song.badges.slice(0, 2).map(badge => renderBadge(badge))}
                  </div>
                )}

                {/* Use Standard SongCard */}
                <SongCard
                  song={song}
                  playlist={convertSongsForPlayer(songs)}
                  index={index}
                  showNewBadge={false}
                  showLanguageBadge={false}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrendingSongsSection;
