# feat(lyrics): add synced lyrics viewer + karaoke mode (licensed provider, no lyrics in repo)

## Description

This PR implements a safe, licensed auto-synced lyrics feature that fetches synchronized lyrics (LRC) at runtime from a licensed provider and displays them with auto-scroll and karaoke highlight. The implementation ensures no full lyrics text is committed to the repository.

## Features Implemented

1. **Synced Lyrics Display**:
   - Fetches lyrics at runtime from licensed provider API via backend proxy
   - Parses LRC format and displays synced lines with auto-scroll
   - Highlights current line based on audio playback time

2. **Karaoke Mode**:
   - Fullscreen modal that blurs album art background
   - Prominently displays current line with smooth transitions
   - Respects `prefers-reduced-motion` for accessibility

3. **Translation Toggle**:
   - Optional "Translate lyrics" toggle that calls translation API
   - Translations are for display only and not stored permanently

4. **Fallback UI**:
   - Shows "Lyrics not available" with link to official lyrics when provider unavailable
   - Optional user-upload button with rights confirmation checkbox

5. **Security & Repo Hygiene**:
   - No full lyrics text committed to repository
   - Provider API keys stored in `.env` and platform environment variables
   - Only minimal metadata saved to app storage (trackId, providerLyricsId, cachedAt)

6. **Attribution & Reporting**:
   - Displays provider attribution ("Lyrics provided by X")
   - Includes report/takedown button in UI

## Files Changed

### Frontend
- `src/services/lyricsProvider.ts` - Lyrics service with LRC parsing and provider wrapper
- `src/components/LyricsViewer.tsx` - Main lyrics display component with sync, auto-scroll, karaoke UI
- `src/__tests__/lyricsProvider.test.js` - Unit tests for lyrics provider service
- `src/__tests__/LyricsViewer.integration.test.js` - Integration tests for lyrics viewer

### Backend
- `backend/routes/lyrics.js` - Backend proxy for lyrics API to keep provider keys secure
- `backend/server.js` - Added lyrics route registration

### Configuration
- `.gitignore` - Added rules to exclude lyrics files
- `.env.example` - Added lyrics provider API key placeholder

## Implementation Details

### Lyrics Provider Service
- `parseLRC()` function to convert LRC format to timed lines
- `fetchSyncedLyrics()` function to fetch from backend proxy
- `translateLyrics()` function for on-demand translation
- Metadata storage with 24-hour TTL cache

### Backend Proxy
- Secure route that keeps provider API keys off the client
- Mock implementation for development
- User lyrics upload endpoint with rights confirmation

### Lyrics Viewer Component
- Auto-scroll to keep current line visible
- Karaoke mode with fullscreen blurred background
- Translation toggle with client-side API calls
- Fallback UI for unavailable lyrics

## Security & Compliance

- **No full lyrics in repo**: Only minimal metadata is stored, never full lyric text
- **Provider key security**: Keys stored in `.env` and accessed via backend proxy
- **User upload safety**: Requires rights confirmation checkbox
- **Git hygiene**: `.gitignore` rules prevent accidental lyric commits

## Testing

### Unit Tests
- LRC parsing functionality
- Lyrics fetching and error handling
- Translation service
- Metadata storage and cache validation

### Integration Tests
- Lyrics display and fallback UI
- Sync functionality and auto-scroll
- Karaoke mode toggle and display
- Translation toggle behavior
- User action callbacks
- Accessibility features

## How to Configure

1. **Provider Setup**:
   - Obtain API key from licensed lyrics provider (Musixmatch, LyricFind, etc.)
   - Add key to `.env` as `LYRICS_PROVIDER_API_KEY`
   - Update backend proxy implementation to call actual provider

2. **Environment Variables**:
   ```env
   # .env
   LYRICS_PROVIDER_API_KEY=your_actual_api_key_here
   ```

3. **Platform Deployment**:
   - Set `LYRICS_PROVIDER_API_KEY` in platform environment variables
   - Never commit real API keys to repository

## Manual Testing Instructions

1. Load a song with available lyrics
   - Verify lyrics display correctly
   - Check line highlighting during playback
   - Test auto-scroll functionality

2. Toggle karaoke mode
   - Verify fullscreen display
   - Check album art background blur
   - Test close functionality

3. Toggle translation
   - Verify translated text display
   - Check revert to original text

4. Load song without lyrics
   - Verify fallback UI
   - Test contribute lyrics button
   - Check external link if available

5. Test error scenarios
   - Simulate network errors
   - Verify graceful error handling

## Notes for Reviewer

- This implementation provides a safe, licensed approach to lyrics display
- No real API keys or lyric text is included in the PR
- Reviewer must configure their own provider credentials for testing
- The backend proxy pattern ensures provider keys remain secure
- All storage is ephemeral with proper TTL to prevent repository pollution

## Commit Message

```
feat(lyrics): add synced lyrics viewer + karaoke mode (licensed provider, no lyrics in repo)
```