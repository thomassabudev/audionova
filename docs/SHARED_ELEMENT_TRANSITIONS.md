# Shared Element Transitions

## Overview

This feature provides smooth, animated transitions when clicking song cards on the Home view. The cover image animates from its position in the grid to the destination view, creating a fluid, native-app-like experience.

## How It Works

### Framer Motion (Preferred)

When both source and destination elements are mounted with the same `layoutId`, Framer Motion automatically handles the smooth transition:

```tsx
// Source (Home card)
<motion.img layoutId={`cover-${song.id}`} src={song.cover} />

// Destination (Detail view)
<motion.img layoutId={`cover-${song.id}`} src={song.cover} />
```

### FLIP Fallback

For virtualized lists or when Framer Motion can't be used, we implement FLIP (First-Last-Invert-Play):

1. **First**: Snapshot the source element's position
2. **Last**: Calculate the destination position
3. **Invert**: Apply inverse transform to make it appear at the start
4. **Play**: Animate to the final position

## Feature Flag

The feature is controlled by the `home_shared_element_transition` flag:

```typescript
import { featureFlags } from '@/config/featureFlags';

// Check if enabled
if (featureFlags.isEnabled('home_shared_element_transition')) {
  // Perform transition
}

// Enable/disable programmatically
featureFlags.setFlag('home_shared_element_transition', true);
```

**Default**: `false` (disabled for safety)

## Usage

### Adding layoutId to New Cards

When creating new song card components, add a deterministic `layoutId`:

```tsx
<motion.img
  layoutId={`cover-${song.id || `${song.name}-${song.artist}`}`}
  src={song.cover}
  style={{ objectFit: 'cover' }}
/>
```

### Pattern for layoutId

Use this pattern for consistency:
- `cover-${song.id}` - if stable ID exists
- `cover-${song.type}-${song.id}` - for different card types
- `cover-${hash(song.title + song.artist)}` - fallback for no ID

### Handling Click Events

```tsx
import { animateSharedElement, prefersReducedMotion } from '@/animations/sharedElement';
import { analytics } from '@/utils/analytics';
import { featureFlags } from '@/config/featureFlags';

const handleClick = async (e: React.MouseEvent) => {
  // Check feature flag
  if (!featureFlags.isEnabled('home_shared_element_transition')) {
    navigateToDetail(song);
    return;
  }

  // Check reduced motion
  if (prefersReducedMotion()) {
    analytics.track('home_card_transition_start', { songId: song.id, method: 'instant' });
    navigateToDetail(song);
    analytics.track('home_card_transition_end', { songId: song.id, method: 'instant', success: true });
    return;
  }

  // Perform transition
  const imgElement = imgRef.current;
  try {
    const method = await animateSharedElement({
      sourceEl: imgElement,
      imgSrc: song.cover,
      songId: song.id,
      onComplete: () => navigateToDetail(song),
    });
    analytics.track('home_card_transition_end', { songId: song.id, method, success: true });
  } catch (err) {
    // Fallback
    navigateToDetail(song);
    analytics.track('home_card_transition_end', { songId: song.id, method: 'instant', success: false });
  }
};
```

## Accessibility

### Reduced Motion

The feature automatically respects the user's `prefers-reduced-motion` setting:

```typescript
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Use instant navigation
}
```

### Keyboard Navigation

All interactive elements maintain proper keyboard support:
- Cards are focusable with `tabIndex={0}`
- Enter key triggers navigation
- Focus states are visible

## Performance

### Optimizations

1. **GPU Acceleration**: Uses `transform` and `will-change` for smooth animations
2. **RequestAnimationFrame**: Ensures animations sync with browser paint cycles
3. **Debouncing**: Prevents double-triggers during transitions
4. **Cleanup**: Automatically cancels on visibility/orientation changes

### Duration

- Default: 350ms
- Range: 300-450ms
- Bounded to prevent sluggish feel

### Frame Rate Target

- Minimum: 50 fps
- Target: 60 fps

## Analytics

### Events Tracked

1. **home_card_transition_start**
   ```typescript
   {
     songId: string,
     method: 'shared' | 'flip' | 'instant'
   }
   ```

2. **home_card_transition_end**
   ```typescript
   {
     songId: string,
     method: 'shared' | 'flip' | 'instant',
     success: boolean,
     fallbackReason?: string
   }
   ```

## Rollout Plan

1. **Phase 1**: Merge behind feature flag (disabled)
2. **Phase 2**: Enable for 5% of users for 48 hours
3. **Phase 3**: Monitor metrics:
   - Transition completion rate
   - Error rate
   - User engagement
4. **Phase 4**: Gradual rollout to 100% if metrics are positive

### Rollback

If issues are detected:
1. Disable feature flag immediately
2. Monitor for 24 hours
3. Investigate and fix issues
4. Re-enable with caution

## Troubleshooting

### Transition Not Working

1. Check feature flag is enabled
2. Verify `layoutId` is present on both source and destination
3. Check browser console for errors
4. Ensure image is loaded before transition

### Visual Glitches

1. Verify `object-fit: cover` is set on images
2. Check for conflicting CSS transforms
3. Ensure proper z-index layering
4. Test on different screen sizes

### Performance Issues

1. Check frame rate in DevTools Performance tab
2. Reduce animation duration if needed
3. Verify GPU acceleration is active
4. Test on lower-end devices

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Future Enhancements

- [ ] Support for different aspect ratios
- [ ] Staggered animations for multiple cards
- [ ] Custom easing curves per card type
- [ ] Gesture-driven transitions (swipe to navigate)
- [ ] 3D transforms for depth effect

## References

- [Framer Motion Shared Layout](https://www.framer.com/motion/layout-animations/)
- [FLIP Technique](https://aerotwist.com/blog/flip-your-animations/)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
