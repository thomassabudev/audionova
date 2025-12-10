/**
 * Image validation utilities for cover art verification
 */

const axios = require('axios');

/**
 * Validate image URL by checking HTTP response and content-type
 * @param {string} url - Image URL to validate
 * @param {number} timeout - Request timeout in ms (default: 5000)
 * @returns {Promise<{valid: boolean, contentType?: string, error?: string}>}
 */
async function validateImageUrl(url, timeout = 5000) {
  if (!url) {
    return { valid: false, error: 'No URL provided' };
  }
  
  try {
    // Try HEAD request first (faster)
    try {
      const headResponse = await axios.head(url, {
        timeout,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      
      const contentType = headResponse.headers['content-type'] || '';
      
      if (contentType.startsWith('image/')) {
        return { valid: true, contentType };
      } else {
        return { valid: false, error: `Invalid content-type: ${contentType}` };
      }
    } catch (headError) {
      // If HEAD fails, try GET with range request (first 1KB)
      const getResponse = await axios.get(url, {
        timeout,
        responseType: 'arraybuffer',
        headers: {
          'Range': 'bytes=0-1023',
        },
        validateStatus: (status) => (status >= 200 && status < 300) || status === 206,
      });
      
      const contentType = getResponse.headers['content-type'] || '';
      
      if (contentType.startsWith('image/')) {
        return { valid: true, contentType };
      } else {
        return { valid: false, error: `Invalid content-type: ${contentType}` };
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error.response?.status === 404 
        ? 'Image not found (404)' 
        : `Request failed: ${error.message}`,
    };
  }
}

/**
 * Batch validate multiple image URLs
 * @param {string[]} urls - Array of image URLs
 * @param {number} concurrency - Max concurrent requests (default: 5)
 * @returns {Promise<Map<string, {valid: boolean, contentType?: string, error?: string}>>}
 */
async function batchValidateImages(urls, concurrency = 5) {
  const results = new Map();
  const queue = [...urls];
  
  async function processNext() {
    if (queue.length === 0) return;
    
    const url = queue.shift();
    const result = await validateImageUrl(url);
    results.set(url, result);
    
    if (queue.length > 0) {
      await processNext();
    }
  }
  
  // Start concurrent workers
  const workers = Array(Math.min(concurrency, urls.length))
    .fill(null)
    .map(() => processNext());
  
  await Promise.all(workers);
  
  return results;
}

module.exports = {
  validateImageUrl,
  batchValidateImages,
};
