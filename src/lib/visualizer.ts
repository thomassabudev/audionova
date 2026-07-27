import { getOrCreateSharedAudioSource } from '../utils/audioContextManager';

type Registration = { 
  id: number, 
  canvas: HTMLCanvasElement, 
  drawFn: (data: Uint8Array<ArrayBuffer>) => void 
};

export class VisualizerManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Uint8Array<ArrayBuffer> | null = null;
  private registrations: Map<number, Registration> = new Map();
  private rafId = 0;
  private nextId = 1;
  private isRunning = false;
  private audioElement: HTMLAudioElement | null = null;

  async ensureAnalyser(audioEl: HTMLAudioElement | null) {
    if (!audioEl) return;
    if (this.analyser && this.audioElement === audioEl) return;
    
    try {
      const shared = getOrCreateSharedAudioSource(audioEl);
      if (!shared) return;
      
      this.audioCtx = shared.context;
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      shared.source.connect(analyser);
      this.analyser = analyser;
      this.buffer = new Uint8Array(analyser.frequencyBinCount);
      this.audioElement = audioEl;
    } catch {
      // Silent fallback
    }
  }

  registerCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) return -1;
    
    const id = this.nextId++;
    
    const drawFn = (data: Uint8Array<ArrayBuffer>) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Get accent color from CSS variable
      const accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent') || '#ff5b5b';
      
      // Set drawing style
      ctx.fillStyle = accentColor;
      
      // Draw 5 bars with heights from analyser data
      const barCount = 5;
      const barWidth = Math.floor(canvas.width / barCount);
      const barSpacing = 2;
      
      for (let i = 0; i < barCount; i++) {
        // Map data bins to bars
        const dataIndex = Math.floor((data.length / barCount) * i);
        const value = data[dataIndex] || 0;
        
        // Normalize value to 0-1 range and scale to canvas height
        const normalized = value / 255;
        const barHeight = Math.max(2, normalized * canvas.height);
        
        // Draw bar
        const x = i * (barWidth + barSpacing);
        const y = canvas.height - barHeight;
        
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };
    
    this.registrations.set(id, { id, canvas, drawFn });
    
    if (!this.isRunning) {
      this.start();
    }
    
    return id;
  }

  unregister(id: number) {
    this.registrations.delete(id);
    
    if (this.registrations.size === 0) {
      this.stop();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.isRunning = false;
  }

  private loop = () => {
    if (!this.isRunning) return;
    
    if (!this.analyser || !this.buffer) {
      // Fallback: draw animated bars using Math.sin
      const time = Date.now() / 1000;
      for (const reg of this.registrations.values()) {
        const ctx = reg.canvas.getContext('2d');
        if (!ctx) continue;
        
        // Clear canvas
        ctx.clearRect(0, 0, reg.canvas.width, reg.canvas.height);
        
        // Get accent color from CSS variable
        const accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--accent') || '#ff5b5b';
        
        ctx.fillStyle = accentColor;
        
        // Draw animated bars
        const barCount = 5;
        const barWidth = Math.floor(reg.canvas.width / barCount);
        const barSpacing = 2;
        
        for (let i = 0; i < barCount; i++) {
          const amplitude = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5;
          const barHeight = 2 + amplitude * (reg.canvas.height - 2);
          const x = i * (barWidth + barSpacing);
          const y = reg.canvas.height - barHeight;
          
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    } else {
      // Get audio data
      try {
        this.analyser.getByteFrequencyData(this.buffer);
        
        // Draw each registered canvas
        for (const reg of this.registrations.values()) {
          reg.drawFn(this.buffer);
        }
      } catch (e) {
        console.warn('Error getting audio data:', e);
      }
    }
    
    this.rafId = requestAnimationFrame(this.loop);
  };

  // Clean up resources
  destroy() {
    this.stop();
    this.audioCtx = null;
    this.analyser = null;
    this.buffer = null;
    this.audioElement = null;
    this.registrations.clear();
  }
}

// Export singleton instance
export const visualizerManager = new VisualizerManager();