# Autoplay Functionality Testing Guide

## Overview
This guide explains how to test the autoplay functionality fix that ensures songs automatically play the next track in a playlist when the current song ends.

## What Was Fixed
The autoplay functionality was not working properly - when a song finished playing, it would stop instead of automatically playing the next song in the playlist. This has been fixed by:

1. Adding proper active playlist state management
2. Ensuring playNext() uses the global playlist context
3. Fixing the audio ended event flow
4. Maintaining proper persistence

## How to Test the Fix

### 1. Test Playlist Autoplay
- Navigate to any section (Home, Playlist, Album, Search)
- Click on a song from a list/playlist (not a single song)
- Wait for the song to finish playing
- **Expected Result**: The next song in the playlist should automatically start playing

### 2. Test Repeat Modes
- Set repeat mode to "All" and play a playlist
- When the last song finishes, it should loop back to the first song
- Set repeat mode to "One" and play a song
- When the song finishes, it should replay the same song
- Set repeat mode to "Off" and play a playlist
- When the last song finishes, playback should stop

### 3. Test Shuffle Mode
- Enable shuffle mode and play a playlist
- When songs finish, they should play in random order
- Works with all repeat modes

### 4. Test Single Song Playback
- Play a single song (not from a playlist)
- When the song finishes, playback should stop (unless repeat mode is "One")

### 5. Test Persistence
- Play a song from a playlist
- Refresh the page
- The active playlist should be restored
- Play should resume from the same position

## Debugging Information

The player now includes targeted debug logging that helps trace:
- When a song starts: `[Player] setPlaylistAndPlay`
- Active playlist information: playlist ID and track count
- Current index in playlist
- playNext() computations: next index and chosen track
- Audio element events: ended, play, pause, etc.

To view these logs:
1. Open browser Developer Tools (F12)
2. Go to the Console tab
3. Look for messages starting with `[Player]`

## Key Implementation Details

### Active Playlist Structure
```typescript
interface ActivePlaylist {
  id: string | null;
  tracks: Song[];
  currentIndex: number;
  repeatMode: 'off' | 'one' | 'all';
  shuffle: boolean;
}
```

### Key Methods
- `setPlaylistAndPlay(songs, index)` - Sets the active playlist and starts playback
- `playNext()` - Advances to next track using global playlist state
- `handleSongEnd()` - Called when audio.ended fires, triggers playNext for playlists

### Persistence
- Active playlist is saved to localStorage key `active_playlist_v1`
- Rehydrated on player initialization
- Maintains user's place in playlists between sessions

## Verification Points

✅ audio.ended triggers handleSongEnd() and that reliably causes next track to play when an active playlist has a next track
✅ Playing a song from Home / Playlist / Album / Search sets a global activePlaylist (with tracks[]) and currentIndex  
✅ playNext() uses that global state
✅ If a song started from a single-track context (no list), behavior: stop at end unless repeatMode says otherwise
✅ Added logs that help trace: when a song starts, what activePlaylist is, currentIndex, what playNext() computes as next index/track
✅ Persistence (active_playlist_v1) behavior unchanged

## Files Modified
- `src/context/MusicContext.tsx` - Main player context with all fixes
- Added comprehensive debug logging throughout player lifecycle

## Test Files
- `src/__tests__/autoplay.test.js` - Unit test simulations
- `src/__tests__/audio-ended-event.test.js` - Event flow verification