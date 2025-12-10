/**
 * Trending Songs - Core Utilities
 * Scoring, trend detection, and helper functions for trending songs feature
 */

import type { Song } from '@/services/jiosaavnApi';

export interface SongHistory {
  songId: string;
  playCount: number;
  timestamp: number;
}

export interface TrendingConfig {
  weights: {
    w1: number; // absolute score (playCount)
    w2: number; // velocity score (growth rate)
    w3: number; // engagement score (likes/saves)
    w4: number; // recency boost
    w5: number; // position boost
  };
  thresholds: {
    hot: number;      // Score threshold for HOT badge
    rising: number;   // Velocity threshold for RISING badge
    newDays: number;  // Days to consider song as NEW
  };
  targetYear: number;
}

export const DEFAULT_TRENDING_CONFIG: TrendingConfig = {
  weights: {
    w1: 1.0,   // absolute score
    w2: 2.0,   // velocity (most important for trending)
    w3: 0.5,   // engagement
    w4: 0.3,   // recency
    w5: 0.2,   // position
  },
  thresholds: {
    hot: 15,      // Top 3% or score > 15
    rising: 0.5,  // 50% growth rate
    newDays: 14,
  },
  targetYear: 2025,
};

export interface TrendingSong extends Song {
  score: number;
  rank: number;
  delta: number;
  velocity: number;
  badges: Array<'HOT' | 'RISING' | 'NEW'>;
  lastUpdated: number;
}

/**
 * Compute trend score for a song
 */
export function computeTrendScore(
  song: Song,
  history: SongHistory[] = [],
  config: TrendingConfig = DEFAULT_TRENDING_CONFIG
): { score: number; velocity: number } {
  const { w1, w2, w3, w4, w5 } = config.weights;
  const currentYear = 2025;
  const previousYear = 2024;
  
  // 1. Absolute score from play count
  const playCount = Number(song.playCount) || 0;
  const absoluteScore = Math.log1p(playCount) * w1;
  
  // 2. Velocity score (growth rate)
  let velocity = 0;
  if (history.length >= 2) {
    const latest = history[history.length - 1].playCount;
    const previous = history[history.length - 2].playCount;
    
    if (previous > 0) {
      velocity = (latest - previous) / previous;
    } else if (latest > 0) {
      velocity = 1; // 100% growth from 0
    }
  } else if (playCount > 0) {
    // No history, assume moderate velocity for new entries
    velocity = 0.3;
  }
  
  // Cap velocity to prevent extreme spikes
  velocity = Math.max(-1, Math.min(velocity, 5));
  const velocityScore = Math.max(0, velocity) * w2;
  
  // 3. Engagement score (likes/saves)
  const likes = Number((song as any).likes || (song as any).likedCount || 0);
  const saves = Number((song as any).saves || 0);
  const engagementScore = Math.log1p(likes + saves) * w3;
  
  // 4. Recency boost - prioritize 2025, then 2024
  let recencyBoost = 0;
  if (song.releaseDate) {
    const releaseYear = new Date(song.releaseDate).getFullYear();
    if (releaseYear === currentYear) {
      recencyBoost = 2 * w4; // Double boost for 2025
    } else if (releaseYear === previousYear) {
      recencyBoost = 1 * w4; // Normal boost for 2024
    }
  } else if (song.year) {
    const year = Number(song.year);
    if (year === currentYear) {
      recencyBoost = 2 * w4; // Double boost for 2025
    } else if (year === previousYear) {
      recencyBoost = 1 * w4; // Normal boost for 2024
    }
  }
  
  // 5. Position boost (if playCount is missing, use position as proxy)
  let positionBoost = 0;
  if (playCount === 0 && (song as any).position) {
    const position = Number((song as any).position);
    positionBoost = (1 / (position + 1)) * w5;
  }
  
  const totalScore = absoluteScore + velocityScore + engagementScore + recencyBoost + positionBoost;
  
  return {
    score: totalScore,
    velocity,
  };
}

/**
 * Determine badges for a song
 */
export function determineBadges(
  song: Song,
  score: number,
  velocity: number,
  config: TrendingConfig = DEFAULT_TRENDING_CONFIG
): Array<'HOT' | 'RISING' | 'NEW'> {
  const badges: Array<'HOT' | 'RISING' | 'NEW'> = [];
  
  // HOT badge
  if (score >= config.thresholds.hot) {
    badges.push('HOT');
  }
  
  // RISING badge
  if (velocity >= config.thresholds.rising) {
    badges.push('RISING');
  }
  
  // NEW badge
  const now = Date.now();
  if (song.releaseDate) {
    const releaseTime = new Date(song.releaseDate).getTime();
    const daysSinceRelease = (now - releaseTime) / (1000 * 60 * 60 * 24);
    if (daysSinceRelease >= 0 && daysSinceRelease <= config.thresholds.newDays) {
      badges.push('NEW');
    }
  } else if (song.year) {
    const year = Number(song.year);
    if (year === config.targetYear) {
      badges.push('NEW');
    }
  }
  
  return badges;
}

/**
 * Merge and deduplicate songs
 */
export function mergeAndDedupe(songs: Song[]): Song[] {
  const map = new Map<string, Song>();
  
  for (const song of songs) {
    const existing = map.get(song.id);
    
    if (!existing) {
      map.set(song.id, song);
    } else {
      // Prefer song with higher playCount or more recent releaseDate
      const existingPlayCount = Number(existing.playCount) || 0;
      const newPlayCount = Number(song.playCount) || 0;
      
      if (newPlayCount > existingPlayCount) {
        map.set(song.id, song);
      } else if (newPlayCount === existingPlayCount) {
        // Compare release dates
        const existingDate = existing.releaseDate ? new Date(existing.releaseDate).getTime() : 0;
        const newDate = song.releaseDate ? new Date(song.releaseDate).getTime() : 0;
        
        if (newDate > existingDate) {
          map.set(song.id, song);
        }
      }
    }
  }
  
  return Array.from(map.values());
}

/**
 * Calculate rank delta compared to previous ranking
 */
export function calculateDeltas(
  current: TrendingSong[],
  previous: TrendingSong[]
): TrendingSong[] {
  const prevRankMap = new Map<string, number>();
  previous.forEach((song, index) => {
    prevRankMap.set(song.id, index + 1);
  });
  
  return current.map((song, index) => {
    const currentRank = index + 1;
    const previousRank = prevRankMap.get(song.id);
    
    let delta = 0;
    if (previousRank !== undefined) {
      // Negative delta means moved up (better rank)
      delta = previousRank - currentRank;
    }
    
    return {
      ...song,
      rank: currentRank,
      delta,
    };
  });
}

/**
 * Get language short code
 */
export function getLangCode(language?: string): string {
  if (!language) return 'UN';
  
  const lang = language.toLowerCase();
  
  if (lang.includes('malayalam')) return 'ML';
  if (lang.includes('tamil')) return 'TA';
  if (lang.includes('hindi')) return 'HI';
  if (lang.includes('english')) return 'EN';
  if (lang.includes('telugu')) return 'TE';
  if (lang.includes('kannada')) return 'KN';
  if (lang.includes('punjabi')) return 'PB';
  
  return 'UN';
}

/**
 * Format delta for display
 */
export function formatDelta(delta: number): { text: string; color: string; icon: string } {
  if (delta > 0) {
    return {
      text: `+${delta}`,
      color: 'text-green-600',
      icon: '▲',
    };
  } else if (delta < 0) {
    return {
      text: `${delta}`,
      color: 'text-red-600',
      icon: '▼',
    };
  } else {
    return {
      text: '—',
      color: 'text-gray-400',
      icon: '—',
    };
  }
}

/**
 * Get time ago string
 */
export function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
