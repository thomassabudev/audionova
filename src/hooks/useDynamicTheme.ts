import { useState, useEffect, useCallback } from 'react';
import { 
  extractColorsWithCache, 
  generateColorPalette, 
  createAnimatedGradient,
  type ColorPalette,
  type ExtractedColors 
} from '../utils/colorExtractor';

interface DynamicThemeState {
  palette: ColorPalette | null;
  extractedColors: ExtractedColors | null;
  animatedGradients: string[];
  isLoading: boolean;
  error: string | null;
}

interface UseDynamicThemeReturn extends DynamicThemeState {
  updateThemeFromImage: (imageUrl: string) => Promise<void>;
  resetTheme: () => void;
}

/**
 * Custom hook for managing dynamic color themes based on album artwork
 */
export const useDynamicTheme = (): UseDynamicThemeReturn => {
  const [state, setState] = useState<DynamicThemeState>({
    palette: null,
    extractedColors: null,
    animatedGradients: [],
    isLoading: false,
    error: null,
  });

  /**
   * Update theme colors based on an image URL
   */
  const updateThemeFromImage = useCallback(async (imageUrl: string) => {
    if (!imageUrl || imageUrl.includes('data:image/svg+xml')) {
      resetTheme();
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const extractedColors = await extractColorsWithCache(imageUrl);
      const palette = generateColorPalette(extractedColors);
      const animatedGradients = createAnimatedGradient(palette);

      setState({
        palette,
        extractedColors,
        animatedGradients,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[DynamicTheme] Error extracting colors:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to extract colors from image',
      }));
    }
  }, []);

  /**
   * Reset theme to default colors
   */
  const resetTheme = useCallback(() => {
    setState({
      palette: null,
      extractedColors: null,
      animatedGradients: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    updateThemeFromImage,
    resetTheme,
  };
};

/**
 * Hook for getting CSS custom properties from the current theme
 */
export const useThemeCSS = (palette: ColorPalette | null) => {
  return {
    '--theme-primary': palette?.primary || '#ef4444',
    '--theme-secondary': palette?.secondary || '#f97316',
    '--theme-accent': palette?.accent || '#dc2626',
    '--theme-background': palette?.background || '#475569',
    '--theme-vibrant': palette?.vibrant || '#f97316',
    '--theme-muted': palette?.muted || '#64748b',
  } as React.CSSProperties;
};

/**
 * Hook for creating dynamic gradient animations
 */
export const useAnimatedGradient = (
  animatedGradients: string[],
  isPlaying: boolean,
  duration: number = 8
) => {
  const [currentGradient, setCurrentGradient] = useState(0);

  useEffect(() => {
    if (!isPlaying || animatedGradients.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentGradient(prev => (prev + 1) % animatedGradients.length);
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [animatedGradients, isPlaying, duration]);

  return animatedGradients[currentGradient] || animatedGradients[0];
};