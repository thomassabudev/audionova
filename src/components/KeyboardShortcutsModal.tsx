// src/components/KeyboardShortcutsModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause music' },
  { key: '→', desc: 'Seek forward 5 seconds' },
  { key: '←', desc: 'Seek backward 5 seconds' },
  { key: '↑', desc: 'Increase Volume (+5%)' },
  { key: '↓', desc: 'Decrease Volume (-5%)' },
  { key: 'M', desc: 'Toggle Mute / Unmute' },
  { key: 'L', desc: 'Open / Close Lyrics view' },
  { key: 'Shift + ?', desc: 'Show this Shortcuts Help' },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-card/95 border border-border rounded-2xl p-6 shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-500">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Keyboard Shortcuts</h3>
                <p className="text-xs text-muted-foreground">Control AudioNova with your keyboard</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto">
            {SHORTCUTS.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-accent/40 border border-border/50">
                <span className="text-xs font-medium text-foreground">{item.desc}</span>
                <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-muted text-red-400 border border-border rounded-md shadow-xs">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default KeyboardShortcutsModal;
