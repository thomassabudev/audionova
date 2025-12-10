/**
 * Hook for debouncing actions to prevent double-triggers
 */

import { useRef, useCallback } from 'react';

export default function useDebouncedAction(delay: number = 350) {
  const lastCall = useRef<number>(0);

  return useCallback(
    (fn: () => void) => {
      const now = Date.now();
      if (now - lastCall.current < delay) return;
      lastCall.current = now;
      fn();
    },
    [delay]
  );
}
