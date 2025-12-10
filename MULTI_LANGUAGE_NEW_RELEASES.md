# Multi-Language New Releases Feature

## Overview

This feature implements a real-time multi-language New Releases section that combines Malayalam, Hindi, and Tamil songs into one mixed feed, removes duplicates, and provides live updates using the JioSaavn API.

## Features Implemented

### 1. Multi-Language Support
- Fetches new releases for Malayalam (ml), Hindi (hi), and Tamil (ta)
- Mixed feed sorted by release date (newest first)
- Language-specific filtering option

### 2. Deduplication
- Shows only one representative song per album/movie
- Removes duplicate tracks that share the same album or title across languages
- Marks one song from each album as `featured = true`

### 3. Database Schema
- Added `language` field to songs table
- Created index on language field for performance
- Stores all required fields: external id, title, artists, album, language, release date, metadata, fingerprint, featured flag

### 4. Background Worker
- Runs every 10 minutes to fetch new songs for all three languages
- Uses token-bucket rate-limiting to stay within JioSaavn API quota
- On each new featured song, publishes an event to Redis channel "new_releases"

### 5. Realtime Updates
- Backend listens to Redis and pushes updates via Server-Sent Events (SSE)
- Each connected client instantly receives new song data without refresh

### 6. Frontend Display
- Section heading: "🔥 New Releases (Malayalam • Hindi • Tamil)" with subtitle "Updated hourly — mixed latest hits"
- Shows songs in a responsive grid
- Each card displays:
  - Cover art
  - Title and artist
  - Language label (ML/HI/TA) with color coding
  - NEW badge for songs added within 7 days
- Language filter dropdown
- "See All" functionality

### 7. APIs Implemented
- `GET /api/new-releases` - Returns mixed feed of featured songs
- `GET /api/new-releases/:lang` - Returns filtered list for one language
- `GET /api/new-releases/albums/:albumId` - Returns all songs from a specific album
- `GET /api/new-releases/events` - Realtime event endpoint (SSE)
- `POST /api/new-releases/fetch` - Admin endpoint to manually trigger fetch

### 8. Rate-Limit and Reliability
- Token bucket rate-limiting to prevent API abuse
- Exponential backoff on 429 responses
- Redis-based locking to prevent duplicate fetches
- Request caching to minimize duplicate calls

### 9. User Experience Enhancements
- Toast notifications when new songs arrive
- Language filtering (All, Malayalam, Hindi, Tamil)
- Keyboard accessibility
- Smooth animations using Framer Motion
- Responsive design for all screen sizes

## Technical Implementation

### Backend Changes
1. Updated `worker/fetcher.js` to:
   - Focus on Malayalam, Hindi, and Tamil languages
   - Store language information with each song
   - Process songs with language-aware deduplication

2. Updated `routes/new-releases.js` to:
   - Add language-specific endpoints
   - Include language information in API responses
   - Validate language parameters

3. Updated `db/schema.sql` to:
   - Add `language` field to songs table
   - Create index on language field

### Frontend Changes
1. Updated `NewReleasesRow.jsx` to:
   - Display mixed feed of all languages
   - Add language filter dropdown
   - Show language badges with color coding
   - Update section heading and subtitle
   - Handle language-specific API calls

## Color Coding
- Malayalam: Green (#10B981)
- Hindi: Orange (#F97316)
- Tamil: Purple (#8B5CF6)

## Testing
The feature has been tested for:
- Realtime updates via SSE
- Rate-limit handling
- Deduplication logic
- Language filtering
- Offline behavior (fallback to trending songs)
- UI responsiveness

## Future Enhancements
1. User preference toggle for language filtering
2. Artist following notifications
3. Separate "New Albums" section
4. Browser push notifications (PWA)
5. Admin dashboard for monitoring