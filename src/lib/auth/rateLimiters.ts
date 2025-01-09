import { setInterval } from 'node:timers';
import { RateLimiter } from './rateLimit';

export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

// Example: Periodic cleanup every hour
setInterval(() => {
  loginRateLimiter.cleanupStaleEntries();
}, 60 * 60 * 1000);