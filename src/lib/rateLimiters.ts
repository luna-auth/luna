import { RateLimiter } from './rateLimit';

// 5 attempts within 15 minutes
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

// 3 attempts within 30 minutes - bardziej restrykcyjne dla rejestracji
export const registerRateLimiter = new RateLimiter(3, 30 * 60 * 1000); 