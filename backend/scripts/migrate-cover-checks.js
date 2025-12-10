const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating cover_checks table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS cover_checks (
        song_id TEXT PRIMARY KEY,
        cover_url TEXT,
        phash TEXT,
        width INTEGER,
        height INTEGER,
        is_generic BOOLEAN DEFAULT false,
        checked_at TIMESTAMP DEFAULT NOW()
      );
    `);

        console.log('Creating badges table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS badges (
        song_id TEXT PRIMARY KEY,
        badge TEXT,
        cover_verified BOOLEAN DEFAULT false,
        cover_check_meta JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        console.log('Adding indexes...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cover_checks_phash ON cover_checks(phash);
      CREATE INDEX IF NOT EXISTS idx_badges_cover_verified ON badges(cover_verified);
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
