/**
 * Initialize cover verification database tables
 * Run: node scripts/init-cover-verification-db.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

async function initDatabase() {
  console.log('[Init] Starting database initialization...');
  
  const client = await pool.connect();
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../db/migrations/001_create_song_cover_map.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('[Init] Running migration...');
    await client.query(migrationSQL);
    
    console.log('[Init] ✓ Tables created successfully');
    
    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('song_cover_map', 'cover_verification_logs', 'wrong_cover_reports')
    `);
    
    console.log('[Init] ✓ Verified tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('song_cover_map', 'cover_verification_logs', 'wrong_cover_reports')
    `);
    
    console.log('[Init] ✓ Created indexes:', indexes.rows.length);
    
    console.log('[Init] Database initialization complete!');
  } catch (error) {
    console.error('[Init] Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('[Init] Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Init] Failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
