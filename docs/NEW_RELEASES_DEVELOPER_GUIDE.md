# New Releases Feature - Developer Guide

## Quick Start

### Using the isNewSong Helper

```typescript
import { isNewSong } from '@/utils/isNewSong';

// Basic usage
if (isNewSong(song)) {
  // Song is new (2025 or last 14 days)
}

// Custom configuration
if (isNewSong(song, { targetYear: 2026, recentDays: 30 })) {
  // Song is from 2026 or last 30 days
}
```

### Adding NEW Badge to Components

```tsx
import { isNewSong } from '@/utils/isNewSong';

function YourComponent({ song }) {
  return (
    <div className="relative">
      <img src={song.image} alt={song.name} />
      
      {/* NEW Badge */}
      {isNewSong(song) && (
        <div className="absolute top-2 left-2 z-10">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white shadow-lg">
            NEW
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## API Reference

### `isNewSong(song, options?)`

Determines if a song is considered "new".

**Parameters:**
- `song` (SimpleSong | null | undefined): Song object with `releaseDate` and/or `year`
- `options` (IsNewSongOptions, optional):
  - `targetYear` (number): Year to consider as "new" (default: 2025)
  - `recentDays` (number): Number of days to consider as "recent" (default: 14)
  - `now` (number): Current timestamp for testing (default: Date.now())

**Returns:** `boolean`

**Examples:**
```typescript
// Song from 2025
isNewSong({ releaseDate: '2025-01-15', year: 2025 }) // true

// Song from 5 days ago
isNewSong({ releaseDate: '2025-01-10', year: 2024 }) // true

// Song from 30 days ago
isNewSong({ releaseDate: '2024-12-15', year: 2024 }) // false

// Custom target year
isNewSong({ year: 2024 }, { targetYear: 2024 }) // true

// Custom recent days
isNewSong({ releaseDate: '2025-01-01' }, { recentDays: 30 }) // true
```

---

## Backend API

### Fetch New Releases

**Endpoint:** `GET /api/new-releases`

**Query Parameters:**
- `limit` (number, optional): Maximum number of songs to return (default: 25, max: 25)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "external_id": "song_id",
      "title": "Song Name",
      "artists": "Artist Name",
      "album": "Album Name",
      "release_date": "2025-01-15T00:00:00.000Z",
      "featured": true,
      "language": "ml",
      "metadata": {
        "image": [...],
        "downloadUrl": [...]
      }
    }
  ],
  "count": 25
}
```

### Fetch New Releases by Language

**Endpoint:** `GET /api/new-releases/:lang`

**Path Parameters:**
- `lang` (string): Language code (`ml`, `ta`, `hi`, `en`)

**Query Parameters:**
- Same as above

---

## Frontend Services

### JioSaavn API Service

```typescript
import { jiosaavnApi } from '@/services/jiosaavnApi';

// Get Malayalam trending songs
const malayalamSongs = await jiosaavnApi.getTrendingSongs();

// Get Tamil trending songs
const tamilSongs = await jiosaavnApi.getTamilTrendingSongs();

// Get Hindi trending songs
const hindiSongs = await jiosaavnApi.getHindiTrendingSongs();

// Get English new releases
const englishSongs = await jiosaavnApi.getEnglishNewReleases();
```

### Music Service

```typescript
import { musicService } from '@/services/musicService';

// Get new releases (all languages)
const newReleases = await musicService.getNewReleases(50);

// Force refresh (bypass cache)
const freshReleases = await musicService.getNewReleases(50, true);
```

---

## Configuration

### Change Target Year

To change the target year from 2025 to another year:

1. Update `src/utils/isNewSong.ts`:
```typescript
const targetYear = options?.targetYear ?? 2026; // Change 2025 to 2026
```

2. Update `backend/routes/new-releases.js`:
```javascript
const targetYear = 2026; // Change 2025 to 2026
```

### Change Recent Days Threshold

To change from 14 days to another value:

1. Update `src/utils/isNewSong.ts`:
```typescript
const recentDays = options?.recentDays ?? 30; // Change 14 to 30
```

2. Update `backend/routes/new-releases.js`:
```javascript
const recentDays = 30; // Change 14 to 30
```

---

## Testing

### Run Unit Tests

```bash
npm test src/utils/isNewSong.test.ts
```

### Manual Testing

1. Open the app in development mode:
```bash
npm run dev
```

