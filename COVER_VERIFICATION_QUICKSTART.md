# Cover Verification System - Quick Start

Get the cover art verification system running in 5 minutes.

## Prerequisites

- Node.js installed
- PostgreSQL running
- Backend server configured

## Step 1: Initialize Database (30 seconds)

```bash
cd backend
node scripts/init-cover-verification-db.js
```

Expected output:
```
[Init] Starting database initialization...
[Init] Running migration...
[Init] ✓ Tables created successfully
[Init] ✓ Verified tables: song_cover_map, cover_verification_logs, wrong_cover_reports
[Init] ✓ Created indexes: 12
[Init] Database initialization complete!
```

## Step 2: Configure Environment (1 minute)

Add to `backend/.env`:

```env
# Required
DATABASE_URL=postgresql://localhost:5432/vibemusic
ADMIN_TOKEN=your-secure-random-token-here

# Optional (already set)
JIOSAAVN_API_BASE=https://jiosaavn-api-privatecvc2.vercel.app
VERIFICATION_CONCURRENCY=3
```

Generate secure admin token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Start Server (10 seconds)

```bash
cd backend
npm start
```

Routes automatically registered at `/api/cover-verification/*`

## Step 4: Test It (1 minute)

### Quick Test
```bash
curl -X POST http://localhost:3000/api/cover-verification/verify \
  -H "Content-Type: application/json" \
  -d '{"title":"Peelings","artist":"Navod","language":"Malayalam"}'
```

Expected response:
```json
{
  "success": true,
  "cached": false,
  "data": {
    "song_id": "saavn_12345",
    "cover_url": "https://images.saavncdn.com/...",
    "source": "saavn",
    "verified": true,
    "similarity_scores": {
      "title": 1.0,
      "artist": 1.0
    }
  }
}
```

### Run Full Test Suite
```bash
npm test
```

### Test Problematic Songs
```bash
node scripts/test-bad-cases.js
```

## Step 5: Integrate with Frontend (2 minutes)

### Update Song Card Component

```typescript
// src/components/SongCard.tsx
import { useEffect, useState } from 'react';

function SongCard({ song }) {
  const [verifiedCover, setVerifiedCover] = useState(null);
  
  useEffect(() => {
    // Fetch verified cover
    fetch(`/api/cover-verification/${song.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.cover_url) {
          setVerifiedCover(data.data.cover_url);
        }
      })
      .catch(() => {
        // Use original cover as fallback
        setVerifiedCover(song.image);
      });
  }, [song.id]);
  
  return (
    <div className="song-card">
      <img 
        src={verifiedCover || song.image || '/placeholder.png'} 
        alt={song.name}
      />
      {/* Rest of card */}
    </div>
  );
}
```

## Optional: Start Worker Queue

For async background verification:

```bash
# Terminal 1: Backend server
npm start

# Terminal 2: Worker
node scripts/start-cover-verification-worker.js
```

Or with PM2:
```bash
pm2 start scripts/start-cover-verification-worker.js --name cover-worker
pm2 logs cover-worker
```

## Verify It's Working

### Check Statistics
```bash
curl http://localhost:3000/api/cover-verification/stats
```

### View Logs
```sql
-- Connect to database
psql -U your_user -d vibemusic

-- View recent verifications
SELECT 
  query_title,
  query_artist,
  chosen_source,
  success,
  verification_time_ms
FROM cover_verification_logs
ORDER BY created_at DESC
LIMIT 10;

-- View cached covers
SELECT 
  title,
  artist,
  source,
  verified_at
FROM song_cover_map
ORDER BY verified_at DESC
LIMIT 10;
```

## Common Issues

### Issue: "Database connection failed"
**Solution**: Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running

### Issue: "No matching cover found"
**Solution**: Normal for obscure songs. System will return `null` and use placeholder

### Issue: "Rate limit exceeded"
**Solution**: Increase delays in `services/coverVerificationService.js`:
```javascript
const rateLimits = {
  jiosaavn: { delay: 200, lastCall: 0 }, // Increase from 100
};
```

## Next Steps

1. ✅ System is running
2. Test with your trending songs
3. Monitor logs for patterns
4. Adjust thresholds if needed (see README)
5. Set up worker queue for production

## Full Documentation

- **Complete Guide**: `backend/COVER_VERIFICATION_README.md`
- **Implementation Details**: `COVER_VERIFICATION_IMPLEMENTATION.md`
- **API Examples**: `backend/COVER_VERIFICATION_EXAMPLES.sh`

## Support

Run diagnostics:
```bash
node scripts/test-bad-cases.js
```

Check logs:
```bash
tail -f backend/logs/cover-verification.log
```

---

**You're all set!** The cover verification system is now protecting your users from wrong cover art. 🎉
