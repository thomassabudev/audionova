# Cover Art Verification System

Production-grade canonical cover art verification system for music streaming applications using unofficial JioSaavn API with fallback to iTunes, MusicBrainz, and Spotify.

## Overview

This system ensures each song card displays the correct album/cover image by:
1. Fetching canonical song details (not just search results)
2. Verifying metadata matches (title, artist, language) with configurable thresholds
3. Validating image URLs before acceptance
4. Falling back to authoritative sources (iTunes, MusicBrainz, Spotify)
5. Caching verified mappings with admin override support

## Architecture

```
┌─────────────────┐
│  Frontend UI    │
│  (Song Cards)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Cover Verification API                 │
│  /api/cover-verification/*              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Cover Verification Service             │
│  - Search → Detail → Verify             │
│  - Metadata matching (similarity)       │
│  - Image validation (HEAD/GET)          │
│  - Fallback sequence                    │
└────────┬────────────────────────────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    JioSaavn    iTunes    MusicBrainz  Spotify
    (Primary)  (Fallback)  (Fallback) (Optional)
         │          │          │          │
         └──────────┴──────────┴──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  PostgreSQL Database │
         │  - song_cover_map    │
         │  - verification_logs │
         │  - wrong_cover_reports│
         └──────────────────────┘
```

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

No additional packages needed - all dependencies already in `package.json`.

### 2. Database Setup

Run the migration script:

```bash
psql -U your_user -d vibemusic -f db/migrations/001_create_song_cover_map.sql
```

Or use the init script:

```bash
node scripts/init-cover-verification-db.js
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://localhost:5432/vibemusic

# JioSaavn API (unofficial)
JIOSAAVN_API_BASE=https://jiosaavn-api-privatecvc2.vercel.app

# Admin authentication
ADMIN_TOKEN=your-secure-admin-token-here

# Optional: Spotify API (if using Spotify fallback)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Worker configuration
VERIFICATION_CONCURRENCY=3
```

### 4. Register Routes

In your `server.js`:

```javascript
const coverVerificationRoutes = require('./routes/cover-verification');
app.use('/api/cover-verification', coverVerificationRoutes);
```

## Usage

### Basic Verification

```bash
curl -X POST http://localhost:3000/api/cover-verification/verify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Peelings",
    "artist": "Navod",
    "language": "Malayalam",
    "song_id": "saavn_12345"
  }'
```

Response:
```json
{
  "success": true,
  "cached": false,
  "data": {
    "song_id": "saavn_12345",
    "cover_url": "https://images.saavncdn.com/song/500x500.jpg",
    "source": "saavn",
    "verified": true,
    "metadata": {
      "title": "Peelings",
      "artist": "Navod",
      "language": "Malayalam"
    },
    "similarity_scores": {
      "title": 1.0,
      "artist": 1.0
    },
    "verification_time_ms": 1234
  }
}
```

### Batch Verification

```bash
curl -X POST http://localhost:3000/api/cover-verification/batch \
  -H "Content-Type: application/json" \
  -d '{
    "songs": [
      { "title": "Peelings", "artist": "Navod", "language": "Malayalam" },
      { "title": "Illuminati", "artist": "Sushin Shyam", "language": "Malayalam" },
      { "title": "Naatu Naatu", "artist": "Rahul Sipligunj", "language": "Telugu" }
    ]
  }'
```

### Get Cover Mapping

```bash
curl http://localhost:3000/api/cover-verification/saavn_12345
```

### Admin Override

Set a manual cover URL:

```bash
curl -X POST http://localhost:3000/api/cover-verification/admin/override \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-secure-admin-token-here" \
  -d '{
    "song_id": "saavn_12345",
    "cover_url": "https://example.com/correct-cover.jpg",
    "reason": "User reported wrong cover, manually verified correct one",
    "title": "Peelings",
    "artist": "Navod",
    "language": "Malayalam"
  }'
```

Remove manual override:

```bash
curl -X DELETE http://localhost:3000/api/cover-verification/admin/override/saavn_12345 \
  -H "X-Admin-Token: your-secure-admin-token-here"
```

### Report Wrong Cover

Users can report incorrect covers:

```bash
curl -X POST http://localhost:3000/api/cover-verification/report \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "saavn_12345",
    "displayed_cover_url": "https://example.com/wrong-cover.jpg",
    "correct_hint": "Should show Aavesham movie poster",
    "user_id": "user_789"
  }'
```

### View Statistics

```bash
curl http://localhost:3000/api/cover-verification/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "by_source": [
      {
        "source": "saavn",
        "total_verifications": 1250,
        "auto_verified": 1200,
        "manual_overrides": 50,
        "avg_title_similarity": 0.95,
        "avg_artist_similarity": 0.92
      },
      {
        "source": "itunes",
        "total_verifications": 150,
        "auto_verified": 150,
        "manual_overrides": 0
      }
    ],
    "total_songs": 1400,
    "last_24h": {
      "total_attempts": 500,
      "successful": 475,
      "avg_time_ms": 1850
    }
  }
}
```

## Running Tests

### Unit Tests

```bash
npm test -- stringUtils.test.js
npm test -- imageValidator.test.js
```

### Integration Tests

```bash
npm test -- coverVerification.integration.test.js
```

### All Tests

```bash
npm test
```

## Worker Queue (Async Verification)

For background processing without blocking user requests:

### Start Worker

