const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic');
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to database successfully');
    
    // Check if songs table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'songs'
      );
    `);
    
    console.log('Songs table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get count of songs by language
      const countResult = await client.query(`
        SELECT COUNT(*), language 
        FROM songs 
        WHERE featured = true 
        GROUP BY language 
        ORDER BY language
      `);
      
      console.log('Songs by language:', countResult.rows);
      
      // Get total count
      const totalResult = await client.query('SELECT COUNT(*) FROM songs WHERE featured = true');
      console.log('Total featured songs:', totalResult.rows[0].count);
      
      // Get a sample of songs
      const sampleResult = await client.query(`
        SELECT id, title, artists, album, language, release_date 
        FROM songs 
        WHERE featured = true 
        ORDER BY release_date DESC 
        LIMIT 10
      `);
      
      console.log('Sample songs:', sampleResult.rows);
    }
    
    client.release();
  } catch (error) {
    console.error('Database test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testDatabase();