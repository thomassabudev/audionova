# Testing Checklist - Recently Played Image Quality Fix

## Pre-Testing Setup

- [ ] Backup current localStorage (optional): `localStorage.getItem('recentlyPlayed')`
- [ ] Note current Recently Played songs count
- [ ] Open browser DevTools Console to monitor logs

## Unit Tests

### Run Image Utils Tests
```bash
npm test imageUtils
```

Expected:
- [ ] All tests pass
- [ ] No console errors
- [ ] Coverage > 90%

### Run Migration Tests
```bash
npm test recentlyPlayed.migration
```

Expected:
- [ ] All tests pass
- [ ] Migration scenarios covered
- [ ] Edge cases handled

## Manual Testing - New Songs

### Test 1: Play Song from Search
1. [ ] Go to Search view
2. [ ] Search for any song (e.g., "trending songs 2025")
3. [ ] Play a song from search results
4. [ ] Navigate to Home view
5. [ ] Check Recently Played section
6. [ ] **Verify**: Song shows high-quality image (not blurry/pixelated)
7. [ ] **Verify**: Image is sharp and clear

### Test 2: Play Song from New Releases
1. [ ] Go to Home view
2. [ ] Play a song from New Releases section
3. [ ] Check Recently Played section
4. [ ] **Verify**: Song shows high-quality image
5. [ ] **Verify**: Image quality matches New Releases display

### Test 3: Play Song from Trending
1. [ ] Go to Home view
2. [ ] Play a song from Trending section
3. [ ] Check Recently Played section
4. [ ] **Verify**: Song shows high-quality image
5. [ ] **Verify**: Image quality matches Trending display

### Test 4: Play Multiple Songs from Different Sources
1. [ ] Play 3 songs from Search
2. [ ] Play 3 songs from New Releases
3. [ ] Play 3 songs from Trending
4. [ ] Check Recently Played section
5. [ ] **Verify**: All songs show consistent high-quality images
6. [ ] **Verify**: No visual quality differences between sources

## Manual Testing - Migration

### Test 5: Migration of Existing Data
1. [ ] Clear browser cache and localStorage
2. [ ] Manually add old-format data to localStorage:
```javascript
localStorage.setItem('recentlyPlayed', JSON.stringify([
  {
    id: 'test-1',
    name: 'Test Song',
    primaryArtists: 'Test Artist',
    image: [
      { quality: '150x150', link: 'https://example.com/thumb.jpg' },
      { quality: '1000x1000', link: 'https://example.com/large.jpg' }
    ],
    duration: 180,
    url: 'https://example.com/audio.mp3'
  }
]));
```
3. [ ] Reload the page
4. [ ] Check browser console for migration log
5. [ ] **Verify**: Console shows: `[RecentlyPlayed] Migrated X songs to high-quality images`
6. [ ] Check localStorage:
```javascript
JSON.parse(localStorage.getItem('recentlyPlayed'))
```
7. [ ] **Verify**: Image is now a string (not array)
8. [ ] **Verify**: Image URL is the highest quality one

### Test 6: No Re-Migration
1. [ ] After Test 5, reload page again
2. [ ] Check browser console
3. [ ] **Verify**: No migration log appears (already migrated)
4. [ ] **Verify**: localStorage unchanged

### Test 7: Corrupted Data Handling
1. [ ] Manually corrupt localStorage:
```javascript
localStorage.setItem('recentlyPlayed', 'invalid json{{{');
```
2. [ ] Reload the page
3. [ ] **Verify**: No errors in console (or graceful error handling)
4. [ ] **Verify**: Recently Played shows suggestions or empty state
5. [ ] **Verify**: Corrupted data was cleared

## Edge Cases

### Test 8: Song with No Image
1. [ ] Play a song that has no image data
2. [ ] Check Recently Played
3. [ ] **Verify**: Placeholder image is shown
4. [ ] **Verify**: No console errors

### Test 9: Song with Single Image URL
1. [ ] Play a song with single string image
2. [ ] Check Recently Played
3. [ ] **Verify**: Image displays correctly
4. [ ] **Verify**: No normalization errors

