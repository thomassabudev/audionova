/**
 * API Rate Limiting Utilities
 * Helps manage API calls to avoid hitting rate limits
 */

interface RateLimitInfo {
  lastCall: number;
  callCount: number;
  resetTime: number;
}

class RateLimitManager {
  private limits: Map<string, RateLimitInfo> = new Map();
  private readonly DEFAULT_DELAY = 500; // 500ms between calls
  private readonly MAX_CALLS_PER_MINUTE = 60;
  private readonly RESET_INTERVAL = 60 * 1000; // 1 minute

  /**
   * Check if we should delay the next API call
   */
  shouldDelay(endpoint: string): number {
    const now = Date.now();
    const info = this.limits.get(endpoint);

    if (!info) {
      // First call to this endpoint
      this.limits.set(endpoint, {
        lastCall: now,
        callCount: 1,
        resetTime: now + this.RESET_INTERVAL
      });
      return 0;
    }

    // Reset counter if reset time has passed
    if (now > info.resetTime) {
      info.callCount = 1;
      info.resetTime = now + this.RESET_INTERVAL;
      info.lastCall = now;
      return 0;
    }

    // Check if we're hitting rate limits
    if (info.callCount >= this.MAX_CALLS_PER_MINUTE) {
      const waitTime = info.resetTime - now;
      console.warn(`[RateLimit] Rate limit reached for ${endpoint}, waiting ${waitTime}ms`);
      return waitTime;
    }

    // Calculate delay based on recent calls
    const timeSinceLastCall = now - info.lastCall;
    const suggestedDelay = Math.max(0, this.DEFAULT_DELAY - timeSinceLastCall);

    // Update info
    info.callCount++;
    info.lastCall = now;

    return suggestedDelay;
  }

  /**
   * Record a failed API call (e.g., 403 rate limit)
   */
  recordFailure(endpoint: string, statusCode: number): void {
    if (statusCode === 403) {
      const info = this.limits.get(endpoint);
      if (info) {
        // Extend reset time for rate limit failures
        info.resetTime = Date.now() + (this.RESET_INTERVAL * 2);
        info.callCount = this.MAX_CALLS_PER_MINUTE; // Mark as rate limited
        console.warn(`[RateLimit] Rate limit failure recorded for ${endpoint}`);
      }
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(endpoint: string): { callCount: number; timeUntilReset: number; isLimited: boolean } {
    const info = this.limits.get(endpoint);
    if (!info) {
      return { callCount: 0, timeUntilReset: 0, isLimited: false };
    }

    const now = Date.now();
    const timeUntilReset = Math.max(0, info.resetTime - now);
    const isLimited = info.callCount >= this.MAX_CALLS_PER_MINUTE && timeUntilReset > 0;

    return {
      callCount: info.callCount,
      timeUntilReset,
      isLimited
    };
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.limits.clear();
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();

/**
 * Wrapper function to make rate-limited API calls
 */
export async function makeRateLimitedCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  }
): Promise<T> {
  const { maxRetries = 2, retryDelay = 1000 } = options || {};
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we should delay
      const delay = rateLimitManager.shouldDelay(endpoint);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Make the API call
      const result = await apiCall();
      return result;
    } catch (error: any) {
      // Record the failure
      if (error?.response?.status) {
        rateLimitManager.recordFailure(endpoint, error.response.status);
      }

      // If it's a rate limit error and we have retries left, wait and retry
      if (error?.response?.status === 403 && attempt < maxRetries) {
        const waitTime = retryDelay * (attempt + 1);
        console.warn(`[RateLimit] Rate limited, retrying ${endpoint} in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Re-throw the error if we can't handle it or out of retries
      throw error;
    }
  }

  throw new Error(`Failed to complete ${endpoint} after ${maxRetries} retries`);
}