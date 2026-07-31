/**
 * 🎛️ PROFESSIONAL AUDIO PROCESSING CHAIN
 *
 * Legitimate audio enhancement using Web Audio API
 * - NO fake upscaling or artificial enhancement
 * - Gentle EQ and dynamics processing only
 * - Transparent to user, improves perceived quality
 */

import { getOrCreateSharedAudioSource } from './audioContextManager';

export interface AudioProcessingConfig {
  enableEQ: boolean;
  enableLimiter: boolean;
  enableNormalization: boolean;
  eqSettings: {
    lowGain: number;    // Bass adjustment (-12 to +12 dB)
    midGain: number;    // Mid adjustment (-12 to +12 dB)  
    highGain: number;   // Treble adjustment (-12 to +12 dB)
  };
  limiterSettings: {
    threshold: number;  // Limiter threshold (-6 to 0 dB)
    ratio: number;      // Compression ratio (1 to 10)
    attack: number;     // Attack time (0.001 to 0.1 seconds)
    release: number;    // Release time (0.01 to 1 seconds)
  };
  normalizationTarget: number; // Target RMS level (-23 to -16 LUFS)
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private eqNodes: {
    lowShelf: BiquadFilterNode | null;
    midPeaking: BiquadFilterNode | null;
    highShelf: BiquadFilterNode | null;
  } = { lowShelf: null, midPeaking: null, highShelf: null };
  private limiterNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  private config: AudioProcessingConfig;

  constructor(config: Partial<AudioProcessingConfig> = {}) {
    this.config = {
      enableEQ: true,
      enableLimiter: true,
      enableNormalization: false, // Disabled by default - can cause issues
      eqSettings: {
        lowGain: 0,    // Neutral by default
        midGain: 0,    // Neutral by default (removed +1dB coloration)
        highGain: 0    // Neutral by default (removed +0.5dB coloration)
      },
      limiterSettings: {
        threshold: -0.1, // Safety threshold just below 0dBFS
        ratio: 20,       // Brick-wall ratio
        attack: 0.003,   // Fast attack to catch peaks
        release: 0.1     // Medium release
      },
      normalizationTarget: -20, // Conservative target
      ...config
    };
  }

  /**
   * Initialize Web Audio API processing chain
   */
  async initializeProcessing(audioElement: HTMLAudioElement): Promise<boolean> {
    try {
      const shared = getOrCreateSharedAudioSource(audioElement);
      if (!shared) {
        console.warn('[AudioProcessor] Could not acquire audio source');
        return false;
      }

      this.sourceNode = shared.source;
      this.audioContext = shared.context;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      try { this.sourceNode.disconnect(); } catch { /* ignore */ }

      // Create processing nodes
      this.gainNode     = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();

      if (this.config.enableEQ) {
        this.eqNodes.lowShelf  = this.audioContext.createBiquadFilter();
        this.eqNodes.midPeaking = this.audioContext.createBiquadFilter();
        this.eqNodes.highShelf = this.audioContext.createBiquadFilter();
        this.setupEqualizer();
      }

      if (this.config.enableLimiter) {
        this.limiterNode = this.audioContext.createDynamicsCompressor();
        this.setupDynamicsProcessing();
      }

      this.connectProcessingChain();
      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('[AudioProcessor] Failed to initialize:', error);
      this.dispose();
      return false;
    }
  }

  /**
   * Configure 3-band equalizer with professional settings
   */
  private setupEqualizer(): void {
    if (!this.eqNodes.lowShelf || !this.eqNodes.midPeaking || !this.eqNodes.highShelf) return;

    // Low shelf filter (bass)
    this.eqNodes.lowShelf.type = 'lowshelf';
    this.eqNodes.lowShelf.frequency.value = 200; // 200Hz crossover
    this.eqNodes.lowShelf.gain.value = this.config.eqSettings.lowGain;

    // Mid peaking filter (presence/clarity)
    this.eqNodes.midPeaking.type = 'peaking';
    this.eqNodes.midPeaking.frequency.value = 2000; // 2kHz for vocal clarity
    this.eqNodes.midPeaking.Q.value = 1.4; // Moderate Q
    this.eqNodes.midPeaking.gain.value = this.config.eqSettings.midGain;

    // High shelf filter (treble/air)
    this.eqNodes.highShelf.type = 'highshelf';
    this.eqNodes.highShelf.frequency.value = 8000; // 8kHz crossover
    this.eqNodes.highShelf.gain.value = this.config.eqSettings.highGain;
  }

  /**
   * Configure dynamics processing (compression + limiting)
   */
  private setupDynamicsProcessing(): void {
    if (!this.limiterNode) return;

    // Brick-wall limiter for peak protection ONLY (engages only if EQ is boosted > 0dB)
    this.limiterNode.threshold.value = this.config.limiterSettings.threshold;
    this.limiterNode.knee.value = 0;           // Hard knee for limiting
    this.limiterNode.ratio.value = this.config.limiterSettings.ratio; // Use config ratio (20)
    this.limiterNode.attack.value = this.config.limiterSettings.attack;
    this.limiterNode.release.value = this.config.limiterSettings.release;
  }

