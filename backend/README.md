# VibeMusic Backend

## Overview

This is the backend server for VibeMusic, a music streaming application. It provides APIs for user authentication, music search, playlist management, and real-time new releases tracking.

## Features

- User authentication (register/login)
- Spotify playlist import
- YouTube playlist import
- Real-time new releases tracking
- Rate limiting for external APIs
- SSE for real-time updates

## Real-Time New Releases System

The backend includes a sophisticated real-time new releases system that:

1. **Fetches** new Malayalam songs every 10 minutes from JioSaavn API
2. **Deduplicates** songs by ensuring only one representative per album/movie
3. **Stores** songs in PostgreSQL with featured flag for display
4. **Publishes** updates via Redis Pub/Sub
5. **Pushes** real-time updates to connected clients via SSE

### System Components

- **Fetcher Worker**: `worker/fetcher.js` - Background job that fetches new releases
- **Database Schema**: `db/schema.sql` - PostgreSQL tables for songs and events
- **API Routes**: `routes/new-releases.js` - REST endpoints for new releases
- **SSE Handler**: Integrated in routes for real-time updates

### Key Features

- **Rate Limiting**: Token bucket algorithm to respect JioSaavn API limits
- **Deduplication**: Only one song per album displayed in "New Releases"
- **Real-time Updates**: Instant push to all connected clients
- **7-day NEW Badge**: Songs marked "NEW" for 7 days after release
- **Offline Support**: Cached data for offline mode
- **Analytics**: Comprehensive event logging

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Playlist Import
- `GET /api/import/spotify/:playlistId` - Import Spotify playlist
- `GET /api/import/youtube/:playlistId` - Import YouTube playlist

### New Releases
- `GET /api/new-releases` - Get featured new releases
- `GET /api/new-releases/songs/:id` - Get song details
- `GET /api/new-releases/albums/:name` - Get all songs from album
- `POST /api/new-releases/fetch` - Manual fetch trigger (admin)
- `GET /api/new-releases/events` - SSE endpoint for real-time updates

### Health
- `GET /api/health` - Server health check

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see `.env.example`)

3. Create database and run schema:
   ```sql
   CREATE DATABASE vibemusic;
   \c vibemusic
   \i db/schema.sql
   ```

4. Start Redis server

5. Start the server:
   ```bash
   npm start
   ```

## Development

```bash
# Start development server with auto-reload
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration
```

## Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Test Plan](TEST_PLAN.md)