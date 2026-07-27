// src/components/ShareSongModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, X, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { selectHighestQualityImage } from '../utils/imageQualitySelector';

interface ShareSongModalProps {
  song: any;
  isOpen: boolean;
  onClose: () => void;
}

const ShareSongModal: React.FC<ShareSongModalProps> = ({ song, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !song) return null;

  const shareUrl = `${window.location.origin}/?song=${encodeURIComponent(song.id || '')}`;
  const coverUrl = selectHighestQualityImage(song.image);
  const canShareNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Song link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (canShareNative) {
      try {
        await navigator.share({
          title: song.name || 'Song',
          text: `Listen to ${song.name || 'this song'} by ${song.primaryArtists || 'Artist'} on AudioNova!`,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm bg-card/95 border border-border rounded-2xl p-5 shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Share Song</h3>
                <p className="text-xs text-muted-foreground">Spread the music</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Song Card Snippet */}
          <div className="flex items-center gap-3 p-3 bg-accent/40 rounded-xl border border-border/50">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={coverUrl}
                alt={song.name || 'Cover'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ef4444" width="100" height="100"/%3E%3Ctext fill="%23ffffff" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🎵%3C/text%3E%3C/svg%3E`;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{song.name || 'Untitled Song'}</h4>
              <p className="text-xs text-muted-foreground truncate">{song.primaryArtists || 'Unknown Artist'}</p>
            </div>
          </div>

          {/* Copy Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Share Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none text-muted-foreground font-mono truncate"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Native Mobile Share Button */}
          {canShareNative && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-blue-400" />
              <span>Share via Apps...</span>
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareSongModal;
