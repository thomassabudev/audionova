# Playlist Reorder Backend Pseudocode

## Overview
Implementation of the playlist reorder functionality with version control and conflict resolution.

## Database Schema

### Playlists Table
```sql
CREATE TABLE playlists (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Playlist Tracks Table
```sql
CREATE TABLE playlist_tracks (
  id SERIAL PRIMARY KEY,
  playlist_id VARCHAR(255) NOT NULL,
  track_id VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
```

### Playlist Changelog Table
```sql
CREATE TABLE playlist_changelog (
  id SERIAL PRIMARY KEY,
  playlist_id VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'reorder', 'add', 'remove'
  changes JSONB NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
```

## API Endpoint Implementation

### PATCH /api/playlists/:id/reorder

```javascript
// Express.js route handler
app.patch('/api/playlists/:id/reorder', async (req, res) => {
  const { id: playlistId } = req.params;
  const { version, order } = req.body;
  const userId = req.user.id; // Assuming authenticated user
  
  try {
    // Start transaction
    await db.beginTransaction();
    
    // 1. Fetch current playlist version
    const playlist = await db.query(
      'SELECT id, version FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, userId]
    );
    
    if (!playlist) {
      await db.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Playlist not found'
      });
    }
    
    // 2. Check for version conflict
    if (playlist.version !== version) {
      // Fetch current server state
      const serverState = await getPlaylistWithTracks(playlistId);
      
      await db.rollback();
      return res.status(409).json({
        error: 'Version conflict',
        message: 'The playlist has been modified by another user or device',
        currentVersion: playlist.version,
        serverState
      });
    }
    
    // 3. Validate order array
    if (!Array.isArray(order) || order.length === 0) {
      await db.rollback();
      return res.status(400).json({
        error: 'Bad request',
        message: 'Order array is required and cannot be empty'
      });
    }
    
    // 4. Validate all track IDs exist in playlist
    const trackIds = order.map(item => item.id);
    const existingTracks = await db.query(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = $1 AND track_id = ANY($2)',
      [playlistId, trackIds]
    );
    
    const existingTrackIds = existingTracks.map(track => track.track_id);
    const missingTracks = trackIds.filter(id => !existingTrackIds.includes(id));
    
    if (missingTracks.length > 0) {
      await db.rollback();
      return res.status(400).json({
        error: 'Bad request',
        message: 'Some tracks do not exist in the playlist',
        missingTracks
      });
    }
    
    // 5. Update track positions
    for (const { id, position } of order) {
      await db.query(
        'UPDATE playlist_tracks SET position = $1 WHERE playlist_id = $2 AND track_id = $3',
        [position, playlistId, id]
      );
    }
    
    // 6. Increment playlist version
    const newVersion = playlist.version + 1;
    await db.query(
      'UPDATE playlists SET version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newVersion, playlistId]
    );
    
    // 7. Log changelog
    await db.query(
      'INSERT INTO playlist_changelog (playlist_id, version, action, changes, user_id) VALUES ($1, $2, $3, $4, $5)',
      [playlistId, newVersion, 'reorder', JSON.stringify(order), userId]
    );
    
    // 8. Commit transaction
    await db.commit();
    
    // 9. Return updated playlist
    const updatedPlaylist = await getPlaylistWithTracks(playlistId);
    
    // Send analytics event
    analytics.track('playlist_editor_save', {
      playlistId,
      trackCount: updatedPlaylist.tracks.length,
      version: newVersion
    });
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    await db.rollback();
    console.error('Failed to reorder playlist:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reorder playlist'
    });
  }
});

