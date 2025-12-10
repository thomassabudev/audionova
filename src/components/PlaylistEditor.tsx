import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart, 
  MoreHorizontal, 
  Volume2, 
  Music,
  Search,
  Home,
  Library,
  Radio,
  TrendingUp,
  Clock,
  Plus,
  X,
  Edit3,
  Trash2,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Filter,
  SortAsc,
  User,
  Users,
  Globe,
  Lock,
  Check,
  AlertTriangle,
  RotateCw,
  Save,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import type { Song } from '../services/jiosaavnApi';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Song[];
  version: number;
  createdAt: Date;
  [key: string]: any; // Allow additional properties
}

interface ReorderPayload {
  version: number;
  order: { id: string; position: number }[];
}

interface PlaylistEditorProps {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPlaylist: Playlist) => void;
  onAddTrack: (track: Song) => void;
  onRemoveTrack: (trackId: string) => void;
}

// Sortable Track Item Component
const SortableTrackItem: React.FC<{
  track: Song;
  uniqueId: string;
  isDragging?: boolean;
  onRemove: (id: string) => void;
}> = ({ track, uniqueId, isDragging = false, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDndDragging
  } = useSortable({ id: uniqueId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors ${
        isDndDragging ? 'z-10 shadow-lg' : ''
      }`}
      aria-label={`Track: ${track.name} by ${track.primaryArtists}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-accent"
        aria-label="Drag to reorder track"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      
      {/* Track Image */}
      {track.image && track.image.length > 0 && (
        <img 
          src={getHighestQualityImage(track.image)} 
          alt={track.name} 
          className="w-12 h-12 rounded object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <Music className="w-6 h-6 text-primary/70" />
              </div>
            `;
          }}
        />
      )}
      
      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{track.name}</p>
        <p className="text-sm text-muted-foreground truncate">{track.primaryArtists}</p>
      </div>
      
      {/* Duration */}
      <div className="text-sm text-muted-foreground">
        {track.duration ? formatDuration(track.duration) : '0:00'}
      </div>
      
      {/* Remove Button */}
      <button
        onClick={() => onRemove(track.id)}
        className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${track.name} from playlist`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// Drag Overlay Item
const TrackDragOverlay: React.FC<{ track: Song }> = ({ track }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-lg">
      <GripVertical className="w-4 h-4 text-muted-foreground" />
      {track.image && track.image.length > 0 && (
        <img 
          src={getHighestQualityImage(track.image)} 
          alt={track.name} 
          className="w-12 h-12 rounded object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <Music className="w-6 h-6 text-primary/70" />
              </div>
            `;
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{track.name}</p>
        <p className="text-sm text-muted-foreground truncate">{track.primaryArtists}</p>
      </div>
      <div className="text-sm text-muted-foreground">
        {track.duration ? formatDuration(track.duration) : '0:00'}
      </div>
      <Trash2 className="w-4 h-4 text-muted-foreground" />
    </div>
  );
};

// Search Modal Component
const SearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: Song) => void;
}> = ({ isOpen, onClose, onAddTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Temporary duplicate key detector (for development only)
  useEffect(() => {
    if (searchResults.length > 0) {
      const keys = searchResults.map(track => track.id);
      const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
      if (duplicates.length > 0) {
        console.warn('[Duplicate keys detected in search results]', Array.from(new Set(duplicates)).slice(0, 20));
      }
    }
  }, [searchResults]);
  
  // Real search API call using JioSaavn
  const searchTracks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // Use the existing JioSaavn API service
      const response = await fetch(`https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      
      if (data?.data?.results) {
        // Convert JioSaavn format to our Song format
        const songs: Song[] = data.data.results.map((item: any) => ({
          id: item.id,
          name: item.name,
          primaryArtists: item.primaryArtists,
          duration: item.duration,
          image: item.image || [],
          album: {
            id: item.album?.id || '',
            name: item.album?.name || 'Unknown Album',
            url: item.album?.url || ''
          },
          year: item.year || '',
          releaseDate: item.releaseDate || '',
          label: item.label || '',
          primaryArtistsId: item.primaryArtistsId || '',
          featuredArtists: item.featuredArtists || '',
          featuredArtistsId: item.featuredArtistsId || '',
          explicitContent: item.explicitContent || false,
          playCount: item.playCount || 0,
          language: item.language || 'Unknown',
          hasLyrics: item.hasLyrics || false,
          url: item.url || '',
          copyright: item.copyright || '',
          downloadUrl: item.downloadUrl || []
        }));
        
        setSearchResults(songs);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setSelectedIndex(-1);
    }
  }, []);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          onAddTrack(searchResults[selectedIndex]);
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [searchResults, selectedIndex, onAddTrack, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedItem = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  // Real-time search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTracks(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchTracks]);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Tracks</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for songs, artists, or albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
              aria-label="Search for tracks"
              autoFocus
            />
          </div>
        </div>
        
        <div 
          ref={resultsRef}
          className="flex-1 overflow-y-auto p-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((track, index) => (
                <div
                  key={`search-result-${track.id}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors ${
                    index === selectedIndex ? 'ring-2 ring-primary bg-accent' : ''
                  }`}
                  onClick={() => {
                    onAddTrack(track);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Album Art */}
                  {track.image && track.image.length > 0 ? (
                    <div className="relative">
                      <img 
                        src={getHighestQualityImage(track.image)} 
                        alt={track.name} 
                        className="w-12 h-12 rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                              <Music className="w-6 h-6 text-primary/70" />
                            </div>
                          `;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Music className="w-6 h-6 text-primary/70" />
                    </div>
                  )}
                  
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{track.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground truncate">{track.primaryArtists}</p>
                      {track.language && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                          {track.language}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{track.album?.name}</p>
                  </div>
                  
                  {/* Duration */}
                  <div className="text-sm text-muted-foreground">
                    {track.duration ? formatDuration(track.duration) : '0:00'}
                  </div>
                  
                  {/* Add Button */}
                  <button
                    className="p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTrack(track);
                      onClose();
                    }}
                    aria-label={`Add ${track.name} to playlist`}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tracks found for "{searchQuery}"</p>
              <p className="text-sm mt-2">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Search for songs, artists, or albums</p>
              <p className="text-sm mt-2">Start typing to find tracks to add to your playlist</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Conflict Resolution Modal
const ConflictModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  onMerge: () => void;
}> = ({ isOpen, onClose, onReload, onMerge }) => {
  if (!isOpen) return null;
  
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card rounded-lg border border-border w-full max-w-md overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold">Version Conflict</h3>
          </div>
          
          <p className="text-muted-foreground mb-6">
            The playlist has been modified by another user or device. How would you like to proceed?
          </p>
          
          <div className="flex flex-col gap-3">
            <Button onClick={onReload} variant="outline">
              <RotateCw className="w-4 h-4 mr-2" />
              Reload Latest Version
            </Button>
            <Button onClick={onMerge}>
              <Check className="w-4 h-4 mr-2" />
              Merge Changes
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper function to format duration
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({
  playlist,
  isOpen,
  onClose,
  onSave,
  onAddTrack,
  onRemoveTrack
}) => {
  const [tracks, setTracks] = useState<Song[]>(playlist.tracks);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [version, setVersion] = useState(playlist.version);
  


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    console.log('playlist_editor_drag_start', { 
      playlistId: playlist.id, 
      trackId: event.active.id 
    });
  };
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      setTracks((items) => {
        // Extract index from unique ID format: "songId-index"
        const oldIndex = parseInt(String(active.id).split('-').pop() || '0');
        const newIndex = parseInt(String(over.id).split('-').pop() || '0');
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        
        console.log('playlist_editor_reorder', { 
          playlistId: playlist.id, 
          trackId: active.id,
          oldIndex,
          newIndex
        });
        
        return newItems;
      });
    }
  };
  
  // Handle track removal
  const handleRemoveTrack = (trackId: string) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
    onRemoveTrack(trackId);
    setHasUnsavedChanges(true);
    
    console.log('playlist_editor_remove_track', { 
      playlistId: playlist.id, 
      trackId 
    });
  };
  
  // Handle track addition
  const handleAddTrack = (track: Song) => {
    setTracks(prev => [...prev, track]);
    onAddTrack(track);
    setHasUnsavedChanges(true);
    
    console.log('playlist_editor_add_track', { 
      playlistId: playlist.id, 
      trackId: track.id 
    });
  };
  
  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Prepare reorder payload
      const reorderPayload: ReorderPayload = {
        version,
        order: tracks.map((track, index) => ({
          id: track.id,
          position: index
        }))
      };
      
      // In a real app, this would be an API call:
      // const response = await fetch(`/api/playlists/${playlist.id}/reorder`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reorderPayload)
      // });
      //
      // if (response.status === 409) {
      //   setIsConflictModalOpen(true);
      //   return;
      // }
      //
      // if (!response.ok) {
      //   throw new Error('Failed to save playlist');
      // }
      //
      // const updatedPlaylist = await response.json();
      // setVersion(updatedPlaylist.version);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update playlist with new version
      const updatedPlaylist = {
        ...playlist,
        tracks,
        version: version + 1
      };
      
      setVersion(version + 1);
      setHasUnsavedChanges(false);
      onSave(updatedPlaylist);
      
      console.log('playlist_editor_save', { 
        playlistId: playlist.id, 
        trackCount: tracks.length 
      });
      
      // Show undo toast
      toast.success("Playlist saved", {
        description: "Changes have been saved successfully",
        action: {
          label: "Undo",
          onClick: () => {
            // Handle undo
            console.log('playlist_editor_undo', { 
              playlistId: playlist.id 
            });
            toast.success("Undo successful", {
              description: "Previous changes have been restored"
            });
          }
        },
        duration: 10000
      });
    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast.error("Save failed", {
        description: "Unable to save playlist changes. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle conflict resolution - reload
  const handleReload = () => {
    // In a real app, this would fetch the latest playlist version
    // const fetchLatestPlaylist = async () => {
    //   const response = await fetch(`/api/playlists/${playlist.id}`);
    //   const latestPlaylist = await response.json();
    //   setTracks(latestPlaylist.tracks);
    //   setVersion(latestPlaylist.version);
    // };
    
    setIsConflictModalOpen(false);
    setHasUnsavedChanges(false);
    
    console.log('playlist_editor_conflict_reload', { 
      playlistId: playlist.id 
    });
    
    toast.success("Playlist reloaded", {
      description: "Latest version has been loaded"
    });
  };
  
  // Handle conflict resolution - merge
  const handleMerge = () => {
    // In a real app, this would merge local changes with server changes
    setIsConflictModalOpen(false);
    
    console.log('playlist_editor_conflict_merge', { 
      playlistId: playlist.id 
    });
    
    toast.success("Changes merged", {
      description: "Your changes have been merged with the latest version"
    });
  };
  
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Trap focus
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Extract index from unique ID format: "songId-index"
  const activeIndex = activeId ? parseInt(String(activeId).split('-').pop() || '0') : -1;
  const activeTrack = activeIndex >= 0 && activeIndex < tracks.length ? tracks[activeIndex] : undefined;
  
  return (
    <motion.div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="ml-auto w-full max-w-2xl bg-card border-l border-border flex flex-col h-full"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Edit Playlist</h2>
            <p className="text-sm text-muted-foreground">{playlist.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-accent"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Button onClick={() => setIsSearchOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Tracks
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasUnsavedChanges || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
        
        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tracks.map((track, index) => `${track.id}-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {tracks.length > 0 ? (
                  tracks.map((track, index) => {
                    const uniqueId = `${track.id}-${index}`;
                    return (
                      <SortableTrackItem
                        key={uniqueId}
                        uniqueId={uniqueId}
                        track={track}
                        onRemove={handleRemoveTrack}
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No tracks in this playlist</p>
                    <p className="text-sm mt-2">Add tracks to get started</p>
                  </div>
                )}
              </div>
            </SortableContext>
            
            <DragOverlay>
              {activeTrack ? <TrackDragOverlay track={activeTrack} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </motion.div>
      
      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddTrack={handleAddTrack}
      />
      
      {/* Conflict Modal */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onReload={handleReload}
        onMerge={handleMerge}
      />
    </motion.div>
  );
};

export default PlaylistEditor;