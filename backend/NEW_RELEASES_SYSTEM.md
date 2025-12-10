# Real-Time New Releases System

## Overview

The Real-Time New Releases System is a sophisticated feature that automatically detects, processes, and displays new music releases to users in real-time. The system ensures that users see only one representative song per album/movie while providing instant notifications when new releases are detected.

## Architecture

### Components

1. **Fetcher Worker** (`worker/fetcher.js`)
   - Background job that periodically fetches new releases from JioSaavn API
   - Implements token bucket rate limiting
   - Processes and deduplicates songs
   - Publishes updates via Redis

2. **Database** (`db/schema.sql`)
   - PostgreSQL tables for songs and release events
   - Indexes for performance optimization
   - Rate limit tracking

3. **API Routes** (`routes/new-releases.js`)
   - REST endpoints for accessing new releases
   - SSE endpoint for real-time updates
   - Manual fetch trigger

4. **Frontend Components**
   - `NewReleasesRow.jsx` - UI component for displaying new releases
   - `useNewReleasesStream.js` - Hook for SSE connection

## Key Features

### 1. Rate Limiting
- **Token Bucket Algorithm**: Prevents API abuse
- **Configurable Limits**: 1000 tokens per day by default
- **Automatic Refill**: Tokens replenish over time

### 2. Deduplication
- **Per-Album Filtering**: Only one song per album displayed
- **Fingerprinting**: Detects metadata changes
- **Featured Flag**: Marks representative songs for display

### 3. Real-time Updates
- **SSE (Server-Sent Events)**: Push updates to connected clients
- **Instant Notification**: Toast notifications for new releases
- **Multiple Client Support**: All connected users receive updates

### 4. New Release Detection
- **7-day Window**: Songs marked "NEW" for 7 days
- **Release Date Filtering**: Only recent releases displayed
- **Automatic Expiration**: NEW badges removed after 7 days

### 5. Offline Support
- **Cached Data**: Shows previous releases when offline
- **Graceful Degradation**: Maintains functionality during outages
- **Auto-sync**: Updates when connection restored

## Data Flow

1. **Fetcher** → Queries JioSaavn API every 10 minutes
2. **Processor** → Deduplicates and filters songs
3. **Database** → Stores unique songs with featured flags
4. **Publisher** → Sends events via Redis Pub/Sub
5. **API** → Provides REST endpoints and SSE stream
6. **Frontend** → Displays releases and receives real-time updates

## Database Schema

### Songs Table
```sql
CREATE TABLE songs (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    title TEXT,
    artists TEXT,
    album TEXT,
    release_date TIMESTAMP,
    metadata JSONB,
    fingerprint TEXT,
    featured BOOLEAN DEFAULT false,
    added_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### Events Table
```sql
CREATE TABLE new_release_events (
    id BIGSERIAL PRIMARY KEY,
    song_id BIGINT REFERENCES songs(id),
    detected_at TIMESTAMP DEFAULT now(),
    notified BOOLEAN DEFAULT false
);
```

## API Endpoints

### GET /api/new-releases
Returns featured new releases (one per album)

### GET /api/new-releases/songs/:id
Returns detailed information for a specific song

### GET /api/new-releases/albums/:name
Returns all songs from a specific album

### POST /api/new-releases/fetch
Manually triggers fetch process (admin only)

### GET /api/new-releases/events
SSE endpoint for real-time updates

## Frontend Integration

### NewReleasesRow Component
- Displays grid of new releases
- Shows "NEW" badges for recent releases
- Handles play actions
- Supports like functionality

### useNewReleasesStream Hook
- Manages SSE connection
- Handles reconnection logic
- Provides real-time updates

## Deployment

### Requirements
- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- Environment variables configured

### Scaling
- **Horizontal**: Multiple worker instances
- **Vertical**: Increased rate limits
- **Database**: Connection pooling

## Monitoring

### Events Logged
- `fetch_attempt` - API fetch initiated
- `fetch_success` - Successful fetch completion
- `fetch_rate_limited` - Rate limit exceeded
- `new_song_detected` - New song found
- `new_album_featured` - Album marked as featured
- `client_new_release_received` - Client received update

### Health Checks
- `/api/health` - Server status
- Database connectivity
- Redis connectivity

## Testing

### Automated Tests
- Unit tests for fetcher logic
- API endpoint tests
- SSE connection tests

### Manual Testing
- UI verification
- Real-time update testing
- Offline mode testing

## Security

### Rate Limiting
- Prevents API abuse
- Protects against DoS attacks
- Configurable limits

### Data Validation
- Input sanitization
- SQL injection prevention
- JSON validation

## Future Enhancements

1. **Machine Learning**: Intelligent release prediction
2. **Multi-language**: Support for more regional languages
3. **Personalization**: User preference-based filtering
4. **Push Notifications**: Web push for offline users
5. **Analytics Dashboard**: Release trend visualization