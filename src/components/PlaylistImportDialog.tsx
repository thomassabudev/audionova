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
import { Download, Music, Youtube, Music4, AlertCircle, Loader2, Save } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { toast } from 'sonner';

interface PlaylistImportDialogProps {
  children: React.ReactNode;
}

const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('https://open.spotify.com/playlist/46KGKo4zFNS613c2Vy9RSX?si=EoGf6m_pQ8yTqRmvzG_Ing');
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
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/playlist\?list=|youtu\.be\/playlist\?list=)([a-zA-Z0-9_-]+)/;
    return youtubeRegex.test(url);
  };

  const extractSpotifyId = (url: string) => {
    const match = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const extractYoutubeId = (url: string) => {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
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
        const response = await fetch(`http://localhost:5008/api/import/spotify/${playlistId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
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
        
        // Save playlist if requested
        if (saveAfterImport) {
          const playlistToSave = {
            id: data.playlist.id,
            name: data.playlist.name,
            description: data.playlist.description,
            tracks: data.playlist.tracks,
            image: data.playlist.image,
            createdAt: new Date(),
            version: 1, // Add the required version property
          };
          
          savePlaylist(playlistToSave);
          
          toast.success('Playlist Saved!', {
            description: `Added ${data.playlist.tracks.length} songs to your queue and saved "${data.playlist.name}" to your library`,
          });
        } else {
          toast.success('Playlist Imported Successfully!', {
            description: `Added ${data.playlist.tracks.length} songs to your queue from "${data.playlist.name}"`,
          });
        }
        
        setOpen(false);
      } else if (youtubeUrl) {
        const playlistId = extractYoutubeId(youtubeUrl);
        if (!playlistId) {
          throw new Error('Invalid YouTube playlist URL');
        }
        
        // Call backend API to import YouTube playlist
        const response = await fetch(`http://localhost:5008/api/import/youtube/${playlistId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to import playlist');
        }
        
        toast.success('YouTube Playlist Import Started', {
          description: 'YouTube playlist import functionality would be implemented here.',
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import Playlist
          </DialogTitle>
          <DialogDescription>
            Import up to 400 songs from Spotify or YouTube playlists
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => handleImport(e, false)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spotify-url" className="flex items-center gap-2">
              <Music4 className="w-4 h-4" />
              Spotify Playlist URL
            </Label>
            <Input
              id="spotify-url"
              placeholder="https://open.spotify.com/playlist/..."
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTube Playlist URL
            </Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj
            </p>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-500">Backend Required</p>
                <p className="text-xs text-blue-500/80">
                  This feature requires a backend service running on port 5008 to handle API requests.
                  Now imports up to 400 songs from Spotify playlists.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isImporting || (!spotifyUrl && !youtubeUrl)}
              variant="secondary"
            >
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </div>
              ) : (
                'Import to Queue'
              )}
            </Button>
            <Button 
              type="button"
              onClick={(e) => handleImport(e, true)}
              disabled={isImporting || (!spotifyUrl && !youtubeUrl)}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
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