import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search as SearchIcon, Music, Mail, X, Play, SlidersHorizontal } from 'lucide-react';
import { musicService } from '../services/musicService';
import type { Song } from '../services/jiosaavnApi';
import PlaylistView from '../components/PlaylistView';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import { useMusic } from '../context/MusicContext';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Filter Constants ────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'All Languages' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'english', label: 'English' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'gujarati', label: 'Gujarati' },
];

const YEAR_OPTIONS = [
  { value: 'all', label: 'All Years' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2020-2022', label: '2020 - 2022' },
  { value: 'before-2020', label: 'Before 2020' },
];

const GENRE_OPTIONS = [
  { value: 'all', label: 'All Genres' },
  { value: 'romantic', label: 'Romance' },
  { value: 'party', label: 'Party' },
  { value: 'sad', label: 'Sad' },
  { value: 'workout', label: 'Workout' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'classical', label: 'Classical' },
  { value: 'folk', label: 'Folk' },
  { value: 'filmi', label: 'Filmi' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'az', label: 'A - Z' },
];

// ─── Filter State Interface ──────────────────────────────────────────────────

interface SearchFilters {
  language: string;
  year: string;
  genre: string;
  sort: string;
}

const DEFAULT_FILTERS: SearchFilters = {
  language: 'all',
  year: 'all',
  genre: 'all',
  sort: 'relevance',
};

// ─── Filtering Helpers ───────────────────────────────────────────────────────

function matchesYear(song: Song, yearFilter: string): boolean {
  if (yearFilter === 'all') return true;

  const songYear = parseInt(song.year || '', 10);
  const releaseYear = song.releaseDate
    ? parseInt(song.releaseDate.split('-')[0] || '', 10)
    : 0;
  const effectiveYear = songYear || releaseYear;

  // Include songs with empty/missing year (API often omits this field)
  if (!effectiveYear) return true;

  switch (yearFilter) {
    case '2026':
    case '2025':
    case '2024':
    case '2023':
      return effectiveYear === parseInt(yearFilter, 10);
    case '2020-2022':
      return effectiveYear >= 2020 && effectiveYear <= 2022;
    case 'before-2020':
      return effectiveYear < 2020;
    default:
      return true;
  }
}

function matchesLanguage(song: Song, langFilter: string): boolean {
  if (langFilter === 'all') return true;
  const songLang = (song.language || '').toLowerCase().trim();
  // Include songs with empty/missing language (API often omits this field)
  if (!songLang) return true;
  return songLang.includes(langFilter);
}

function matchesGenre(song: Song, genreFilter: string): boolean {
  if (genreFilter === 'all') return true;

  // JioSaavn search results do not provide reliable genre metadata.
  // The selected genre is sent to the API as part of the search query, so keep
  // this check lenient and avoid hiding valid songs returned by the API.
  return true;
}

function sortSongs(songs: Song[], sortBy: string): Song[] {
  const sorted = [...songs];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => {
        const yearA = parseInt(a.year || '0', 10);
        const yearB = parseInt(b.year || '0', 10);
        return yearB - yearA;
      });
    case 'oldest':
      return sorted.sort((a, b) => {
        const yearA = parseInt(a.year || '9999', 10);
        const yearB = parseInt(b.year || '9999', 10);
        return yearA - yearB;
      });
    case 'popular':
      return sorted.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    case 'az':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'relevance':
    default:
      return sorted;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SearchViewProps {
  onOpenExpandedPlayer?: () => void;
}

const SearchView: React.FC<SearchViewProps> = ({ onOpenExpandedPlayer }) => {
  const { query: urlQuery } = useParams<{ query?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(urlQuery || '');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchLabel, setSearchLabel] = useState('');
  const [recentSearches, setRecentSearches] = useState<Song[]>([]);
  const { playSong, setQueue, setPlaylistAndPlay } = useMusic();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  // ── Filter state (persisted in URL) ──────────────────────────────────────
  const [filters, setFilters] = useState<SearchFilters>({
    language: searchParams.get('lang') || 'all',
    year: searchParams.get('year') || 'all',
    genre: searchParams.get('genre') || 'all',
    sort: searchParams.get('sort') || 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sync filters → URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (filters.language !== 'all') params.set('lang', filters.language);
    else params.delete('lang');
    if (filters.year !== 'all') params.set('year', filters.year);
    else params.delete('year');
    if (filters.genre !== 'all') params.set('genre', filters.genre);
    else params.delete('genre');
    if (filters.sort !== 'relevance') params.set('sort', filters.sort);
    else params.delete('sort');
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams, searchParams]);

  // ── Filtered + sorted results ────────────────────────────────────────────
  const filteredResults = useMemo(() => {
    if (!results.length) return results;
    let filtered = results.filter(
      (song) =>
        matchesLanguage(song, filters.language) &&
        matchesYear(song, filters.year) &&
        matchesGenre(song, filters.genre)
    );
    filtered = sortSongs(filtered, filters.sort);
    return filtered;
  }, [results, filters]);

  const hasActiveFilters =
    filters.language !== 'all' ||
    filters.year !== 'all' ||
    filters.genre !== 'all' ||
    filters.sort !== 'relevance';

  const hasSearchFilters =
    filters.language !== 'all' ||
    filters.year !== 'all' ||
    filters.genre !== 'all';

  const searchFilterValues = useMemo<SearchFilters>(() => ({
    language: filters.language,
    year: filters.year,
    genre: filters.genre,
    sort: DEFAULT_FILTERS.sort,
  }), [filters.language, filters.year, filters.genre]);

  const buildFilterOnlyQuery = useCallback((currentFilters: SearchFilters) => {
    const queryParts: string[] = [];

    if (currentFilters.language !== 'all') {
      const langLabel = LANGUAGE_OPTIONS.find((o) => o.value === currentFilters.language)?.label || currentFilters.language;
      queryParts.push(langLabel);
    }

    if (currentFilters.genre !== 'all') {
      const genreLabel = GENRE_OPTIONS.find((o) => o.value === currentFilters.genre)?.label || currentFilters.genre;
      queryParts.push(genreLabel);
    }

    if (currentFilters.year !== 'all') {
      const yearLabel = YEAR_OPTIONS.find((o) => o.value === currentFilters.year)?.label || currentFilters.year;
      queryParts.push(yearLabel);
    }

    return queryParts.length > 0 ? `${queryParts.join(' ')} songs` : '';
  }, []);

  const getDisplaySearchLabel = useCallback((typedQuery: string, currentFilters: SearchFilters) => {
    const trimmedQuery = typedQuery.trim();
    if (trimmedQuery) return trimmedQuery;

    const filterQuery = buildFilterOnlyQuery(currentFilters);
    return filterQuery || 'songs';
  }, [buildFilterOnlyQuery]);

  // ── Filter helpers ────────────────────────────────────────────────────────
  const updateFilter = useCallback(
    (key: keyof SearchFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const removeFilter = useCallback((key: keyof SearchFilters) => {
    setFilters((prev) => ({ ...prev, [key]: DEFAULT_FILTERS[key] }));
  }, []);

  const activeFilterLabels = useMemo(() => {
    const labels: { key: keyof SearchFilters; label: string }[] = [];
    if (filters.language !== 'all') {
      const opt = LANGUAGE_OPTIONS.find((o) => o.value === filters.language);
      labels.push({ key: 'language', label: opt?.label || filters.language });
    }
    if (filters.year !== 'all') {
      const opt = YEAR_OPTIONS.find((o) => o.value === filters.year);
      labels.push({ key: 'year', label: opt?.label || filters.year });
    }
    if (filters.genre !== 'all') {
      const opt = GENRE_OPTIONS.find((o) => o.value === filters.genre);
      labels.push({ key: 'genre', label: opt?.label || filters.genre });
    }
    if (filters.sort !== 'relevance') {
      const opt = SORT_OPTIONS.find((o) => o.value === filters.sort);
      labels.push({ key: 'sort', label: `Sort: ${opt?.label || filters.sort}` });
    }
    return labels;
  }, [filters]);

  // ── Debounced search ─────────────────────────────────────────────────────
  const debouncedSearch = useCallback((searchQuery: string, forceRefresh = false) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    const filterOnlyQuery = buildFilterOnlyQuery(searchFilterValues);

    if (!trimmedQuery && !filterOnlyQuery) {
      setResults([]);
      setSearched(false);
      setSearchLabel('');
      return;
    }

    // Build enhanced query: typed search stays primary, filter-only search uses selected filters.
    let enhancedQuery = trimmedQuery || filterOnlyQuery;
    if (trimmedQuery && searchFilterValues.language !== 'all') {
      const langLabel = LANGUAGE_OPTIONS.find(o => o.value === searchFilterValues.language)?.label || searchFilterValues.language;
      enhancedQuery += ` ${langLabel}`;
    }
    if (trimmedQuery && searchFilterValues.genre !== 'all') {
      const genreLabel = GENRE_OPTIONS.find(o => o.value === searchFilterValues.genre)?.label || searchFilterValues.genre;
      enhancedQuery += ` ${genreLabel}`;
    }
    if (trimmedQuery && searchFilterValues.year !== 'all') {
      const yearLabel = YEAR_OPTIONS.find(o => o.value === searchFilterValues.year)?.label || searchFilterValues.year;
      enhancedQuery += ` ${yearLabel}`;
    }

    const displayLabel = getDisplaySearchLabel(trimmedQuery, searchFilterValues);
    const debounceDelay = forceRefresh ? 0 : 300;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchLabel(displayLabel);
      try {
        const songs = await musicService.searchSongs(enhancedQuery, 50);
        setResults(songs);
        setSearched(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, debounceDelay);
  }, [buildFilterOnlyQuery, getDisplaySearchLabel, searchFilterValues]);

  // ── Load recent searches from localStorage on mount ──────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('recentSearchSongs');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent search songs:', e);
      }
    }
  }, []);

  // ── Handle URL parameter changes ─────────────────────────────────────────
  useEffect(() => {
    if (urlQuery) {
      const decoded = decodeURIComponent(urlQuery);
      setQuery(decoded);
      queryRef.current = decoded;
      debouncedSearch(decoded);
    }
  }, [urlQuery, debouncedSearch]);

  // Auto-search when language/year/genre filters change.
  // Sort-only changes simply reorder existing results through filteredResults.
  useEffect(() => {
    if (queryRef.current.trim() || hasSearchFilters) {
      debouncedSearch(queryRef.current.trim(), true);
    }
  }, [debouncedSearch, hasSearchFilters, filters.language, filters.year, filters.genre]);

  // Clear filter-only results when all search-driving filters are removed.
  useEffect(() => {
    if (!queryRef.current.trim() && !hasSearchFilters) {
      setResults([]);
      setSearched(false);
      setSearchLabel('');
    }
  }, [hasSearchFilters]);

  // ── Save a song to recent searches ───────────────────────────────────────
  const saveRecentSearchSong = (song: Song) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.id !== song.id);
      const updated = [song, ...filtered].slice(0, 10);
      localStorage.setItem('recentSearchSongs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    queryRef.current = value;
    debouncedSearch(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || hasSearchFilters) {
      debouncedSearch(query, true);
    }
  };

  // ── Convert songs for player ─────────────────────────────────────────────
  const convertSongsForPlayer = (songs: Song[]): any[] => {
    return songs.map((song) => {
      let audioUrl = '';
      if ((song as any).downloadUrl && Array.isArray((song as any).downloadUrl)) {
        const sortedUrls = [...(song as any).downloadUrl].sort((a, b) => {
          const qualityA = parseInt(a.quality || '0');
          const qualityB = parseInt(b.quality || '0');
          return qualityB - qualityA;
        });
        audioUrl = sortedUrls[0]?.link || '';
      }
      if (!audioUrl) {
        audioUrl = (song as any).url || '';
      }
      return {
        ...song,
        image: (song as any).image,
        url: audioUrl,
        duration: (song as any).duration || 0,
      };
    });
  };

  const handleSongClick = (song: Song) => {
    saveRecentSearchSong(song);
    const convertedSongs = convertSongsForPlayer(filteredResults);
    setPlaylistAndPlay(convertedSongs, filteredResults.findIndex((s) => s.id === song.id));
    onOpenExpandedPlayer?.();
  };

  const handleRecentSongClick = (song: Song) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.id !== song.id);
      const updated = [song, ...filtered];
      localStorage.setItem('recentSearchSongs', JSON.stringify(updated));
      return updated;
    });
    const convertedSong = convertSongsForPlayer([song]);
    setPlaylistAndPlay(convertedSong, 0);
    onOpenExpandedPlayer?.();
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearchSongs');
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Search Banner Image */}
      <motion.div
        className="max-w-2xl mx-auto mb-8 rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="h-40 flex items-center justify-center">
          <div className="text-center p-6">
            <SearchIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Discover Music</h2>
            <p className="text-muted-foreground">Search for your favorite songs, artists, and albums</p>
          </div>
        </div>
      </motion.div>

      {/* Search Input + Filter Toggle */}
      <motion.div
        className="max-w-2xl mx-auto mb-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="What do you want to listen to?"
              className="w-full pl-12 pr-12 py-6 text-lg bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              autoFocus
            />
            {loading && (
              <motion.div
                className="absolute right-14 top-1/2 transform -translate-y-1/2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${hasActiveFilters
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="max-w-2xl mx-auto mb-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-xl border border-border">
              <Select
                value={filters.language}
                onValueChange={(v) => updateFilter('language', v)}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.year}
                onValueChange={(v) => updateFilter('year', v)}
              >
                <SelectTrigger className="w-[120px] h-9 text-xs bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.genre}
                onValueChange={(v) => updateFilter('genre', v)}
              >
                <SelectTrigger className="w-[120px] h-9 text-xs bg-background">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sort}
                onValueChange={(v) => updateFilter('sort', v)}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs bg-background">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => {
                  debouncedSearch(queryRef.current.trim(), true);
                }}
                disabled={!queryRef.current.trim() && !hasSearchFilters}
                className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 ml-auto disabled:opacity-50"
              >
                <SearchIcon className="w-3.5 h-3.5 mr-1" />
                Search
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <motion.div
          className="max-w-2xl mx-auto mb-4 flex flex-wrap items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-xs text-muted-foreground">Filters:</span>
          {activeFilterLabels.map(({ key, label }) => (
            <motion.button
              key={key}
              onClick={() => removeFilter(key)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {label}
              <X className="w-3 h-3" />
            </motion.button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (query || hasSearchFilters) && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-muted-foreground mt-4">Searching for "{searchLabel || getDisplaySearchLabel(query, filters)}"...</p>
        </motion.div>
      )}

      {/* Search Results */}
      {!loading && searched && filteredResults.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <PlaylistView
            songs={filteredResults}
            title={`Search Results for "${searchLabel || getDisplaySearchLabel(query, filters)}"`}
            subtitle={
              hasActiveFilters
                ? `${filteredResults.length} of ${results.length} songs match your filters`
                : 'Click on any song to play'
            }
            onSongImageClick={handleSongClick}
          />
        </motion.div>
      )}

      {/* No results with filters active */}
      {!loading && searched && (query || hasSearchFilters) && results.length > 0 && filteredResults.length === 0 && hasActiveFilters && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <SlidersHorizontal className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No matches for these filters</h3>
          <p className="text-muted-foreground mb-4">
            Found {results.length} songs for "{searchLabel || getDisplaySearchLabel(query, filters)}" but none match the selected filters
          </p>
          <Button variant="outline" onClick={clearAllFilters}>
            Clear filters
          </Button>
        </motion.div>
      )}

      {/* No results at all */}
      {!loading && searched && (query || hasSearchFilters) && results.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">We couldn't find any songs matching "{searchLabel || getDisplaySearchLabel(query, filters)}"</p>
        </motion.div>
      )}

      {/* Recently Searched Songs */}
      {(!searched || (searched && query && filteredResults.length === 0 && !hasActiveFilters)) &&
        !query &&
        recentSearches.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Recently Played</h2>
                <p className="text-muted-foreground">Songs you've played recently</p>
              </div>
              <Button
                variant="ghost"
                onClick={clearAllRecentSearches}
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                Clear all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <AnimatePresence>
                {recentSearches.map((song, index) => (
                  <motion.div
                    key={song.id}
                    className="group relative bg-card rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => handleRecentSongClick(song)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      {song.image && song.image.length > 0 ? (
                        <img
                          src={getHighestQualityImage(song.image)}
                          alt={song.name || 'Unknown Song'}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML =
                                '<div class="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.105-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <Music className="w-8 h-8 text-primary-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                        >
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-foreground truncate text-sm">
                        {song.name || 'Unknown Song'}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.primaryArtists || 'Unknown Artist'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      {/* Empty state: no search, no recent searches */}
      {!searched && !query && !hasSearchFilters && recentSearches.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-accent p-6 rounded-full mb-6">
            <SearchIcon className="w-16 h-16 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Search for Music</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Find your favorite songs, artists, and albums by typing in the search box above
          </p>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-2">Need help?</p>
            <p className="text-sm text-muted-foreground">Contact us for support</p>
            <a
              href="mailto:thomassabucpz1234@gmail.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mt-1"
            >
              <Mail className="w-4 h-4" />
              thomassabucpz1234@gmail.com
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SearchView;
