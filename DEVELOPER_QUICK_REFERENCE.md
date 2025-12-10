# Developer Quick Reference - Image & Section Fix

## 🔍 What Changed?

### Core Functions Modified

#### `src/utils/song.ts`

```typescript
// BEFORE: Only handled simple cases
export const getBestImage = (img) => {
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return img[0]; // ❌ Always picked first (often lowest quality)
  return null;
}

// AFTER: Handles all JioSaavn formats
export const getBestImage = (img) => {
  // ✅ Detects array of objects with quality/link
  // ✅ Sorts by quality (500x500 > 150x150 > 50x50)
  // ✅ Returns highest quality image
  if (Array.isArray(img) && img[0]?.link) {
    const sorted = img.sort((a, b) => 
      getQualityValue(b.quality) - getQualityValue(a.quality)
    );
    return sorted[0].link;
  }
  // ... handles other formats
}
```

#### `src/views/HomeView.tsx`

```typescript
// NEW: Malayalam Hits fetch function
const fetchMalayalamSongsData = useCallback(async () => {
  const [trending, romance] = await Promise.all([
    jiosaavnApi.getTrendingSongs(),
    jiosaavnApi.getMalayalamRomanceSongs(),
  ]);
  const combined = dedupeById([...trending, ...romance]);
  const normalized = combined.map(s => ({
    ...s,
    image: normalizeSongImageUtil(s) // ✅ Normalize images
  }));
  const malayalamOnly = normalized.filter(s => 
    getLangCode(s.language) === 'ML'
  );
  setMalayalamSongs(shuffleArray(malayalamOnly).slice(0, 50));
}, []);

// NEW: Tamil Hits fetch function (similar structure)
const fetchTamilSongsData = useCallback(async () => {
  // ... same pattern as Malayalam
}, []);
```

---

## 🎯 Key Concepts

### Image Normalization Priority

The system checks image fields in this order:

1. `song.image` (primary)
2. `song.images` (alternative)
3. `song.more_info?.image` (nested)
4. `song.more_info?.thumbnail` (nested fallback)
5. `song.more_info?.imageUrl` (nested alternative)
6. `song.thumbnail` (direct fallback)
7. `song.album?.image` (album level)
8. `song.album?.thumbnail` (album fallback)
9. `song.albumArt` (legacy)

### Quality Sorting Logic

```typescript
// Quality string: "500x500" → 500 * 500 = 250,000
// Quality string: "150x150" → 150 * 150 = 22,500
// Quality string: "50x50" → 50 * 50 = 2,500

// Result: 500x500 wins (highest value)
```

---

## 🔧 How to Use

### Normalize a Single Song Image

```typescript
import { normalizeSongImage } from '@/utils/song';

const song = {
  id: '123',
  name: 'Song Name',
  image: [
    { quality: '50x50', link: 'https://example.com/50.jpg' },
    { quality: '500x500', link: 'https://example.com/500.jpg' }
  ]
};

const normalized = normalizeSongImage(song);
// Result: { ...song, image: 'https://example.com/500.jpg' }
```

### Normalize Multiple Songs

```typescript
import { normalizeSongImage } from '@/utils/song';

const songs = await fetchSongsFromAPI();
const normalized = songs.map(song => ({
  ...song,
  image: normalizeSongImage(song)
}));
```

### Add a New Language Section

```typescript
// 1. Add state
const [newLanguageSongs, setNewLanguageSongs] = useState<Song[]>([]);

// 2. Create fetch function
const fetchNewLanguageSongsData = useCallback(async () => {
  setIsNewLanguageLoading(true);
  try {
    const songs = await jiosaavnApi.getNewLanguageSongs();
    const normalized = songs.map(s => ({
      ...s,
      image: normalizeSongImageUtil(s) // ✅ Always normalize
    }));
    setNewLanguageSongs(normalized);
  } catch (err) {
    console.error('Failed to fetch:', err);
  } finally {
    setIsNewLanguageLoading(false);
  }
}, []);

// 3. Add to initial fetch
useEffect(() => {
  Promise.all([
    // ... other fetches
    fetchNewLanguageSongsData(), // ✅ Add here
  ]);
}, [fetchNewLanguageSongsData]);
```

---

## 🧪 Testing

### Test Image Normalization

```typescript
import { getBestImage, normalizeSongImage } from '@/utils/song';

// Test 1: Array of objects (JioSaavn format)
const result1 = getBestImage([
  { quality: '50x50', link: 'low.jpg' },
  { quality: '500x500', link: 'high.jpg' }
]);
console.assert(result1 === 'high.jpg', 'Should pick highest quality');

// Test 2: String URL
const result2 = getBestImage('https://example.com/image.jpg');
console.assert(result2 === 'https://example.com/image.jpg', 'Should return string as-is');

// Test 3: Null/undefined
const result3 = getBestImage(null);
console.assert(result3 === null, 'Should return null for empty input');
```

