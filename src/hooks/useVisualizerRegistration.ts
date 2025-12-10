// src/hooks/useVisualizerRegistration.ts
import { useEffect, useRef } from 'react';
import { visualizerManager } from '../lib/visualizer';

export function useRegisterVisualizer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isActive: boolean,
  audioRef: React.RefObject<HTMLAudioElement>
) {
  const idRef = useRef<number | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    if (isActive && canvasRef.current && audioRef.current) {
      (async () => {
        try {
          await visualizerManager.ensureAnalyser(audioRef.current!);
          if (!mounted) return;
          if (canvasRef.current) {
            idRef.current = visualizerManager.registerCanvas(canvasRef.current);
          }
        } catch (e) {
          console.warn('[Visualizer] Failed to initialize, using fallback:', e);
          // Fallback: still register canvas for animation
          if (!mounted) return;
          if (canvasRef.current) {
            idRef.current = visualizerManager.registerCanvas(canvasRef.current);
          }
        }
      })();
    }
    
    return () => {
      mounted = false;
      if (idRef.current) {
        visualizerManager.unregister(idRef.current);
        idRef.current = null;
      }
    };
  }, [isActive, canvasRef, audioRef]);
}