  /**
   * Connect all processing nodes in the correct order
   */
  private connectProcessingChain(): void {
    if (!this.sourceNode || !this.audioContext) return;

    let currentNode: AudioNode = this.sourceNode;

    // Connect EQ chain
    if (this.config.enableEQ && this.eqNodes.lowShelf && this.eqNodes.midPeaking && this.eqNodes.highShelf) {
      currentNode.connect(this.eqNodes.lowShelf);
      this.eqNodes.lowShelf.connect(this.eqNodes.midPeaking);
      this.eqNodes.midPeaking.connect(this.eqNodes.highShelf);
      currentNode = this.eqNodes.highShelf;
    }

    // Connect dynamics processing (limiter only)
    if (this.config.enableLimiter && this.limiterNode) {
      currentNode.connect(this.limiterNode);
      currentNode = this.limiterNode;
    }

    // Connect gain and analyser
    if (this.gainNode) {
      currentNode.connect(this.gainNode);
      currentNode = this.gainNode;
    }

    if (this.analyserNode) {
      currentNode.connect(this.analyserNode);
    }

    // Connect to destination (speakers)
    currentNode.connect(this.audioContext.destination);
  }

  /**
   * Update EQ settings in real-time
   */
  updateEQ(settings: Partial<AudioProcessingConfig['eqSettings']>): void {
    if (!this.isInitialized) return;

    if (settings.lowGain !== undefined && this.eqNodes.lowShelf) {
      this.eqNodes.lowShelf.gain.value = settings.lowGain;
      this.config.eqSettings.lowGain = settings.lowGain;
    }

    if (settings.midGain !== undefined && this.eqNodes.midPeaking) {
      this.eqNodes.midPeaking.gain.value = settings.midGain;
      this.config.eqSettings.midGain = settings.midGain;
    }

    if (settings.highGain !== undefined && this.eqNodes.highShelf) {
      this.eqNodes.highShelf.gain.value = settings.highGain;
      this.config.eqSettings.highGain = settings.highGain;
    }
  }

  /**
   * Get real-time audio analysis data
   */
  getAudioAnalysis(): {
    rms: number;
    peak: number;
    frequencyData: Uint8Array;
  } | null {
    if (!this.analyserNode) return null;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    // Calculate RMS and peak levels
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255;
      sum += value * value;
      peak = Math.max(peak, value);
    }
    
    const rms = Math.sqrt(sum / bufferLength);

    return {
      rms,
      peak,
      frequencyData: dataArray
    };
  }

  /**
   * Set master gain (volume)
   */
  setGain(gain: number): void {
    if (this.gainNode) {
      // Apply smooth gain changes to prevent clicks
      const now = this.audioContext?.currentTime || 0;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setTargetAtTime(gain, now, 0.01);
    }
  }

  /**
   * Enable/disable processing bypass
   */
  setBypass(bypass: boolean): void {
    if (!this.sourceNode || !this.audioContext) return;

    if (bypass) {
      // Direct connection (bypass processing)
      this.sourceNode.disconnect();
      this.sourceNode.connect(this.audioContext.destination);
    } else {
      // Reconnect processing chain
      this.sourceNode.disconnect();
      this.connectProcessingChain();
    }
  }

  /**
   * Clean up resources.
   * The source node is kept alive via the module-level WeakMap so that
   * re-initialization never needs to call createMediaElementSource() again.
   */
  dispose(): void {
    // Disconnect processing/utility nodes only (NOT the source node)
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch { /* ignore */ }
      this.gainNode = null;
    }
    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch { /* ignore */ }
      this.analyserNode = null;
    }
    Object.keys(this.eqNodes).forEach(key => {
      const node = this.eqNodes[key as keyof typeof this.eqNodes];
      if (node) {
        try { node.disconnect(); } catch { /* ignore */ }
      }
    });
    this.eqNodes = { lowShelf: null, midPeaking: null, highShelf: null };
    if (this.limiterNode) {
      try { this.limiterNode.disconnect(); } catch { /* ignore */ }
      this.limiterNode = null;
    }

    // Null out references — the WeakMap keeps the real nodes alive
    this.sourceNode   = null;
    this.audioContext = null;
    this.isInitialized = false;
  }

  /**
   * Get current processing status
   */
  getStatus(): {
    isInitialized: boolean;
    isProcessing: boolean;
    contextState: string;
    sampleRate?: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isProcessing: this.isInitialized && this.audioContext?.state === 'running',
      contextState: this.audioContext?.state || 'closed',
      sampleRate: this.audioContext?.sampleRate
    };
  }
}