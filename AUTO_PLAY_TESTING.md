# Auto-Play Next Track Testing Guide

This guide explains how to manually test the auto-play next track functionality that ensures playlists automatically continue playing when a track ends.

## Implementation Summary

The auto-play next track feature automatically plays the next song in a playlist when the current song ends, just like Spotify. This works across all playlists in the app and continues working when users navigate to other routes.

## Manual Testing Steps

### 1. Test Basic Auto-Play Functionality

1. Navigate to any playlist (Home, Search, Album, or Playlist view)
2. Click play on any song in the playlist
3. Verify the song starts playing and the player shows the song info
4. Wait for the song to finish or simulate the ended event
5. Verify the next song in the playlist automatically starts playing

### 2. Test Repeat Mode Behavior

1. Start playing a playlist
2. Enable "Repeat One" mode (click the repeat button until it shows "one")
3. Let a song finish
4. Verify the same song replays automatically
5. Change to "Repeat All" mode (click the repeat button until it shows "all")
6. Navigate to the last song in the playlist
7. Let it finish
8. Verify the first song in the playlist plays automatically

### 3. Test Shuffle Mode Behavior

1. Start playing a playlist with multiple songs
2. Enable shuffle mode
3. Let a song finish
4. Verify a random song from the playlist plays next
5. Continue letting songs finish and verify different songs play each time

### 4. Test Route Independence

1. Start playing a playlist from any view
2. Navigate to a different view (e.g., from Home to Search)
3. Let the current song finish
4. Verify the next song from the original playlist plays automatically

### 5. Test State Persistence

1. Start playing a playlist
2. Note which song is playing and its position in the playlist
3. Refresh the page
4. Verify the player rehydrates with the same playlist and current song
5. Let the song finish
6. Verify the next song plays automatically

## Expected Behaviors

### When a song ends:
- If repeat mode is "one": The same song replays
- If repeat mode is "all": 
  - If not at the last song: The next song plays
  - If at the last song: The first song plays
- If repeat mode is "off":
  - If not at the last song: The next song plays
  - If at the last song: Playback stops

### With shuffle enabled:
- Next song is selected randomly from the playlist
- Attempts to avoid immediate repeats when possible

### Across route changes:
- Playlist context is maintained
- Next song plays automatically regardless of current view

### On page refresh:
- Same playlist and position are restored
- Next song plays automatically after refresh

## Technical Implementation Details

The implementation uses the HTMLAudioElement's `ended` event to detect when a song finishes. When this event fires:

1. The `handleSongEnd` function is called
2. Based on the current `repeatMode`, it either:
   - Replays the same song (repeat "one")
   - Calls `playNext()` to play the next song
3. The `playNext()` function handles:
   - Sequential playback when shuffle is off
   - Random playback when shuffle is on
   - Wrapping to the first song when repeat "all" is enabled
   - Stopping playback when at the end with repeat "off"

## Files Modified

1. `src/context/MusicContext.tsx` - Enhanced auto-play logic and state management

## Key Functions

- `handleSongEnd()` - Called when audio element fires the `ended` event
- `playNext()` - Handles playing the next song based on shuffle and repeat settings
- `setPlaylistAndPlay()` - Sets the active playlist and starts playback at a specific index

## LocalStorage Persistence

The active playlist state is persisted using the key `active_playlist_v1` with the following structure:
```json
{
  "tracks": ["array", "of", "song", "objects"],
  "currentIndex": 0,
  "repeatMode": "off|one|all",
  "shuffle": false
}
```

Only essential fields are stored to minimize localStorage usage.