-- Database Schema for Real-Time New Releases System

-- Table: songs
CREATE TABLE IF NOT EXISTS songs (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    title TEXT,
    artists TEXT,
    album TEXT,
    release_date TIMESTAMP,
    metadata JSONB,
    fingerprint TEXT,
    featured BOOLEAN DEFAULT false,
    language TEXT, -- Added language field
    added_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_external_id ON songs(external_id);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
CREATE INDEX IF NOT EXISTS idx_songs_release_date ON songs(release_date);
CREATE INDEX IF NOT EXISTS idx_songs_featured ON songs(featured);
CREATE INDEX IF NOT EXISTS idx_songs_fingerprint ON songs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language); -- Added language index

-- Table: new_release_events
CREATE TABLE IF NOT EXISTS new_release_events (
    id BIGSERIAL PRIMARY KEY,
    song_id BIGINT REFERENCES songs(id),
    detected_at TIMESTAMP DEFAULT now(),
    notified BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_new_release_events_song_id ON new_release_events(song_id);
CREATE INDEX IF NOT EXISTS idx_new_release_events_detected_at ON new_release_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_new_release_events_notified ON new_release_events(notified);

-- Table: rate_limit_tokens (for token bucket algorithm)
CREATE TABLE IF NOT EXISTS rate_limit_tokens (
    id SERIAL PRIMARY KEY,
    service_name TEXT UNIQUE,
    tokens INTEGER DEFAULT 1000,
    last_refill TIMESTAMP DEFAULT now(),
    max_tokens INTEGER DEFAULT 1000,
    refill_rate INTEGER DEFAULT 1000, -- tokens per day
    refill_interval INTERVAL DEFAULT '1 day'
);

-- Insert initial rate limit record for JioSaavn
INSERT INTO rate_limit_tokens (service_name, tokens, max_tokens, refill_rate, refill_interval)
VALUES ('jiosaavn', 1000, 1000, 1000, '1 day')
ON CONFLICT (service_name) DO NOTHING;

-- Insert sample data for testing
INSERT INTO songs (external_id, title, artists, album, release_date, language, featured, metadata) VALUES
('ml001', 'Malayalam Song 1', 'Malayalam Artist 1', 'Malayalam Album 1', '2024-10-15', 'ml', true, '{"image": []}'),
('ml002', 'Malayalam Song 2', 'Malayalam Artist 2', 'Malayalam Album 2', '2024-10-10', 'ml', true, '{"image": []}'),
('hi001', 'Hindi Song 1', 'Hindi Artist 1', 'Hindi Album 1', '2024-10-12', 'hi', true, '{"image": []}'),
('hi002', 'Hindi Song 2', 'Hindi Artist 2', 'Hindi Album 2', '2024-10-08', 'hi', true, '{"image": []}'),
('ta001', 'Tamil Song 1', 'Tamil Artist 1', 'Tamil Album 1', '2024-10-14', 'ta', true, '{"image": []}'),
('ta002', 'Tamil Song 2', 'Tamil Artist 2', 'Tamil Album 2', '2024-10-09', 'ta', true, '{"image": []}')
ON CONFLICT (external_id) DO NOTHING;