/**
 * Cover Verification Worker
 * Processes cover verification jobs asynchronously using a queue
 */

const { Pool } = require('pg');
const { fetchCoverForSong } = require('../services/coverVerificationService');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

// Simple in-memory queue (in production, use Redis/Bull)
class VerificationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.concurrency = parseInt(process.env.VERIFICATION_CONCURRENCY) || 3;
    this.activeWorkers = 0;
  }
  
  async add(job) {
    this.queue.push(job);
    console.log(`[VerificationQueue] Job added. Queue size: ${this.queue.length}`);
    
    if (!this.processing) {
      this.start();
    }
  }
  
  async start() {
    if (this.processing) return;
    
    this.processing = true;
    console.log('[VerificationQueue] Starting workers...');
    
    // Start concurrent workers
    const workers = [];
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.worker(i + 1));
    }
    
    await Promise.all(workers);
    
    this.processing = false;
    console.log('[VerificationQueue] All workers finished');
  }
  
  async worker(workerId) {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      
      if (!job) break;
      
      this.activeWorkers++;
      console.log(`[Worker ${workerId}] Processing job for: ${job.title} - ${job.artist}`);
      
      try {
        await this.processJob(job);
        console.log(`[Worker ${workerId}] ✓ Job completed`);
      } catch (error) {
        console.error(`[Worker ${workerId}] ✗ Job failed:`, error.message);
      }
      
      this.activeWorkers--;
      
      // Rate limiting between jobs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  async processJob(job) {
    const { song_id, title, artist, language, album, callback_url } = job;
    
    const client = await pool.connect();
    
    try {
      // Check if already verified
      const existing = await client.query(
        `SELECT * FROM song_cover_map 
         WHERE song_id = $1 
         AND (manual_override = true OR verified_at > NOW() - INTERVAL '30 days')`,
        [song_id]
      );
      
      if (existing.rows.length > 0) {
        console.log(`[VerificationQueue] Song ${song_id} already verified, skipping`);
        return;
      }
      
      // Perform verification
      const queryMeta = { title, artist, language, album };
      const result = await fetchCoverForSong(queryMeta);
      
      // Log verification attempt
      await client.query(
        `INSERT INTO cover_verification_logs 
         (song_id, query_title, query_artist, query_language, query_album, 
          chosen_source, chosen_candidate_id, similarity_scores, verification_time_ms, success, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          result.song_id || song_id,
          title,
          artist,
          language,
          album,
          result.source,
          result.song_id,
          JSON.stringify(result.similarity_scores || {}),
          result.verification_time_ms,
          result.verified,
          result.error || null,
        ]
      );
      
      // If verified, upsert into song_cover_map
      if (result.verified && result.song_id) {
        await client.query(
          `INSERT INTO song_cover_map 
           (song_id, title, artist, language, album, cover_url, source, similarity_scores, metadata, verified_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (song_id) 
           DO UPDATE SET
             cover_url = EXCLUDED.cover_url,
             source = EXCLUDED.source,
             similarity_scores = EXCLUDED.similarity_scores,
             metadata = EXCLUDED.metadata,
             verified_at = NOW()
           WHERE song_cover_map.manual_override = false`,
          [
            result.song_id,
            result.metadata?.title || title,
            result.metadata?.artist || artist,
            result.metadata?.language || language,
            result.metadata?.album || album,
            result.cover_url,
            result.source,
            JSON.stringify(result.similarity_scores || {}),
            JSON.stringify(result.metadata || {}),
          ]
        );
        
        console.log(`[VerificationQueue] ✓ Verified and stored: ${result.song_id} (${result.source})`);
      } else {
        console.log(`[VerificationQueue] ✗ Verification failed for: ${title} - ${artist}`);
      }
      
      // If callback URL provided, notify (webhook)
      if (callback_url && result.verified) {
        try {
          const axios = require('axios');
          await axios.post(callback_url, {
            song_id: result.song_id,
            cover_url: result.cover_url,
            source: result.source,
            verified: true,
          }, { timeout: 5000 });
        } catch (callbackError) {
          console.error('[VerificationQueue] Callback failed:', callbackError.message);
        }
      }
    } finally {
      client.release();
    }
  }
  
  getStatus() {
    return {
      queue_size: this.queue.length,
      active_workers: this.activeWorkers,
      processing: this.processing,
    };
  }
}

// Singleton instance
const verificationQueue = new VerificationQueue();

/**
 * Add job to verification queue
 */
function queueVerification(job) {
  return verificationQueue.add(job);
}

/**
 * Get queue status
 */
function getQueueStatus() {
  return verificationQueue.getStatus();
}

/**
 * Batch queue multiple songs
 */
async function queueBatch(songs) {
  const promises = songs.map(song => verificationQueue.add(song));
  await Promise.all(promises);
  
  return {
    queued: songs.length,
    queue_size: verificationQueue.queue.length,
  };
}

/**
 * Start worker (for standalone worker process)
 */
async function startWorker() {
  console.log('[CoverVerificationWorker] Starting...');
  console.log(`[CoverVerificationWorker] Concurrency: ${verificationQueue.concurrency}`);
  
  // Keep process alive
  setInterval(() => {
    const status = verificationQueue.getStatus();
    console.log('[CoverVerificationWorker] Status:', status);
  }, 30000);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[CoverVerificationWorker] Shutting down gracefully...');
    
    // Wait for active jobs to complete
    while (verificationQueue.activeWorkers > 0) {
      console.log(`[CoverVerificationWorker] Waiting for ${verificationQueue.activeWorkers} active jobs...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await pool.end();
    process.exit(0);
  });
}

module.exports = {
  queueVerification,
  queueBatch,
  getQueueStatus,
  startWorker,
  verificationQueue,
};