### Test 10: Very Large Recently Played List
1. [ ] Play 15+ songs
2. [ ] Check Recently Played
3. [ ] **Verify**: Only 10 most recent songs shown
4. [ ] **Verify**: All show high-quality images
5. [ ] **Verify**: No performance issues

## Performance Testing

### Test 11: No Extra Network Calls
1. [ ] Open Network tab in DevTools
2. [ ] Play a song
3. [ ] Check Recently Played
4. [ ] **Verify**: No extra image requests made
5. [ ] **Verify**: Only uses URLs already provided by API

### Test 12: localStorage Size
1. [ ] Check localStorage size before:
```javascript
JSON.stringify(localStorage.getItem('recentlyPlayed')).length
```
2. [ ] Play several songs
3. [ ] Check localStorage size after
4. [ ] **Verify**: Size is reasonable (normalized strings are smaller than arrays)

### Test 13: Render Performance
1. [ ] Open Performance tab in DevTools
2. [ ] Record while navigating to Recently Played
3. [ ] **Verify**: No significant performance degradation
4. [ ] **Verify**: Images render quickly

## UI/UX Testing

### Test 14: Visual Consistency
1. [ ] Compare image quality across sections:
   - New Releases
   - Trending
   - Recently Played
   - Search Results
2. [ ] **Verify**: All sections show similar quality images
3. [ ] **Verify**: No blurry or pixelated images in Recently Played

### Test 15: Responsive Design
1. [ ] Test on mobile viewport (375px)
2. [ ] Test on tablet viewport (768px)
3. [ ] Test on desktop viewport (1920px)
4. [ ] **Verify**: Images scale properly at all sizes
5. [ ] **Verify**: Quality remains high at all sizes

### Test 16: Dark/Light Mode
1. [ ] Switch between dark and light themes
2. [ ] Check Recently Played in both modes
3. [ ] **Verify**: Images display correctly in both themes
4. [ ] **Verify**: Placeholder images are visible in both themes

## Browser Compatibility

### Test 17: Cross-Browser Testing
Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

For each browser:
- [ ] Play songs from different sources
- [ ] Check Recently Played image quality
- [ ] Verify migration works
- [ ] Check console for errors

## Regression Testing

### Test 18: Other Features Still Work
1. [ ] **Verify**: Playing songs works normally
2. [ ] **Verify**: Queue management works
3. [ ] **Verify**: Liked songs work
4. [ ] **Verify**: Playlists work
5. [ ] **Verify**: Search works
6. [ ] **Verify**: No new console errors

### Test 19: Existing Functionality
1. [ ] **Verify**: Clear Recently Played button works
2. [ ] **Verify**: Playing from Recently Played works
3. [ ] **Verify**: Song details display correctly
4. [ ] **Verify**: Hover effects work
5. [ ] **Verify**: Like/Unlike from Recently Played works

## Final Verification

### Test 20: End-to-End User Flow
1. [ ] Fresh browser session (clear cache)
2. [ ] Search for a song
3. [ ] Play it
4. [ ] Go to Home
5. [ ] Check Recently Played
6. [ ] **Verify**: High-quality image
7. [ ] Play from Recently Played
8. [ ] **Verify**: Song plays correctly
9. [ ] Reload page
10. [ ] **Verify**: Recently Played persists with high-quality images

## Console Checks

Throughout all tests, monitor console for:
- [ ] No unexpected errors
- [ ] Migration logs appear when expected
- [ ] No warnings about image loading
- [ ] No localStorage quota errors

## Success Criteria

All tests must pass with:
- ✅ High-quality images in Recently Played from all sources
- ✅ Automatic migration of existing data
- ✅ No console errors
- ✅ No performance degradation
- ✅ No extra network calls
- ✅ Consistent visual quality across all sections
- ✅ All edge cases handled gracefully

## Rollback Criteria

If any of these occur, consider rollback:
- ❌ Images fail to load
- ❌ Console errors on every page load
- ❌ localStorage quota exceeded
- ❌ Significant performance degradation
- ❌ Existing features broken

## Post-Testing

- [ ] Document any issues found
- [ ] Verify all issues resolved
- [ ] Update documentation if needed
- [ ] Mark feature as ready for production
