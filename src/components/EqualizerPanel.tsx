import React, { useState } from 'react';
import { Power, Check, Sliders, Sparkles } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import toast from 'react-hot-toast';

interface EQBand {
  key: 'lowGain' | 'midGain' | 'highGain';
  label: string;
  freq: string;
}

const BANDS: EQBand[] = [
  { key: 'lowGain',  label: 'Bass',   freq: '200 Hz' },
  { key: 'midGain',  label: 'Mid',    freq: '2 kHz'  },
  { key: 'highGain', label: 'Treble', freq: '8 kHz'  },
];

const PRESETS = [
  { id: 'flat', label: 'Flat (Default)', lowGain: 0, midGain: 0, highGain: 0 },
  { id: 'bass', label: 'Bass Boost 🔥', lowGain: 8, midGain: 1, highGain: -2 },
  { id: 'vocal', label: 'Vocal Boost 🎤', lowGain: -2, midGain: 6, highGain: 3 },
  { id: 'rock', label: 'Rock & Roll 🎸', lowGain: 5, midGain: 2, highGain: 5 },
  { id: 'pop', label: 'Pop ✨', lowGain: 3, midGain: 4, highGain: 2 },
  { id: 'jazz', label: 'Jazz 🎷', lowGain: 4, midGain: 2, highGain: 3 },
  { id: 'acoustic', label: 'Acoustic 🪕', lowGain: 2, midGain: 3, highGain: 4 },
];

const LS_KEY = 'audionovaEQ';

const EqualizerPanel: React.FC = () => {
  const { audioProcessor, audioProcessingEnabled, setAudioProcessingEnabled } = useMusic();

  // Read saved EQ from localStorage — same key used by EqualizerModal on desktop
  // This ensures the sidebar EQ and the desktop EQ modal always start from the same values
  const savedEQ = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  })();

  const [selectedPreset, setSelectedPreset] = useState(savedEQ?.preset || 'flat');
  const [gains, setGains] = useState({
    lowGain:  savedEQ?.bass   ?? 0,   // default flat
    midGain:  savedEQ?.mid    ?? 0,   // default flat (was wrongly 1 before)
    highGain: savedEQ?.treble ?? 0,   // default flat (was wrongly 0.5 before)
  });
  const [bypass, setBypass] = useState(false);

  const saveToStorage = (preset: string, bass: number, mid: number, treble: number) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ preset, bass, mid, treble })); } catch { /* ignore */ }
  };

  const handleGainChange = (key: EQBand['key'], value: number) => {
    setSelectedPreset('custom');
    const next = { ...gains, [key]: value };
    setGains(next);
    audioProcessor?.updateEQ(next);
    saveToStorage('custom', next.lowGain, next.midGain, next.highGain);
  };

  const handleBypass = (val: boolean) => {
    setBypass(val);
    if (audioProcessor) {
      if (val) {
        audioProcessor.updateEQ({ lowGain: 0, midGain: 0, highGain: 0 });
      } else {
        audioProcessor.updateEQ(gains);
      }
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSelectedPreset(preset.id);
    const next = { lowGain: preset.lowGain, midGain: preset.midGain, highGain: preset.highGain };
    setGains(next);
    audioProcessor?.updateEQ(next);
    saveToStorage(preset.id, next.lowGain, next.midGain, next.highGain);
    if (bypass) setBypass(false);
    toast.success(`Equalizer set to ${preset.label}`);
  };

  const isActive = audioProcessingEnabled && audioProcessor?.getStatus().isInitialized;

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-5 overflow-y-auto">
      {/* Power + Bypass row */}
      <div className="flex items-center justify-between bg-accent/40 border border-border p-3 rounded-xl">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAudioProcessingEnabled(!audioProcessingEnabled)}
            className={`p-2 rounded-xl transition-all shadow-md ${
              audioProcessingEnabled
                ? 'bg-red-500 text-white shadow-red-500/20'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>
          <div>
            <span className="text-sm font-bold block leading-tight">
              {audioProcessingEnabled ? 'Equalizer Enabled' : 'Equalizer Disabled'}
            </span>
            <span className="text-[10px] text-muted-foreground">Web Audio Processing</span>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs font-medium text-muted-foreground">Bypass</span>
          <button
            role="switch"
            aria-checked={bypass}
            onClick={() => handleBypass(!bypass)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              bypass ? 'bg-red-500' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                bypass ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* EQ sliders */}
      <div className={`flex justify-around gap-2 bg-card border border-border p-4 rounded-2xl shadow-sm transition-opacity ${!isActive || bypass ? 'opacity-40 pointer-events-none' : ''}`}>
        {BANDS.map(band => (
          <div key={band.key} className="flex flex-col items-center gap-2 flex-1">
            <span className="text-xs font-mono font-bold text-red-400 w-8 text-center">
              {gains[band.key] > 0 ? '+' : ''}{gains[band.key].toFixed(0)} dB
            </span>

            <div className="relative flex items-center justify-center py-2" style={{ height: 120 }}>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={gains[band.key]}
                onChange={e => handleGainChange(band.key, parseFloat(e.target.value))}
                className="appearance-none bg-transparent cursor-pointer"
                style={{
                  writingMode: 'vertical-lr' as any,
                  direction: 'rtl',
                  width: 28,
                  height: 110,
                  accentColor: '#ef4444',
                }}
                aria-label={`${band.label} EQ`}
              />
            </div>

            <span className="text-xs font-bold text-foreground">{band.label}</span>
            <span className="text-[10px] text-muted-foreground">{band.freq}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground -mt-3">
        Center = 0 dB
      </p>

      {/* Presets */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Presets
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={!isActive}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-red-500 text-white font-bold border-red-500 shadow-md'
                    : 'border-border bg-accent/30 hover:bg-accent text-foreground'
                } disabled:opacity-40 disabled:pointer-events-none`}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {!isActive && (
        <p className="text-xs text-center text-muted-foreground mt-auto">
          {audioProcessingEnabled
            ? 'Play a song to activate the equalizer'
            : 'Enable audio processing to use the equalizer'}
        </p>
      )}
    </div>
  );
};

export default EqualizerPanel;
