// src/components/EqualizerModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, Check, Volume2, Sparkles } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import toast from 'react-hot-toast';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EQ_PRESETS = [
  { id: 'flat', label: 'Flat (Default)', low: 0, mid: 0, high: 0 },
  { id: 'bass', label: 'Bass Boost 🔥', low: 8, mid: 1, high: -2 },
  { id: 'vocal', label: 'Vocal Boost 🎤', low: -2, mid: 6, high: 3 },
  { id: 'rock', label: 'Rock & Roll 🎸', low: 5, mid: 2, high: 5 },
  { id: 'pop', label: 'Pop ✨', low: 3, mid: 4, high: 2 },
  { id: 'jazz', label: 'Jazz 🎷', low: 4, mid: 2, high: 3 },
  { id: 'acoustic', label: 'Acoustic 🪕', low: 2, mid: 3, high: 4 },
];

const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const { audioProcessor } = useMusic();
  const [selectedPreset, setSelectedPreset] = useState('flat');
  const [bassGain, setBassGain] = useState(0);
  const [midGain, setMidGain] = useState(0);
  const [trebleGain, setTrebleGain] = useState(0);

  if (!isOpen) return null;

  const applyPreset = (presetId: string) => {
    const preset = EQ_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setBassGain(preset.low);
    setMidGain(preset.mid);
    setTrebleGain(preset.high);

    if (audioProcessor) {
      audioProcessor.updateEQ({ lowGain: preset.low, midGain: preset.mid, highGain: preset.high });
    }
    toast.success(`Equalizer preset set to ${preset.label}`);
  };

  const handleCustomChange = (type: 'bass' | 'mid' | 'treble', val: number) => {
    setSelectedPreset('custom');
    let b = bassGain, m = midGain, t = trebleGain;
    if (type === 'bass') { setBassGain(val); b = val; }
    if (type === 'mid') { setMidGain(val); m = val; }
    if (type === 'treble') { setTrebleGain(val); t = val; }

    if (audioProcessor) {
      audioProcessor.updateEQ({ lowGain: b, midGain: m, highGain: t });
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
          className="w-full max-w-md bg-card/95 border border-border rounded-2xl p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-500">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Sound Equalizer (EQ)</h3>
                <p className="text-xs text-muted-foreground">Web Audio Pro Equalizer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Presets Grid */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
              Audio Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EQ_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-red-500 text-white font-semibold shadow-md'
                        : 'bg-accent/60 hover:bg-accent text-foreground'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Sliders */}
          <div className="space-y-4 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Custom Band Adjustments
            </label>

            {/* Bass */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Bass (Low)</span>
                <span className="text-red-400 font-bold">{bassGain > 0 ? `+${bassGain}` : bassGain} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={bassGain}
                onChange={(e) => handleCustomChange('bass', parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            {/* Mid */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Mid (Vocals)</span>
                <span className="text-red-400 font-bold">{midGain > 0 ? `+${midGain}` : midGain} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={midGain}
                onChange={(e) => handleCustomChange('mid', parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            {/* Treble */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Treble (High)</span>
                <span className="text-red-400 font-bold">{trebleGain > 0 ? `+${trebleGain}` : trebleGain} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={trebleGain}
                onChange={(e) => handleCustomChange('treble', parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EqualizerModal;
