// Type for a single rate limit attempt
type Attempt = {
  count: number;
  lastAttempt: number;
};

// Type for storing all rate limit attempts
type AttemptsMap = Map<string, Attempt>;

export type { Attempt, AttemptsMap };

export class RateLimiter {
  private attempts: AttemptsMap = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs; // milliseconds
  }

  isAllowed(key: string): boolean {
    const attempt = this.attempts.get(key);
    const currentTime = Date.now();

    // If no previous attempts or window has passed, start fresh
    if (!attempt || currentTime - attempt.lastAttempt > this.windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: currentTime });
      return true;
    }

    // If within window and under limit, increment
    if (attempt.count < this.maxAttempts) {
      attempt.count += 1;
      attempt.lastAttempt = currentTime;
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  // Get remaining time until rate limit reset (in milliseconds)
  getRemainingTime(key: string): number | null {
    const attempt = this.attempts.get(key);
    if (!attempt) return null;

    const timePassed = Date.now() - attempt.lastAttempt;
    return Math.max(0, this.windowMs - timePassed);
  }

  // Get number of remaining attempts
  getRemainingAttempts(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt) return this.maxAttempts;

    if (Date.now() - attempt.lastAttempt > this.windowMs) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - attempt.count);
  }

  // Cleanup expired rate limit entries
  cleanupStaleEntries(): void {
    const currentTime = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (currentTime - attempt.lastAttempt > this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }
}
