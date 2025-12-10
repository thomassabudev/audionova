# Route-Independent Playback Testing Guide

This guide explains how to manually test the route-independent playback functionality that was implemented.

## Implementation Summary

The route-independent playback feature allows users to:
1. Click any song anywhere in the app (Home, Search, Album, Playlist, etc.)
2. Have that song's containing list become the active playlist
3. Use the global Next/Previous buttons to navigate within that playlist
4. Have the playlist state persist across route changes and page refreshes

## Manual Testing Steps

### 1. Test Playlist Persistence Across Routes

1. Navigate to the Home page
2. Click a song in the "New Releases" section
3. Verify the song starts playing and the player shows the song info
4. Navigate to a different view (e.g., Search or Playlist view)
5. Click the global Next button
6. Verify the next song from the original "New Releases" list plays

### 2. Test Playlist Replacement

1. From the Home page, click a song in "Trending Malayalam Songs"
2. Verify that song starts playing
3. Navigate to a playlist view
4. Click a song from that playlist
5. Verify the playlist becomes the new active playlist
6. Click the global Next button
7. Verify the next song from the playlist plays (not from the original trending list)

### 3. Test State Persistence Across Page Refresh

1. From any view, click a song to start playback
2. Note which song is playing and its position in the playlist
3. Refresh the page
4. Verify the player rehydrates with the same playlist and current song
5. Click the global Next button
6. Verify playback continues from the correct position

### 4. Test Repeat/Shuffle Behavior Preservation

1. Start playing a song from any list
2. Enable shuffle mode using the shuffle button
3. Click Next multiple times and verify songs are played in random order
4. Enable repeat mode using the repeat button
5. Navigate to the end of the playlist and verify it loops back to the beginning
6. Refresh the page
7. Verify shuffle and repeat settings are preserved

### 5. Test Single-Track Context

1. Find a view with single-track items (e.g., search results with individual songs)
2. Click one of these songs
3. Verify it plays as a single-item playlist
4. Click Next and verify behavior matches repeat/shuffle settings

## Expected Behaviors

### When clicking a song:
- The entire list containing that song becomes the active playlist
- The clicked song starts playing immediately
- The player UI updates to show the current song info
- The playlist is saved to localStorage with key `active_playlist_v1`

### Global Next/Previous buttons:
- Always navigate within the active playlist
- Respect current shuffle and repeat settings
- Work regardless of the current view/route

### On page refresh:
- The player rehydrates from `active_playlist_v1` in localStorage
- The same playlist and current song position are restored
- Playback state (playing/paused) is restored
- Shuffle and repeat settings are restored

## Files Modified

1. `src/context/MusicContext.tsx` - Added `setPlaylistAndPlay` method and persistence logic
2. `src/views/HomeView.tsx` - Updated song click handlers to use `setPlaylistAndPlay`
3. `src/components/EnhancedFullscreenPlaylistView.tsx` - Updated playlist view to use new methods
4. `src/components/FullscreenPlaylistView.tsx` - Updated playlist view to use new methods

## Technical Details

The implementation uses localStorage to persist the active playlist with the following structure:
```json
{
  "playlistId": "optional-id",
  "tracks": ["array", "of", "song", "objects"],
  "currentIndex": 0,
  "repeatMode": "off|one|all",
  "shuffle": false
}
```

Only essential fields are stored to minimize localStorage usage.