### Test Fetch Functions

```typescript
// Check if Malayalam songs load
const malayalamSongs = await fetchMalayalamSongsData();
console.assert(malayalamSongs.length > 0, 'Should have songs');
console.assert(
  malayalamSongs.every(s => typeof s.image === 'string'),
  'All images should be normalized to strings'
);
```

---

## 🐛 Common Issues & Solutions

### Issue: Images still showing as purple boxes

**Cause**: Image normalization not applied in fetch pipeline

**Solution**:
```typescript
// ❌ WRONG: Not normalizing
const songs = await fetchSongs();
setSongs(songs);

// ✅ CORRECT: Normalize before setting state
const songs = await fetchSongs();
const normalized = songs.map(s => ({
  ...s,
  image: normalizeSongImageUtil(s)
}));
setSongs(normalized);
```

### Issue: Section is empty

**Cause**: Fetch function not called or not added to initial fetch

**Solution**:
```typescript
// ✅ Make sure fetch is in useEffect
useEffect(() => {
  Promise.all([
    fetchNewReleasesData(),
    fetchTrendingSongsData(),
    fetchYourNewSectionData(), // ✅ Add here
  ]);
}, [fetchYourNewSectionData]); // ✅ Add to dependencies
```

### Issue: Images are low quality

**Cause**: Not using `getBestImage()` or quality sorting broken

**Solution**:
```typescript
// ✅ Always use normalizeSongImage
import { normalizeSongImage } from '@/utils/song';

const song = { /* ... */ };
const normalized = normalizeSongImage(song);
// This automatically picks highest quality
```

---

## 📊 Performance Tips

### 1. Batch Image Normalization

```typescript
// ✅ GOOD: Normalize in one pass
const normalized = songs.map(s => normalizeSongImage(s));

// ❌ BAD: Normalize individually in render
songs.map(s => <Card image={normalizeSongImage(s)} />)
```

### 2. Memoize Fetch Functions

```typescript
// ✅ GOOD: Use useCallback
const fetchData = useCallback(async () => {
  // ... fetch logic
}, []); // Empty deps if no external dependencies

// ❌ BAD: Create new function on every render
const fetchData = async () => {
  // ... fetch logic
};
```

### 3. Deduplicate Before Normalizing

```typescript
// ✅ GOOD: Dedupe first, then normalize
const unique = dedupeById(songs);
const normalized = unique.map(s => normalizeSongImage(s));

// ❌ BAD: Normalize first, then dedupe (wasted work)
const normalized = songs.map(s => normalizeSongImage(s));
const unique = dedupeById(normalized);
```

---

## 🔍 Debugging

### Enable Detailed Logging

```typescript
// Add to fetch function
const fetchData = async () => {
  console.log('[Fetch] Starting...');
  const songs = await api.getSongs();
  console.log('[Fetch] Received', songs.length, 'songs');
  
  const normalized = songs.map(s => {
    const before = s.image;
    const after = normalizeSongImage(s);
    if (before !== after) {
      console.log('[Normalize]', s.name, 'image changed:', before, '→', after);
    }
    return { ...s, image: after };
  });
  
  console.log('[Fetch] Normalized', normalized.length, 'songs');
  return normalized;
};
```

### Check Image URLs in Console

```typescript
// In browser console
const songs = document.querySelectorAll('img');
songs.forEach(img => {
  console.log(img.src, img.naturalWidth, 'x', img.naturalHeight);
});
// Should show 500x500 or higher for most images
```

---

## 📚 Related Files

- `src/utils/song.ts` - Core normalization logic
- `src/utils/imageUtils.ts` - Alternative image utilities
- `src/views/HomeView.tsx` - Main implementation
- `src/services/jiosaavnApi.ts` - API client
- `src/utils/song.normalization.test.ts` - Test suite

---

## ✅ Checklist for New Features

When adding a new section or modifying image handling:

- [ ] Import `normalizeSongImage` from `@/utils/song`
- [ ] Apply normalization in fetch pipeline before `setState`
- [ ] Add loading state (`isLoading`)
- [ ] Add error handling (try/catch)
- [ ] Add refresh handler
- [ ] Add to initial fetch in `useEffect`
- [ ] Add loading spinner in UI
- [ ] Add empty state with retry button
- [ ] Test with real API data
- [ ] Verify images are high quality (500x500+)

---

**Last Updated**: 2025-11-19  
**Version**: 1.0  
**Status**: Production Ready
