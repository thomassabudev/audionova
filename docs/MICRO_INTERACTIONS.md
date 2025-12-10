# Song Card Micro-Interactions

## Overview

Comprehensive micro-interaction system for all Home song cards providing smooth, performant animations that enhance user experience while respecting accessibility preferences.

## Features

### 1. Entrance Animation
- **Fade-in + Slide-up** when card mounts
- Duration: 450ms
- Easing: Custom cubic-bezier [0.2, 0.8, 0.2, 1]
- Staggered timing for multiple cards

### 2. Hover Lift
- Card lifts **5px** on hover
- Image zooms to **1.05x** scale
- Smooth transition: 200ms
- GPU-accelerated transforms

### 3. Tap Scale-Down
- Quick scale to **0.98** while pressing
- Spring animation for natural feel
- Immediate visual feedback

### 4. Click Handling
- **Debounced** to prevent double-triggers (350ms)
- Analytics tracking for all interactions
- Supports custom click handlers

## Feature Flag

Controlled by `home_card_micro_ux` flag:

```typescript
import { featureFlags } from '@/config/featureFlags';

// Check if enabled
if (featureFlags.isEnabled('home_card_micro_ux')) {
  // Micro-interactions active
}

// Toggle programmatically
featureFlags.setFlag('home_card_micro_ux', true);
```

**Default**: `true` (enabled for better UX)

## Accessibility

### Reduced Motion Support

Automatically respects `prefers-reduced-motion`:

```typescript
import useReducedMotion from '@/hooks/useReducedMotion';

const reducedMotion = useReducedMotion();

if (reducedMotion) {
  // No animations - instant states only
}
```

When reduced motion is enabled:
- ✅ No entrance animations
- ✅ No hover lift
- ✅ No image zoom
- ✅ No tap scale
- ✅ Instant state changes
- ✅ Analytics tracks as 'instant' method

### Keyboard Navigation

- Cards are focusable with `tabIndex={0}`
- Enter key triggers click handler
- Focus states visible
- ARIA labels for screen readers

## Performance

### Optimizations

1. **GPU Acceleration**
   - Uses `transform` properties only
   - `will-change: transform` hint
   - No layout thrashing

2. **Debouncing**
   - Prevents double-clicks (350ms window)
   - Reduces unnecessary re-renders
   - Improves perceived performance

3. **Efficient Re-renders**
   - Minimal state updates
   - Memoized callbacks
   - Optimized animation variants

### Performance Targets

- **Entrance**: 450ms
- **Hover**: 200ms
- **Tap**: Instant feedback
- **Frame Rate**: 60 fps
- **No jank**: Smooth on low-end devices

## Analytics

### Events Tracked

1. **Hover Interaction**
   ```typescript
   {
     songId: string,
     action: 'hover',
     method: 'animation' | 'instant'
   }
   ```

2. **Click Interaction**
   ```typescript
   {
     songId: string,
     action: 'click',
     method: 'animation' | 'instant'
   }
   ```

### Usage

```typescript
import { analytics } from '@/utils/analytics';

analytics.track('home_card_interaction', {
  songId: song.id,
  action: 'hover',
  method: reducedMotion ? 'instant' : 'animation',
});
```

## Implementation

### Hooks Used

1. **useReducedMotion**
   - Detects user's motion preference
   - Updates on preference change
   - Returns boolean

2. **useDebouncedAction**
   - Prevents rapid action triggers
   - Configurable delay (default 350ms)
   - Returns debounced function

### Animation Variants

```typescript
// Entrance
const entranceVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Hover lift
const hoverLiftVariants = reducedMotion ? {} : { y: -5 };

// Tap scale
const tapScaleVariants = reducedMotion ? {} : { scale: 0.98 };

// Image zoom
animate={{
  scale: isHovered && !reducedMotion ? 1.05 : 1,
}}
```

## Usage Examples

### Basic Usage

```tsx
import SongCard from '@/components/SongCard';

<SongCard
  song={song}
  playlist={playlist}
  index={index}
/>
```

### With Custom Click Handler

```tsx
<SongCard
  song={song}
  onCardClick={(song) => {
    console.log('Custom handler:', song);
    // Your custom logic
  }}
/>
```

### In a Grid

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
  {songs.map((song, idx) => (
    <SongCard
      key={song.id}
      song={song}
      playlist={songs}
      index={idx}
    />
  ))}
</div>
```

## Testing

### Unit Tests

Run tests:
```bash
npm test src/components/__tests__/SongCard.microux.test.tsx
```

### Test Coverage

- ✅ Entrance animation renders
- ✅ Hover tracking
- ✅ Click tracking
- ✅ Click debouncing
- ✅ Keyboard navigation
- ✅ Reduced motion respect
- ✅ Feature flag toggle
- ✅ Missing song ID handling

### Manual Testing

1. **Enable feature flag** (if not default)
2. **Hover over cards** → Observe lift + image zoom
3. **Click card** → Observe tap scale
4. **Rapid click** → Only one action fires
5. **Enable reduced motion** → No animations
6. **Check console** → Analytics events logged

## Browser Support

- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari (full support)
- ✅ Mobile browsers (full support)
- ✅ Legacy browsers (graceful degradation)

## Troubleshooting

### Animations Not Working

1. Check feature flag is enabled
2. Verify reduced motion is not enabled
3. Check browser console for errors
4. Ensure Framer Motion is installed

### Performance Issues

1. Check GPU acceleration is active
2. Verify `will-change` is applied
3. Test on lower-end devices
4. Reduce animation duration if needed

### Analytics Not Tracking

1. Verify analytics utility is configured
2. Check console for analytics calls
3. Ensure feature flag is enabled
4. Test in development mode

## Migration Guide

### From Old Animations

**Before:**
```tsx
<motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
  <div>Card content</div>
</motion.div>
```

**After:**
```tsx
<SongCard song={song} />
```

All animations are now built into the SongCard component.

### Adding to New Sections

Simply use the SongCard component:

```tsx
<div className="grid grid-cols-6 gap-4">
  {songs.map((song, idx) => (
    <SongCard
      key={song.id}
      song={song}
      playlist={songs}
      index={idx}
    />
  ))}
</div>
```

## Best Practices

### Do's ✅

- Use SongCard for all song displays
- Let the component handle animations
- Respect the feature flag
- Test with reduced motion enabled
- Monitor analytics for usage patterns

### Don'ts ❌

- Don't add extra animation wrappers
- Don't override built-in animations
- Don't ignore accessibility
- Don't skip debouncing
- Don't forget analytics tracking

## Future Enhancements

- [ ] Customizable animation durations
- [ ] Different animation styles per section
- [ ] Gesture-based interactions (swipe, long-press)
- [ ] 3D transforms for depth
- [ ] Particle effects on interaction
- [ ] Sound feedback (optional)

## Related Documentation

- [Shared Element Transitions](./SHARED_ELEMENT_TRANSITIONS.md)
- [Feature Flags](../src/config/featureFlags.ts)
- [Analytics](../src/utils/analytics.ts)

## Conclusion

The micro-interactions system provides a polished, performant, and accessible user experience for all song cards. It's fully tested, documented, and ready for production use.

**Status**: ✅ Production Ready
