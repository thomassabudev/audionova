-- Migration: Create song_cover_map table for canonical cover art verification
-- Version: 001
-- Date: 2025-12-05

-- Create song_cover_map table
CREATE TABLE IF NOT EXISTS song_cover_map (
  song_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  language TEXT,
  album TEXT,
  cover_url TEXT,
  source TEXT NOT NULL CHECK (source IN ('saavn', 'itunes', 'musicbrainz', 'spotify', 'manual')),
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  manual_override BOOLEAN DEFAULT FALSE,
  admin_user_id TEXT,
  override_reason TEXT,
  similarity_scores JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_song_cover_map_title ON song_cover_map(title);
CREATE INDEX IF NOT EXISTS idx_song_cover_map_artist ON song_cover_map(artist);
CREATE INDEX IF NOT EXISTS idx_song_cover_map_language ON song_cover_map(language);
CREATE INDEX IF NOT EXISTS idx_song_cover_map_source ON song_cover_map(source);
CREATE INDEX IF NOT EXISTS idx_song_cover_map_manual_override ON song_cover_map(manual_override);
CREATE INDEX IF NOT EXISTS idx_song_cover_map_verified_at ON song_cover_map(verified_at);

-- Create cover_verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS cover_verification_logs (
  id SERIAL PRIMARY KEY,
  song_id TEXT,
  query_title TEXT NOT NULL,
  query_artist TEXT NOT NULL,
  query_language TEXT,
  query_album TEXT,
  chosen_source TEXT,
  chosen_candidate_id TEXT,
  similarity_scores JSONB,
  image_validation_result JSONB,
  verification_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on logs
CREATE INDEX IF NOT EXISTS idx_cover_verification_logs_song_id ON cover_verification_logs(song_id);
CREATE INDEX IF NOT EXISTS idx_cover_verification_logs_created_at ON cover_verification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cover_verification_logs_success ON cover_verification_logs(success);

-- Create wrong_cover_reports table for user feedback
CREATE TABLE IF NOT EXISTS wrong_cover_reports (
  id SERIAL PRIMARY KEY,
  song_id TEXT NOT NULL,
  displayed_cover_url TEXT NOT NULL,
  correct_hint TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'fixed', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on reports
CREATE INDEX IF NOT EXISTS idx_wrong_cover_reports_song_id ON wrong_cover_reports(song_id);
CREATE INDEX IF NOT EXISTS idx_wrong_cover_reports_status ON wrong_cover_reports(status);
CREATE INDEX IF NOT EXISTS idx_wrong_cover_reports_created_at ON wrong_cover_reports(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_song_cover_map_updated_at
  BEFORE UPDATE ON song_cover_map
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wrong_cover_reports_updated_at
  BEFORE UPDATE ON wrong_cover_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for cover verification statistics
CREATE OR REPLACE VIEW cover_verification_stats AS
SELECT
  source,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE manual_override = false) as auto_verified,
  COUNT(*) FILTER (WHERE manual_override = true) as manual_overrides,
  AVG((similarity_scores->>'title')::float) as avg_title_similarity,
  AVG((similarity_scores->>'artist')::float) as avg_artist_similarity,
  MIN(verified_at) as first_verification,
  MAX(verified_at) as last_verification
FROM song_cover_map
GROUP BY source;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON song_cover_map TO your_app_user;
-- GRANT SELECT, INSERT ON cover_verification_logs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON wrong_cover_reports TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE cover_verification_logs_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE wrong_cover_reports_id_seq TO your_app_user;

-- Add comments for documentation
COMMENT ON TABLE song_cover_map IS 'Canonical mapping of songs to verified cover art URLs';
COMMENT ON COLUMN song_cover_map.song_id IS 'Canonical song ID from source (e.g., saavn_12345, itunes_67890)';
COMMENT ON COLUMN song_cover_map.manual_override IS 'True if cover was manually set by admin, prevents auto re-verification';
COMMENT ON COLUMN song_cover_map.similarity_scores IS 'JSON object with title, artist, album similarity scores';
COMMENT ON TABLE cover_verification_logs IS 'Audit log of all cover verification attempts';
COMMENT ON TABLE wrong_cover_reports IS 'User-reported incorrect cover art for manual review';
