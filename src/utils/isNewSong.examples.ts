/**
 * Examples of using the isNewSong utility
 * This file demonstrates various use cases
 */

import { isNewSong } from './isNewSong';
import type { Song } from '../services/jiosaavnApi';

// Example 1: Basic usage with a song object
const song1: Song = {
  id: '1',
  name: 'New Song 2025',
  releaseDate: '2025-01-15T00:00:00.000Z',
  year: '2025',
  // ... other properties
} as Song;

console.log('Is song1 new?', isNewSong(song1)); // true (2025 song)

// Example 2: Song with only year (no releaseDate)
const song2 = {
  releaseDate: null,
  year: 2025
};

console.log('Is song2 new?', isNewSong(song2)); // true (year is 2025)

// Example 3: Very recent song (released 5 days ago)
const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

const song3 = {
  releaseDate: fiveDaysAgo.toISOString(),
  year: 2024
};

console.log('Is song3 new?', isNewSong(song3)); // true (within 14 days)

// Example 4: Old song (released 30 days ago)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const song4 = {
  releaseDate: thirtyDaysAgo.toISOString(),
  year: 2024
};

console.log('Is song4 new?', isNewSong(song4)); // false (too old)

// Example 5: Custom configuration - different target year
const song5 = {
  releaseDate: '2024-12-15T00:00:00.000Z',
  year: 2024
};

console.log('Is song5 new (2025)?', isNewSong(song5, { targetYear: 2025 })); // false
console.log('Is song5 new (2024)?', isNewSong(song5, { targetYear: 2024 })); // true

// Example 6: Custom configuration - different recent days threshold
const tenDaysAgo = new Date();
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

const song6 = {
  releaseDate: tenDaysAgo.toISOString(),
  year: 2024
};

console.log('Is song6 new (14 days)?', isNewSong(song6, { recentDays: 14 })); // true
console.log('Is song6 new (7 days)?', isNewSong(song6, { recentDays: 7 })); // false

// Example 7: Filtering an array of songs
const songs: Array<{ releaseDate?: string; year?: number }> = [
  { releaseDate: '2025-01-15T00:00:00.000Z', year: 2025 },
  { releaseDate: '2024-06-15T00:00:00.000Z', year: 2024 },
  { releaseDate: '2025-02-01T00:00:00.000Z', year: 2025 },
  { releaseDate: '2023-12-15T00:00:00.000Z', year: 2023 },
];

const newSongs = songs.filter(song => isNewSong(song));
console.log('New songs count:', newSongs.length); // 2 (only 2025 songs)

// Example 8: Using in React component
/*
import { isNewSong } from '@/utils/isNewSong';

function SongCard({ song }: { song: Song }) {
  return (
    <div className="song-card">
      <img src={song.image} alt={song.name} />
      
      {isNewSong(song) && (
        <div className="new-badge">NEW</div>
      )}
      
      <h3>{song.name}</h3>
      <p>{song.primaryArtists}</p>
    </div>
  );
}
*/

// Example 9: Handling edge cases
console.log('Null song:', isNewSong(null)); // false
console.log('Undefined song:', isNewSong(undefined)); // false
console.log('Empty object:', isNewSong({})); // false
console.log('Invalid date:', isNewSong({ releaseDate: 'invalid', year: null })); // false

// Example 10: Testing with fixed date (useful for unit tests)
const testDate = new Date('2025-01-15').getTime();
const testSong = {
  releaseDate: '2025-01-10T00:00:00.000Z',
  year: 2025
};

console.log('Test with fixed date:', isNewSong(testSong, { now: testDate })); // true