```bash
node scripts/start-cover-verification-worker.js
```

Or add to your process manager (PM2):

```bash
pm2 start scripts/start-cover-verification-worker.js --name cover-worker
```

### Queue Jobs

```javascript
const { queueVerification } = require('./worker/coverVerificationWorker');

// Queue single song
await queueVerification({
  song_id: 'saavn_12345',
  title: 'Peelings',
  artist: 'Navod',
  language: 'Malayalam',
});

// Queue batch
const { queueBatch } = require('./worker/coverVerificationWorker');
await queueBatch([
  { song_id: 'saavn_1', title: 'Song 1', artist: 'Artist 1' },
  { song_id: 'saavn_2', title: 'Song 2', artist: 'Artist 2' },
]);
```

## Configuration

### Similarity Thresholds

Adjust in `utils/stringUtils.js` or pass as parameters:

```javascript
const matchResult = isMatch(detail, query, {
  titleThreshold: 0.72,   // Default: 0.72
  artistThreshold: 0.65,  // Default: 0.65
  albumThreshold: 0.6,    // Default: 0.6
});
```

### Rate Limits

Adjust in `services/coverVerificationService.js`:

```javascript
const rateLimits = {
  jiosaavn: { delay: 100, lastCall: 0 },    // 100ms between calls
  itunes: { delay: 200, lastCall: 0 },      // 200ms between calls
  musicbrainz: { delay: 1000, lastCall: 0 }, // 1s between calls (required)
};
```

### Cache TTL

Adjust in migration or queries:

```sql
-- Default: 30 days
verified_at > NOW() - INTERVAL '30 days'
```

## Frontend Integration

### Display Cover from Database

```typescript
// Fetch verified cover
async function getVerifiedCover(songId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/cover-verification/${songId}`);
    const data = await response.json();
    
    if (data.success && data.data.cover_url) {
      return data.data.cover_url;
    }
  } catch (error) {
    console.error('Failed to fetch verified cover:', error);
  }
  
  return null; // Use placeholder
}

// In your SongCard component
const [coverUrl, setCoverUrl] = useState<string | null>(null);

useEffect(() => {
  getVerifiedCover(song.id).then(url => {
    setCoverUrl(url || PLACEHOLDER_IMAGE);
  });
}, [song.id]);
```

### Report Wrong Cover Button

```typescript
async function reportWrongCover(songId: string, displayedUrl: string) {
  await fetch('/api/cover-verification/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      song_id: songId,
      displayed_cover_url: displayedUrl,
      correct_hint: '', // Optional user input
      user_id: currentUser.id,
    }),
  });
  
  toast.success('Report submitted. Thank you!');
}
```

## Test Fixtures

### Known Bad Cases

Test with these problematic songs:

```javascript
const badCases = [
  {
    // Case 1: Generic "Various Artists" cover
    song_id: 'test_various_1',
    title: 'Peelings',
    artist: 'Navod',
    language: 'Malayalam',
    expected_source: 'saavn',
    notes: 'Should reject generic compilation covers',
  },
  {
    // Case 2: Wrong album cover
    song_id: 'test_wrong_album',
    title: 'Illuminati',
    artist: 'Sushin Shyam',
    language: 'Malayalam',
    expected_source: 'saavn',
    notes: 'Should match exact song, not album compilation',
  },
  {
    // Case 3: Dubbed version confusion
    song_id: 'test_dubbed',
    title: 'Naatu Naatu',
    artist: 'Rahul Sipligunj',
    language: 'Telugu',
    expected_source: 'saavn',
    notes: 'Should not match Hindi dubbed version',
  },
];
```

### Run Test Suite

```bash
node scripts/test-bad-cases.js
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Verification Success Rate**: `successful / total_attempts`
2. **Source Distribution**: Which sources are used most
3. **Average Verification Time**: Should be < 3 seconds
4. **Manual Override Rate**: Should be < 5%
5. **User Reports**: Track wrong cover reports

### Logging

All verification attempts are logged to `cover_verification_logs` table:

```sql
SELECT 
  chosen_source,
  COUNT(*) as attempts,
  COUNT(*) FILTER (WHERE success = true) as successful,
  AVG(verification_time_ms) as avg_time
FROM cover_verification_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY chosen_source;
```

## Troubleshooting

### Issue: Low match rate

**Solution**: Lower similarity thresholds or improve normalization

```javascript
// Adjust thresholds
const matchResult = isMatch(detail, query, {
  titleThreshold: 0.65,  // Lower from 0.72
  artistThreshold: 0.60, // Lower from 0.65
});
```

### Issue: Slow verification

**Solution**: Use worker queue for async processing

```javascript
// Don't block user requests
await queueVerification(songMeta);
// Return placeholder immediately
return { cover_url: PLACEHOLDER_IMAGE };
```

### Issue: Rate limit errors

**Solution**: Increase delays between API calls

```javascript
const rateLimits = {
  jiosaavn: { delay: 200, lastCall: 0 }, // Increase from 100ms
};
```

### Issue: Wrong covers still appearing

**Solution**: Check verification logs and adjust matching logic

```sql
SELECT * FROM cover_verification_logs 
WHERE song_id = 'problematic_song_id'
ORDER BY created_at DESC;
```

## API Reference

See [API_REFERENCE.md](./API_REFERENCE.md) for complete endpoint documentation.

## License

MIT

## Support

For issues or questions, contact: dev@example.com
