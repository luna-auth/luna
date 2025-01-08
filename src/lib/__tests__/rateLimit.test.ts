import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../rateLimit';

describe('RateLimiter', () => {
  const INITIAL_TIME = new Date('3024-01-01').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    // Set initial time to future
    vi.setSystemTime(INITIAL_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first attempt', () => {
    // Setup: create limiter with 3 attempts per 15 minutes
    const limiter = new RateLimiter(3, 15 * 60 * 1000);

    // Test: check if first attempt is allowed
    const isAllowed = limiter.isAllowed('test-key');

    // Assert: should be allowed
    expect(isAllowed).toBe(true);
  });

  it('should block after max attempts', () => {
    // Setup: create limiter with 3 attempts
    const limiter = new RateLimiter(3, 15 * 60 * 1000);
    const key = 'test-key-2';

    // Test: make 3 attempts (should be allowed)
    expect(limiter.isAllowed(key)).toBe(true); // 1st attempt
    expect(limiter.isAllowed(key)).toBe(true); // 2nd attempt
    expect(limiter.isAllowed(key)).toBe(true); // 3rd attempt

    // Test: 4th attempt should be blocked
    expect(limiter.isAllowed(key)).toBe(false);
  });

  it('should track different keys separately', () => {
    // Setup: create limiter with 2 attempts
    const limiter = new RateLimiter(2, 15 * 60 * 1000);

    // Block first key
    const key1 = 'user1';
    expect(limiter.isAllowed(key1)).toBe(true); // 1st attempt
    expect(limiter.isAllowed(key1)).toBe(true); // 2nd attempt
    expect(limiter.isAllowed(key1)).toBe(false); // blocked

    // Second key should still work
    const key2 = 'user2';
    expect(limiter.isAllowed(key2)).toBe(true); // 1st attempt
    expect(limiter.isAllowed(key2)).toBe(true); // 2nd attempt
  });

  it('should reset after window time passes', () => {
    // Setup: create limiter with 2 attempts per minute
    const windowMs = 60 * 1000; // 1 minute
    const limiter = new RateLimiter(2, windowMs);
    const key = 'test-key-3';

    // Use up all attempts
    expect(limiter.isAllowed(key)).toBe(true); // 1st attempt
    expect(limiter.isAllowed(key)).toBe(true); // 2nd attempt
    expect(limiter.isAllowed(key)).toBe(false); // blocked

    // Advance time by window duration
    vi.setSystemTime(INITIAL_TIME + windowMs + 1000); // Add 1 second extra to be safe

    // Should be allowed again
    expect(limiter.isAllowed(key)).toBe(true); // 1st attempt after reset
  });

  it('should correctly count remaining attempts', () => {
    // Setup: create limiter with 3 attempts
    const limiter = new RateLimiter(3, 60 * 1000);
    const key = 'test-key-4';

    // Should start with max attempts
    expect(limiter.getRemainingAttempts(key)).toBe(3);

    // Should decrease with each attempt
    limiter.isAllowed(key);
    expect(limiter.getRemainingAttempts(key)).toBe(2);

    limiter.isAllowed(key);
    expect(limiter.getRemainingAttempts(key)).toBe(1);

    limiter.isAllowed(key);
    expect(limiter.getRemainingAttempts(key)).toBe(0);
  });

  it('should return correct remaining time', () => {
    // Setup: create limiter with 2 attempts per minute
    const windowMs = 60 * 1000; // 1 minute
    const limiter = new RateLimiter(2, windowMs);
    const key = 'test-key-5';

    // Should return null when no attempts made
    expect(limiter.getRemainingTime(key)).toBe(null);

    // Make first attempt and check remaining time
    limiter.isAllowed(key);
    const remaining = limiter.getRemainingTime(key);

    expect(remaining).toBeDefined();
    expect(remaining).toBeLessThanOrEqual(windowMs);
    expect(remaining).toBeGreaterThan(0);

    // Advance time and check if remaining time decreases
    vi.setSystemTime(INITIAL_TIME + 30 * 1000); // Advance 30 seconds
    const newRemaining = limiter.getRemainingTime(key);
    expect(newRemaining).toBeLessThan(remaining!);
  });
});
