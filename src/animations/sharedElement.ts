/**
 * Shared Element Transition
 * Implements FLIP animation fallback for smooth transitions
 */

import { analytics, logger } from '@/utils/analytics';

export type TransitionMethod = 'shared' | 'flip' | 'instant';

interface AnimateSharedElementOptions {
  sourceEl: HTMLElement;
  destElOrRect?: HTMLElement | DOMRect;
  imgSrc: string;
  songId: string;
  duration?: number;
  onComplete?: () => void;
}

interface FLIPState {
  first: DOMRect;
  last: DOMRect;
  invert: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  };
}

let isTransitioning = false;
let currentOverlay: HTMLElement | null = null;

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Debounce helper to prevent double-triggers
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Calculate FLIP transformation
 */
function calculateFLIP(first: DOMRect, last: DOMRect): FLIPState['invert'] {
  return {
    x: first.left - last.left,
    y: first.top - last.top,
    scaleX: first.width / last.width,
    scaleY: first.height / last.height,
  };
}

/**
 * Create overlay element for FLIP animation
 */
function createOverlay(sourceEl: HTMLElement, imgSrc: string): HTMLElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;

  const img = document.createElement('img');
  img.src = imgSrc;
  img.style.cssText = `
    position: absolute;
    object-fit: cover;
    border-radius: inherit;
    will-change: transform;
  `;

  // Copy computed styles
  const computed = window.getComputedStyle(sourceEl);
  img.style.borderRadius = computed.borderRadius;

  overlay.appendChild(img);
  return overlay;
}

/**
 * Perform FLIP animation
 */
async function performFLIPAnimation(
  sourceEl: HTMLElement,
  destRect: DOMRect,
  imgSrc: string,
  duration: number = 350
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // FIRST: Get initial position
      const firstRect = sourceEl.getBoundingClientRect();

      // Create overlay
      const overlay = createOverlay(sourceEl, imgSrc);
      const img = overlay.querySelector('img') as HTMLImageElement;

      // Set initial position
      img.style.left = `${firstRect.left}px`;
      img.style.top = `${firstRect.top}px`;
      img.style.width = `${firstRect.width}px`;
      img.style.height = `${firstRect.height}px`;

      document.body.appendChild(overlay);
      currentOverlay = overlay;

      // LAST: Calculate final position (destRect)
      const invert = calculateFLIP(firstRect, destRect);

      // INVERT: Apply inverted transform
      img.style.transform = `translate(${invert.x}px, ${invert.y}px) scale(${invert.scaleX}, ${invert.scaleY})`;

      // Force reflow
      img.offsetHeight;

      // PLAY: Animate to final position
      img.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
      img.style.transform = 'translate(0, 0) scale(1, 1)';

      // Update position to destination
      requestAnimationFrame(() => {
        img.style.left = `${destRect.left}px`;
        img.style.top = `${destRect.top}px`;
        img.style.width = `${destRect.width}px`;
        img.style.height = `${destRect.height}px`;
      });

      // Cleanup after animation
      const cleanup = () => {
        if (currentOverlay === overlay) {
          overlay.remove();
          currentOverlay = null;
        }
        isTransitioning = false;
        resolve();
      };

      img.addEventListener('transitionend', cleanup, { once: true });

      // Fallback cleanup
      setTimeout(cleanup, duration + 100);
    } catch (err) {
      isTransitioning = false;
      reject(err);
    }
  });
}

/**
 * Check if image is loaded
 */
function waitForImageLoad(imgSrc: string, timeout: number = 200): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };

    img.src = imgSrc;
  });
}

/**
 * Main shared element animation function
 */
export async function animateSharedElement(
  options: AnimateSharedElementOptions
): Promise<TransitionMethod> {
  const { sourceEl, destElOrRect, imgSrc, songId, duration = 350, onComplete } = options;

  // Prevent double-trigger
  if (isTransitioning) {
    logger.warn('Transition already in progress', { songId });
    return 'instant';
  }

  isTransitioning = true;

  try {
    // Check if image is loaded
    const imageLoaded = await waitForImageLoad(imgSrc);
    if (!imageLoaded) {
      logger.warn('Image not loaded, using instant transition', { songId, imgSrc });
      isTransitioning = false;
      return 'instant';
    }

    // Determine destination rect
    let destRect: DOMRect;
    if (destElOrRect instanceof HTMLElement) {
      destRect = destElOrRect.getBoundingClientRect();
    } else if (destElOrRect) {
      destRect = destElOrRect;
    } else {
      // Default to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
      destRect = new DOMRect(centerX - size / 2, centerY - size / 2, size, size);
    }

    // Perform FLIP animation
    await performFLIPAnimation(sourceEl, destRect, imgSrc, duration);

    onComplete?.();
    return 'flip';
  } catch (err) {
    logger.error('shared_element_transition_error', { err, songId });
    isTransitioning = false;
    if (currentOverlay) {
      currentOverlay.remove();
      currentOverlay = null;
    }
    return 'instant';
  }
}

/**
 * Cancel ongoing transition
 */
export function cancelTransition(): void {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  isTransitioning = false;
}

/**
 * Handle visibility change and orientation change
 */
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelTransition();
    }
  });

  window.addEventListener('resize', () => {
    cancelTransition();
  });

  window.addEventListener('orientationchange', () => {
    cancelTransition();
  });
}
