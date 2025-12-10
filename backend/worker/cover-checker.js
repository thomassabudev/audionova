const axios = require('axios');
const { Pool } = require('pg');
const sharp = require('sharp');
const imghash = require('imghash');
const cron = require('node-cron');
require('dotenv').config();

// Configuration
const POLL_LIMIT = 500;
const GENERIC_HASH_DISTANCE_THRESHOLD = 8;
const API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

// Known generic/placeholder hashes (example values, should be populated with real ones)
const GENERIC_HASHES = [
    '0000000000000000', // All black
    'ffffffffffffffff', // All white
    // Add more known generic hashes here
];

// Heuristic checks
function failsHeuristic(song, coverUrl) {
    if (!coverUrl) return 'missing_url';

    const lowerUrl = String(coverUrl).toLowerCase();
    if (lowerUrl.includes('placeholder') ||
        lowerUrl.includes('default') ||
        lowerUrl.includes('no-image')) {
        return 'placeholder_pattern';
    }

    // Check for specific domains or patterns if needed
    return null;
}

async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            maxContentLength: 2 * 1024 * 1024 // 2MB limit
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to download image ${url}:`, error.message);
        return null;
    }
}

function hammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    return distance;
}

async function checkCover(song) {
    let coverUrl = null;
    if (Array.isArray(song.image)) {
        coverUrl = song.image[2]?.link || song.image[1]?.link || song.image[0]?.link;
    } else if (typeof song.image === 'string') {
        coverUrl = song.image;
    }

    // 1. Heuristic Filter
    const heuristicFailReason = failsHeuristic(song, coverUrl);
    if (heuristicFailReason) {
        return { verified: false, reason: heuristicFailReason, method: 'heuristic' };
    }

    // 2. Download and pHash
    const imageBuffer = await downloadImage(coverUrl);
    if (!imageBuffer) {
        return { verified: false, reason: 'download_failed', method: 'network' };
    }

    try {
        // Resize and ensure format for consistent hashing
        const processedBuffer = await sharp(imageBuffer)
            .resize(256, 256, { fit: 'fill' })
            .grayscale()
            .toBuffer();

        const phash = await imghash.hash(processedBuffer);

        // 3. Check against generic hashes
        for (const genericHash of GENERIC_HASHES) {
            if (hammingDistance(phash, genericHash) <= GENERIC_HASH_DISTANCE_THRESHOLD) {
                return {
                    verified: false,
                    reason: 'generic_match',
                    method: 'phash',
                    phash,
                    matchedGeneric: genericHash
                };
            }
        }

        // If passed all checks
        return {
            verified: true,
            reason: 'passed_checks',
            method: 'phash',
            phash
        };

    } catch (error) {
        console.error(`Error processing image for song ${song.id}:`, error.message);
        return { verified: false, reason: 'processing_error', method: 'internal' };
    }
}

async function updateSongStatus(songId, result, coverUrl) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update cover_checks
        if (result.phash) {
            await client.query(`
        INSERT INTO cover_checks (song_id, cover_url, phash, checked_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (song_id) 
        DO UPDATE SET cover_url = $2, phash = $3, checked_at = NOW()
      `, [songId, coverUrl, result.phash]);
        }

        // Update badges
        await client.query(`
      INSERT INTO badges (song_id, cover_verified, cover_check_meta, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (song_id)
      DO UPDATE SET cover_verified = $2, cover_check_meta = $3, updated_at = NOW()
    `, [songId, result.verified, JSON.stringify({
            method: result.method,
            reason: result.reason,
            phash: result.phash
        })]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to update DB for song ${songId}:`, error.message);
    } finally {
        client.release();
    }
}

async function fetchCandidates() {
    // Fetch trending candidates from same sources as trending.js
    // For simplicity, we'll fetch a mix of languages
    const queries = [
        'malayalam latest songs 2025',
        'tamil latest songs 2025',
        'hindi latest songs 2025',
        'english latest songs 2025'
    ];

    let allSongs = [];
    for (const query of queries) {
        try {
            const res = await axios.get(`${API_BASE_URL}/search/songs`, {
                params: { query, limit: 50 }
            });
            if (res.data?.data?.results) {
                allSongs = allSongs.concat(res.data.data.results);
            }
        } catch (err) {
            console.error(`Failed to fetch candidates for ${query}:`, err.message);
        }
    }
    return allSongs;
}

async function runWorker() {
    console.log('Starting cover verification worker...');
    const songs = await fetchCandidates();
    console.log(`Fetched ${songs.length} candidates.`);

    for (const song of songs) {
        // Check if already verified recently? (Optimization)
        // For now, we'll just process. In production, check DB first.

        const result = await checkCover(song);
        const coverUrl = song.image?.[2]?.link || song.image?.[1]?.link || song.image?.[0]?.link || song.image;

        await updateSongStatus(song.id, result, coverUrl);
        console.log(`Processed ${song.id}: verified=${result.verified} (${result.reason})`);

        // Rate limiting / nice
        await new Promise(r => setTimeout(r, 200));
    }
    console.log('Worker finished run.');
}

// Schedule
cron.schedule('*/30 * * * *', runWorker);

// Run immediately if called directly
if (require.main === module) {
    runWorker();
}

module.exports = { runWorker, checkCover };
