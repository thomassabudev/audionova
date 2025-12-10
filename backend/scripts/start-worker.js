#!/usr/bin/env node

// Script to start the new releases fetcher worker
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('Starting new releases fetcher worker...');

// Import and start the fetcher
const { fetchAndProcessReleases } = require('../worker/fetcher');

// Run immediately and then schedule
fetchAndProcessReleases().then(() => {
  console.log('Initial fetch completed');
}).catch((error) => {
  console.error('Initial fetch failed:', error);
});

console.log('Worker started. Will run every 10 minutes.');