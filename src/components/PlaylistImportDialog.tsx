import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Download, Youtube, Music4, Loader2, Save } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '../config/api';

interface PlaylistImportDialogProps {
  children: React.ReactNode;
}

const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { setQueue, savePlaylist } = useMusic();

  const validateSpotifyUrl = (url: string) => {
    if (!url) return true; // Not required
    const spotifyRegex = /^(https?:\/\/)?(www\.)?open\.spotify\.com\/(playlist|album|user\/[^\/]+\/playlist)\/([a-zA-Z0-9]+)(\?.*)?$/;
    return spotifyRegex.test(url);
  };

  const validateYoutubeUrl = (url: string) => {
    if (!url) return true; // Not required
    try {
      const urlString = url.startsWith('http') ? url : `https://${url}`;
      const parsedUrl = new URL(urlString);
      const validHostnames = ['youtube.com', 'www.youtube.com', 'music.youtube.com', 'youtu.be'];
      
      if (!validHostnames.includes(parsedUrl.hostname)) return false;
      if (!parsedUrl.pathname.includes('playlist')) return false;
      
      return !!parsedUrl.searchParams.get('list');
    } catch (e) {
      return false;
    }
  };

  const extractSpotifyId = (url: string) => {
    const match = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const extractYoutubeId = (url: string) => {
    try {
      const urlString = url.startsWith('http') ? url : `https://${url}`;
      const parsedUrl = new URL(urlString);
      return parsedUrl.searchParams.get('list');
    } catch (e) {
      const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
  };

  const handleImport = async (e: React.FormEvent, saveAfterImport: boolean = false) => {
    e.preventDefault();
    setIsImporting(true);
    
    // Validate URLs
    const isSpotifyValid = validateSpotifyUrl(spotifyUrl);
    const isYoutubeValid = validateYoutubeUrl(youtubeUrl);
    
    if ((spotifyUrl && !isSpotifyValid) || (youtubeUrl && !isYoutubeValid)) {
      toast.error('Invalid URL format', {
        description: 'Please check the URL format and try again.',
      });
      setIsImporting(false);
      return;
    }
    
    try {
      if (spotifyUrl) {
        const playlistId = extractSpotifyId(spotifyUrl);
        if (!playlistId) {
          throw new Error('Invalid Spotify playlist URL');
        }
        
        // Call backend API to import Spotify playlist
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/import/spotify/${playlistId}`);
        const data = await response.json();
        
        if (!response.ok) {
          const errorMessage = data.error || response.statusText;
          
          // Provide specific guidance for common issues
          if (response.status === 400 && errorMessage.includes('curated playlists')) {
            throw new Error('This appears to be a Spotify curated playlist (like Discover Weekly or Daily Mix). These cannot be imported due to Spotify API limitations. Please try importing a public user-created playlist instead.');
          } else if (response.status === 404) {
            throw new Error('Playlist not found. Please check that the playlist is public and the URL is correct.');
          } else {
            throw new Error(`Import failed: ${errorMessage}`);
          }
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to import playlist');
        }
        
        // Log the imported data for debugging
        console.log('Imported playlist data:', data);
        
        // Validate that we have tracks
        if (!data.playlist || !data.playlist.tracks || data.playlist.tracks.length === 0) {
          throw new Error('No tracks found in the imported playlist');
        }
        
        // Add songs to queue
        setQueue(data.playlist.tracks);
        
        // Save playlist to library
        const playlistToSave = {
          id: data.playlist.id,
          name: data.playlist.name,
          description: data.playlist.description,
          tracks: data.playlist.tracks,
          image: data.playlist.image,
          createdAt: new Date(),
          version: 1,
        };
        
        savePlaylist(playlistToSave);
        
        toast.success('Playlist Imported & Saved!', {
          description: `Added ${data.playlist.tracks.length} songs to your queue and saved "${data.playlist.name}" to your library`,
        });
        
        setOpen(false);
      } else if (youtubeUrl) {
        const playlistId = extractYoutubeId(youtubeUrl);
        if (!playlistId) {
          throw new Error('Invalid YouTube playlist URL');
        }
        
        // Call backend API to import YouTube playlist
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/import/youtube/${playlistId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to import playlist');
        }
        
        // Validate that we have tracks
        if (!data.playlist || !data.playlist.tracks || data.playlist.tracks.length === 0) {
          throw new Error('No tracks found in the imported playlist');
        }
        
        // Add songs to queue
        setQueue(data.playlist.tracks);
        
        // Save playlist to library
        const playlistToSave = {
          id: data.playlist.id,
          name: data.playlist.name,
          description: data.playlist.description,
          tracks: data.playlist.tracks,
          image: data.playlist.image,
          createdAt: new Date(),
          version: 1,
        };
        
        savePlaylist(playlistToSave);
        
        toast.success('Playlist Imported & Saved!', {
          description: `Added ${data.playlist.tracks.length} songs to your queue and saved "${data.playlist.name}" to your library`,
        });
        
        setOpen(false);
      } else {
        toast.info('No URL provided', {
          description: 'Please enter a Spotify or YouTube playlist URL.',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      let errorMessage = 'An unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error('Import Failed', {
        description: errorMessage,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[92vw] sm:max-w-[460px] p-4 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Import Playlist
          </DialogTitle>
          <DialogDescription>
            Import songs from Spotify or YouTube playlists
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => handleImport(e, false)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spotify-url" className="flex items-center gap-2 text-xs font-semibold">
              <Music4 className="w-4 h-4 text-emerald-500" />
              Spotify Playlist URL
            </Label>
            <Input
              id="spotify-url"
              placeholder="https://open.spotify.com/playlist/..."
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              autoComplete="off"
              className="text-xs sm:text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="flex items-center gap-2 text-xs font-semibold">
              <Youtube className="w-4 h-4 text-red-500" />
              YouTube Playlist URL
            </Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              autoComplete="off"
              className="text-xs sm:text-sm"
            />
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isImporting}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isImporting || (!spotifyUrl && !youtubeUrl)}
              variant="secondary"
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              {isImporting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </div>
              ) : (
                'Import to Queue'
              )}
            </Button>
            <Button 
              type="button"
              onClick={(e) => handleImport(e, true)}
              disabled={isImporting || (!spotifyUrl && !youtubeUrl)}
              className="w-full sm:w-auto text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isImporting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Playlist'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistImportDialog;