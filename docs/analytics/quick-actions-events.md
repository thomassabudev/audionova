# Analytics Events for Sidebar Quick Actions

## Event List

### Quick Action Events
| Event Name | Trigger | Description |
|------------|---------|-------------|
| quick_add_queue | User clicks "Add to Queue" button | Track when users quickly add songs to their queue |
| quick_like | User clicks "Like" button | Track when users quickly like/unlike songs |
| quick_add_playlist | User clicks "Add to Playlist" button | Track when users quickly add songs to a playlist |
| quick_create_playlist | User clicks "Create Playlist" button | Track when users create new playlists via quick actions |
| quick_bulk_download | User clicks "Download" button in bulk | Track when users download multiple songs at once |
| quick_undo | User clicks "Undo" on a toast notification | Track when users undo quick actions |
| quick_drag_drop | User drops items on quick actions area | Track when users use drag-and-drop functionality |
| quick_multi_select_enter | User enters multi-select mode | Track when users begin selecting multiple items |
| quick_multi_select_exit | User exits multi-select mode | Track when users finish multi-select operations |

### Multi-Select Events
| Event Name | Trigger | Description |
|------------|---------|-------------|
| quick_multi_select_count | Selection changes | Track number of items selected in multi-select mode |
| quick_multi_add_queue | Bulk add to queue | Track bulk queue additions |
| quick_multi_like | Bulk like/unlike | Track bulk like operations |
| quick_multi_add_playlist | Bulk add to playlist | Track bulk playlist additions |
| quick_multi_download | Bulk download | Track bulk download operations |

### Settings Events
| Event Name | Trigger | Description |
|------------|---------|-------------|
| quick_actions_enabled | Toggle changed | Track when quick actions are enabled/disabled |
| quick_playlist_changed | Default playlist updated | Track changes to default quick playlist |

### Error Events
| Event Name | Trigger | Description |
|------------|---------|-------------|
| quick_action_error | Action fails | Track when quick actions fail |
| quick_batch_error | Batch operation fails | Track when batch operations fail |
| quick_undo_error | Undo operation fails | Track when undo operations fail |
| quick_drag_error | Drag operation fails | Track when drag operations fail |

## Event Payloads

### quick_add_queue
```json
{
  "event": "quick_add_queue",
  "userId": "user123",
  "trackIds": ["track1", "track2", "track3"],
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "trackCount": 3
}
```

### quick_like
```json
{
  "event": "quick_like",
  "userId": "user123",
  "trackIds": ["track1", "track2"],
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "trackCount": 2,
  "action": "like" // or "unlike"
}
```

### quick_add_playlist
```json
{
  "event": "quick_add_playlist",
  "userId": "user123",
  "trackIds": ["track1", "track2", "track3", "track4"],
  "playlistId": "playlist123",
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "trackCount": 4
}
```

### quick_create_playlist
```json
{
  "event": "quick_create_playlist",
  "userId": "user123",
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### quick_bulk_download
```json
{
  "event": "quick_bulk_download",
  "userId": "user123",
  "trackIds": ["track1", "track2", "track3"],
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "trackCount": 3
}
```

### quick_undo
```json
{
  "event": "quick_undo",
  "userId": "user123",
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "action": "add_to_queue" // or "like", "add_to_playlist", etc.
}
```

### quick_drag_drop
```json
{
  "event": "quick_drag_drop",
  "userId": "user123",
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "itemCount": 2
}
```

### quick_multi_select_enter
```json
{
  "event": "quick_multi_select_enter",
  "userId": "user123",
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### quick_multi_add_queue
```json
{
  "event": "quick_multi_add_queue",
  "userId": "user123",
  "trackIds": ["track1", "track2", "track3", "track4", "track5"],
  "source": "sidebar_quick",
  "timestamp": "2023-01-01T00:00:00Z",
  "trackCount": 5
}
```

## Implementation Notes

1. All events should include the standard properties:
   - `event`: The event name
   - `userId`: The authenticated user ID
   - `source`: Always "sidebar_quick" for these events
   - `timestamp`: ISO timestamp of the event

2. Track count properties should be included for batch operations to enable easier analysis

3. Error events should include additional error information:
   ```json
   {
     "event": "quick_action_error",
     "userId": "user123",
     "source": "sidebar_quick",
     "timestamp": "2023-01-01T00:00:00Z",
     "error": "Network error",
     "action": "add_to_queue"
   }
   ```

4. Events should be batched and sent periodically to reduce network overhead

5. Offline events should be queued and sent when connectivity is restored