2. Navigate to the home page
3. Check the "New Releases" section
4. Verify:
   - Only 2025 songs appear
   - NEW badge is visible on all songs
   - English songs are included
   - No old songs (2024, 2023, etc.)
   - No duplicates

### Debug Mode

Add console logs to see filtering in action:

```typescript
const filtered = unique.filter(song => {
  const isNew = isNewSong(song);
  console.log(`Song: ${song.name}, Year: ${song.year}, IsNew: ${isNew}`);
  return isNew;
});
```

---

## Troubleshooting

### Issue: No songs appear in New Releases

**Solution:**
1. Check if API is returning data:
```typescript
console.log('API response:', await jiosaavnApi.getTrendingSongs());
```

2. Check if filtering is too strict:
```typescript
// Temporarily disable filtering
const filtered = unique; // Instead of: unique.filter(song => isNewSong(song))
```

3. Check target year and recent days settings

### Issue: OLD songs still appear

**Solution:**
1. Verify `isNewSong()` logic is correct
2. Check if songs have valid `releaseDate` or `year` fields
3. Add logging to see which songs pass the filter:
```typescript
console.log('Filtered songs:', filtered.map(s => ({ 
  name: s.name, 
  year: s.year, 
  releaseDate: s.releaseDate 
})));
```

### Issue: NEW badge not showing

**Solution:**
1. Verify `isNewSong` is imported:
```typescript
import { isNewSong } from '@/utils/isNewSong';
```

2. Check if badge JSX is correct:
```tsx
{isNewSong(song) && (
  <div className="absolute top-2 left-2 z-10">
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white shadow-lg">
      NEW
    </span>
  </div>
)}
```

3. Verify song object has required fields

### Issue: English songs not appearing

**Solution:**
1. Check if `getEnglishNewReleases()` is being called:
```typescript
const englishSongs = await jiosaavnApi.getEnglishNewReleases();
console.log('English songs:', englishSongs.length);
```

2. Verify backend is fetching English songs:
```javascript
// In backend/routes/new-releases.js
console.log('English songs:', englishSongs.length);
```

---

## Performance Optimization

### Caching

The backend implements caching to reduce API calls:

```javascript
// Cache duration: 1 minute
const CACHE_DURATION = 60000;
```

To adjust cache duration, modify `CACHE_DURATION` in `backend/routes/new-releases.js`.

### Pagination

Limit the number of songs fetched:

```typescript
// Fetch only 25 songs
const newReleases = await musicService.getNewReleases(25);
```

### Lazy Loading

Consider implementing lazy loading for large lists:

```tsx
import { useState, useEffect } from 'react';

function NewReleases() {
  const [page, setPage] = useState(0);
  const [songs, setSongs] = useState([]);
  
  useEffect(() => {
    const fetchMore = async () => {
      const newSongs = await musicService.getNewReleases(25, page * 25);
      setSongs(prev => [...prev, ...newSongs]);
    };
    fetchMore();
  }, [page]);
  
  return (
    <div>
      {songs.map(song => <SongCard key={song.id} song={song} />)}
      <button onClick={() => setPage(p => p + 1)}>Load More</button>
    </div>
  );
}
```

---

## Best Practices

1. **Always use `isNewSong()` helper** - Don't duplicate the logic
2. **Handle null/undefined gracefully** - The helper already does this
3. **Use consistent badge styling** - Follow the design system
4. **Test with different dates** - Use the `now` parameter for testing
5. **Log filtering results** - During development, log what's being filtered
6. **Cache API responses** - Reduce unnecessary API calls
7. **Remove duplicates** - Always dedupe by song ID
8. **Sort by date** - Show newest songs first

---

## Related Files

- `src/utils/isNewSong.ts` - Helper utility
- `src/utils/isNewSong.test.ts` - Unit tests
- `src/utils/isNewSong.examples.ts` - Usage examples
- `backend/routes/new-releases.js` - Backend API
- `src/services/jiosaavnApi.ts` - JioSaavn API service
- `src/services/musicService.ts` - Music service
- `src/views/HomeView.tsx` - Home view component
- `src/components/SongCard.tsx` - Song card component

---

## Support

For questions or issues, please refer to:
- `NEW_RELEASES_FIX_SUMMARY.md` - Complete implementation summary
- `src/utils/isNewSong.examples.ts` - Code examples
- Unit tests for expected behavior

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
