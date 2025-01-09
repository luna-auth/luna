import { setInterval } from 'node:timers';
import { RateLimiter } from './rateLimit';

// More lenient rate limiting for development
// 10 attempts within 1 minute
export const loginRateLimiter = new RateLimiter(10, 60 * 1000);

// Example: Periodic cleanup every hour
setInterval(() => {
  loginRateLimiter.cleanupStaleEntries();
}, 60 * 60 * 1000);