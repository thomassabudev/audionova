# Playlist Editor API Specification

## Overview
API endpoints for the Playlist Editor feature including reordering, adding, and removing tracks with version control and conflict resolution.

## Endpoints

### Get Playlist Metadata
```
GET /api/playlists/:id
```

**Response:**
```json
{
  "id": "playlist-123",
  "name": "My Favorite Songs",
  "description": "A collection of my favorite tracks",
  "version": 5,
  "tracks": [
    {
      "id": "track-1",
      "name": "Song Title",
      "primaryArtists": "Artist Name",
      "duration": 180,
      "image": [
        {
          "quality": "500x500",
          "link": "https://example.com/image.jpg"
        }
      ]
    }
  ],
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-02T00:00:00Z"
}
```

### Reorder Playlist Tracks
```
PATCH /api/playlists/:id/reorder
```

**Request Body:**
```json
{
  "version": 5,
  "order": [
    {
      "id": "track-1",
      "position": 0
    },
    {
      "id": "track-3",
      "position": 1
    },
    {
      "id": "track-2",
      "position": 2
    }
  ]
}
```

**Response (Success - 200):**
```json
{
  "id": "playlist-123",
  "name": "My Favorite Songs",
  "version": 6,
  "tracks": [
    {
      "id": "track-1",
      "name": "Song Title 1",
      "primaryArtists": "Artist Name",
      "duration": 180,
      "image": [...]
    },
    {
      "id": "track-3",
      "name": "Song Title 3",
      "primaryArtists": "Artist Name",
      "duration": 210,
      "image": [...]
    },
    {
      "id": "track-2",
      "name": "Song Title 2",
      "primaryArtists": "Artist Name",
      "duration": 195,
      "image": [...]
    }
  ]
}
```

**Response (Conflict - 409):**
```json
{
  "error": "Version conflict",
  "message": "The playlist has been modified by another user or device",
  "currentVersion": 6,
  "serverState": {
    "id": "playlist-123",
    "name": "My Favorite Songs",
    "version": 6,
    "tracks": [...]
  }
}
```

### Add Track to Playlist
```
POST /api/playlists/:id/tracks
```

**Request Body:**
```json
{
  "trackId": "track-4",
  "position": 3
}
```

**Response (Success - 200):**
```json
{
  "id": "playlist-123",
  "name": "My Favorite Songs",
  "version": 7,
  "tracks": [...]
}
```

### Remove Track from Playlist
```
DELETE /api/playlists/:id/tracks/:trackId
```

**Response (Success - 200):**
```json
{
  "id": "playlist-123",
  "name": "My Favorite Songs",
  "version": 8,
  "tracks": [...]
}
```

## Error Handling

### 409 Conflict
Returned when the client's playlist version doesn't match the server's current version.

**Response:**
```json
{
  "error": "Version conflict",
  "message": "The playlist has been modified by another user or device",
  "currentVersion": 6,
  "serverState": {
    "id": "playlist-123",
    "version": 6,
    "tracks": [...]
  }
}
```

### 404 Not Found
Returned when the playlist or track doesn't exist.

**Response:**
```json
{
  "error": "Not found",
  "message": "Playlist not found"
}
```

### 400 Bad Request
Returned when the request body is invalid.

**Response:**
```json
{
  "error": "Bad request",
  "message": "Invalid request body",
  "details": [
    "version is required",
    "order must be an array"
  ]
}
```

## Webhook Events

### Playlist Modified
```
POST /webhooks/playlist-modified
```

**Payload:**
```json
{
  "eventType": "playlist.modified",
  "timestamp": "2023-01-02T00:00:00Z",
  "userId": "user-123",
  "playlistId": "playlist-123",
  "changes": {
    "type": "reorder",
    "version": 6,
    "previousVersion": 5
  }
}
```

## Analytics Events

### Editor Opened
```
playlist_editor_opened
```
Properties:
- `playlistId`: The ID of the playlist being edited
- `trackCount`: Number of tracks in the playlist

### Track Reordered
```
playlist_editor_reorder
```
Properties:
- `playlistId`: The ID of the playlist
- `trackId`: The ID of the track being moved
- `oldIndex`: Previous position of the track
- `newIndex`: New position of the track

### Track Added
```
playlist_editor_add_track
```
Properties:
- `playlistId`: The ID of the playlist
- `trackId`: The ID of the track being added

### Track Removed
```
playlist_editor_remove_track
```
Properties:
- `playlistId`: The ID of the playlist
- `trackId`: The ID of the track being removed

### Changes Saved
```
playlist_editor_save
```
Properties:
- `playlistId`: The ID of the playlist
- `trackCount`: Number of tracks in the playlist
- `version`: New version number

### Undo Performed
```
playlist_editor_undo
```
Properties:
- `playlistId`: The ID of the playlist
- `version`: Version being restored

### Conflict Encountered
```
playlist_editor_conflict
```
Properties:
- `playlistId`: The ID of the playlist
- `clientVersion`: Version client was working with
- `serverVersion`: Current server version
- `resolution`: "reload" or "merge"