// Helper function to get playlist with tracks
async function getPlaylistWithTracks(playlistId) {
  const playlist = await db.query(
    'SELECT * FROM playlists WHERE id = $1',
    [playlistId]
  );
  
  const tracks = await db.query(
    'SELECT pt.track_id, pt.position, t.* FROM playlist_tracks pt JOIN tracks t ON pt.track_id = t.id WHERE pt.playlist_id = $1 ORDER BY pt.position',
    [playlistId]
  );
  
  return {
    ...playlist,
    tracks: tracks.map(track => ({
      id: track.track_id,
      name: track.name,
      primaryArtists: track.primary_artists,
      duration: track.duration,
      image: track.image ? JSON.parse(track.image) : []
    }))
  };
}
```

## Conflict Resolution Implementation

### GET /api/playlists/:id/conflict-resolution

```javascript
// Endpoint to help with conflict resolution
app.get('/api/playlists/:id/conflict-resolution', async (req, res) => {
  const { id: playlistId } = req.params;
  const { version } = req.query;
  
  try {
    // Get current server state
    const serverState = await getPlaylistWithTracks(playlistId);
    
    // Get changelog since the client's version
    const changelog = await db.query(
      'SELECT * FROM playlist_changelog WHERE playlist_id = $1 AND version > $2 ORDER BY created_at',
      [playlistId, version]
    );
    
    res.status(200).json({
      serverState,
      changelog: changelog.map(entry => ({
        ...entry,
        changes: JSON.parse(entry.changes)
      }))
    });
  } catch (error) {
    console.error('Failed to get conflict resolution data:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get conflict resolution data'
    });
  }
});
```

## Undo Functionality

### POST /api/playlists/:id/undo

```javascript
// Endpoint to undo recent changes
app.post('/api/playlists/:id/undo', async (req, res) => {
  const { id: playlistId } = req.params;
  const { version } = req.body;
  const userId = req.user.id;
  
  try {
    await db.beginTransaction();
    
    // Get changelog entry for the version to undo
    const changelog = await db.query(
      'SELECT * FROM playlist_changelog WHERE playlist_id = $1 AND version = $2',
      [playlistId, version]
    );
    
    if (!changelog) {
      await db.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Changelog entry not found'
      });
    }
    
    const change = changelog[0];
    
    // Revert the change based on action type
    if (change.action === 'reorder') {
      // For reorder, we need to get the previous state
      const previousChangelog = await db.query(
        'SELECT changes FROM playlist_changelog WHERE playlist_id = $1 AND version = $2',
        [playlistId, version - 1]
      );
      
      if (previousChangelog) {
        const previousOrder = JSON.parse(previousChangelog[0].changes);
        
        // Apply previous order
        for (const { id, position } of previousOrder) {
          await db.query(
            'UPDATE playlist_tracks SET position = $1 WHERE playlist_id = $2 AND track_id = $3',
            [position, playlistId, id]
          );
        }
      }
    } else if (change.action === 'add') {
      // Remove the added track
      await db.query(
        'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2',
        [playlistId, change.changes.trackId]
      );
    } else if (change.action === 'remove') {
      // Re-add the removed track
      await db.query(
        'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES ($1, $2, $3)',
        [playlistId, change.changes.trackId, change.changes.position]
      );
    }
    
    // Decrement playlist version
    await db.query(
      'UPDATE playlists SET version = version - 1 WHERE id = $1',
      [playlistId]
    );
    
    // Remove changelog entry
    await db.query(
      'DELETE FROM playlist_changelog WHERE id = $1',
      [change.id]
    );
    
    await db.commit();
    
    // Return updated playlist
    const updatedPlaylist = await getPlaylistWithTracks(playlistId);
    
    // Send analytics event
    analytics.track('playlist_editor_undo', {
      playlistId,
      version
    });
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    await db.rollback();
    console.error('Failed to undo playlist change:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to undo playlist change'
    });
  }
});
```

## Performance Considerations

1. **Database Indexes:**
   ```sql
   CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
   CREATE INDEX idx_playlist_tracks_position ON playlist_tracks(position);
   CREATE INDEX idx_playlist_changelog_playlist_id ON playlist_changelog(playlist_id);
   CREATE INDEX idx_playlist_changelog_version ON playlist_changelog(version);
   ```

2. **Caching:**
   - Cache playlist metadata for frequently accessed playlists
   - Use Redis for caching recent playlist states

3. **Batch Operations:**
   - For large playlists, consider batch updates to reduce database round trips

4. **Connection Pooling:**
   - Use connection pooling to handle concurrent requests efficiently

## Security Considerations

1. **Authentication:**
   - Ensure all endpoints require authentication
   - Validate user ownership of playlists

2. **Rate Limiting:**
   - Implement rate limiting to prevent abuse

3. **Input Validation:**
   - Validate all input parameters
   - Sanitize user-provided data

4. **SQL Injection Prevention:**
   - Use parameterized queries
   - Avoid string concatenation in SQL statements