/**
 * Start cover verification worker process
 * Run: node scripts/start-cover-verification-worker.js
 */

require('dotenv').config();
const { startWorker } = require('../worker/coverVerificationWorker');

console.log('='.repeat(60));
console.log('Cover Verification Worker');
console.log('='.repeat(60));
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Database:', process.env.DATABASE_URL ? 'Connected' : 'Not configured');
console.log('Concurrency:', process.env.VERIFICATION_CONCURRENCY || 3);
console.log('='.repeat(60));

startWorker().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
