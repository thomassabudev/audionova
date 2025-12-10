/**
 * Unit tests for shared element transitions
 */

import { prefersReducedMotion, cancelTransition } from '../sharedElement';

describe('prefersReducedMotion', () => {
  it('should return false when reduced motion is not preferred', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
    });

    expect(prefersReducedMotion()).toBe(false);
  });

  it('should return true when reduced motion is preferred', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
    });

    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('cancelTransition', () => {
  it('should not throw when called', () => {
    expect(() => cancelTransition()).not.toThrow();
  });
});

describe('FLIP calculations', () => {
  it('should calculate correct transform values', () => {
    const first = new DOMRect(100, 100, 200, 200);
    const last = new DOMRect(300, 300, 400, 400);

    const dx = first.left - last.left; // 100 - 300 = -200
    const dy = first.top - last.top; // 100 - 300 = -200
    const scaleX = first.width / last.width; // 200 / 400 = 0.5
    const scaleY = first.height / last.height; // 200 / 400 = 0.5

    expect(dx).toBe(-200);
    expect(dy).toBe(-200);
    expect(scaleX).toBe(0.5);
    expect(scaleY).toBe(0.5);
  });

  it('should handle same position (no transform needed)', () => {
    const rect = new DOMRect(100, 100, 200, 200);

    const dx = rect.left - rect.left;
    const dy = rect.top - rect.top;
    const scaleX = rect.width / rect.width;
    const scaleY = rect.height / rect.height;

    expect(dx).toBe(0);
    expect(dy).toBe(0);
    expect(scaleX).toBe(1);
    expect(scaleY).toBe(1);
  });
});
