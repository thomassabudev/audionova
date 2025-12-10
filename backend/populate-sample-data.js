// Script to populate the database with sample multi-language data
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

// Sample songs data for different languages
const sampleSongs = [
  // Malayalam songs
  {
    external_id: 'ml001',
    title: 'Malayalam Song 1',
    artists: 'Malayalam Artist 1',
    album: 'Malayalam Album 1',
    release_date: new Date('2024-10-15'),
    language: 'ml',
    featured: true
  },
  {
    external_id: 'ml002',
    title: 'Malayalam Song 2',
    artists: 'Malayalam Artist 2',
    album: 'Malayalam Album 2',
    release_date: new Date('2024-10-10'),
    language: 'ml',
    featured: true
  },
  {
    external_id: 'ml003',
    title: 'Malayalam Song 3',
    artists: 'Malayalam Artist 3',
    album: 'Malayalam Album 3',
    release_date: new Date('2024-10-05'),
    language: 'ml',
    featured: true
  },
  
  // Hindi songs
  {
    external_id: 'hi001',
    title: 'Hindi Song 1',
    artists: 'Hindi Artist 1',
    album: 'Hindi Album 1',
    release_date: new Date('2024-10-12'),
    language: 'hi',
    featured: true
  },
  {
    external_id: 'hi002',
    title: 'Hindi Song 2',
    artists: 'Hindi Artist 2',
    album: 'Hindi Album 2',
    release_date: new Date('2024-10-08'),
    language: 'hi',
    featured: true
  },
  {
    external_id: 'hi003',
    title: 'Hindi Song 3',
    artists: 'Hindi Artist 3',
    album: 'Hindi Album 3',
    release_date: new Date('2024-10-03'),
    language: 'hi',
    featured: true
  },
  
  // Tamil songs
  {
    external_id: 'ta001',
    title: 'Tamil Song 1',
    artists: 'Tamil Artist 1',
    album: 'Tamil Album 1',
    release_date: new Date('2024-10-14'),
    language: 'ta',
    featured: true
  },
  {
    external_id: 'ta002',
    title: 'Tamil Song 2',
    artists: 'Tamil Artist 2',
    album: 'Tamil Album 2',
    release_date: new Date('2024-10-09'),
    language: 'ta',
    featured: true
  },
  {
    external_id: 'ta003',
    title: 'Tamil Song 3',
    artists: 'Tamil Artist 3',
    album: 'Tamil Album 3',
    release_date: new Date('2024-10-04'),
    language: 'ta',
    featured: true
  }
];

async function populateSampleData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert sample songs
    for (const song of sampleSongs) {
      await client.query(
        `INSERT INTO songs (external_id, title, artists, album, release_date, language, featured, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (external_id) DO UPDATE
         SET title = $2, artists = $3, album = $4, release_date = $5, language = $6, featured = $7, metadata = $8`,
        [
          song.external_id,
          song.title,
          song.artists,
          song.album,
          song.release_date,
          song.language,
          song.featured,
          JSON.stringify({ image: [] }) // Sample metadata
        ]
      );
    }
    
    await client.query('COMMIT');
    console.log('Sample data populated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error populating sample data:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

populateSampleData();