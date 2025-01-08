import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
  setSessionCookie,
  deleteSessionCookie,
} from '../session';
import { createTestDb } from '../../db/testDb';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import type { ActionAPIContext } from 'astro:actions';
import type { AstroCookies } from 'astro';

// Define MockCookies as a type alias
type MockCookies = {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  has: ReturnType<typeof vi.fn>;
  headers: () => Generator<string, void, unknown>;
  merge: ReturnType<typeof vi.fn>;
};

interface MockContext extends Partial<ActionAPIContext> {
  cookies?: AstroCookies & MockCookies;
}

describe('Session Management', () => {
  const INITIAL_TIME = new Date('3024-01-01').getTime();
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(INITIAL_TIME);

    // Fresh database for each test
    testDb = createTestDb();
    await testDb.init();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await testDb.close();
  });

  describe('generateSessionToken', () => {
    it('should generate a valid session token', () => {
      const token = generateSessionToken();

      // Token should be a string
      expect(typeof token).toBe('string');

      // Token should be long enough (at least 32 chars)
      expect(token.length).toBeGreaterThanOrEqual(32);

      // Tokens should be unique
      const token2 = generateSessionToken();
      expect(token).not.toBe(token2);
    });
  });

  describe('Session Operations', () => {
    it('should create and validate session', async () => {
      // Create a test user first
      const result = await testDb.client.execute({
        sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        args: ['test@test.com', 'hash123'],
      });
      const userId = Number(result.lastInsertRowid);

      // Create session
      const token = generateSessionToken();
      const session = await createSession(token, userId, testDb.db);

      // Session ID is hashed token
      const expectedSessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
      expect(session.id).toBe(expectedSessionId);
      expect(session.userId).toBe(userId);

      // Validate session using the testDb's validateSessionToken
      const result2 = await validateSessionToken(token, testDb.db);
      expect(result2.session).toBeDefined();
      expect(result2.user).toBeDefined();
      expect(result2.user?.email).toBe('test@test.com');
    });

    it('should handle invalid session token', async () => {
      const result = await validateSessionToken('invalid-token', testDb.db);
      expect(result).toEqual({ session: null, user: null });
    });

    it('should handle expired session', async () => {
      // Create a test user
      const result = await testDb.client.execute({
        sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        args: ['test@test.com', 'hash123'],
      });
      const userId = Number(result.lastInsertRowid);

      // Create session that's already expired
      const token = generateSessionToken();
      const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
      await testDb.client.execute({
        sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        args: [sessionId, userId, Math.floor(INITIAL_TIME / 1000 - 1)], // Expired 1 second ago
      });

      // Validate session - should be null because expired
      const validationResult = await validateSessionToken(token, testDb.db);
      expect(validationResult).toEqual({ session: null, user: null });
    });

    it('should extend session when close to expiry', async () => {
      // Create a test user
      const result = await testDb.client.execute({
        sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        args: ['test@test.com', 'hash123'],
      });
      const userId = Number(result.lastInsertRowid);

      // Create session that's close to expiry (14 days left)
      const token = generateSessionToken();
      const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
      const almostExpiredTime = Math.floor((INITIAL_TIME + (1000 * 60 * 60 * 24 * 14)) / 1000); // 14 days from now as timestamp
      await testDb.client.execute({
        sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        args: [sessionId, userId, almostExpiredTime],
      });

      // Validate session - should be extended by 30 days
      const validationResult = await validateSessionToken(token, testDb.db);
      expect(validationResult.session).not.toBeNull();
      expect(validationResult.user).not.toBeNull();
      
      // Check if expiration was extended
      const expectedNewExpiry = new Date(INITIAL_TIME + (1000 * 60 * 60 * 24 * 30)); // 30 days from now
      expect(validationResult.session?.expiresAt).toEqual(expectedNewExpiry);
    });

    it('should invalidate session', async () => {
      // Create a test user
      const result = await testDb.client.execute({
        sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        args: ['test@test.com', 'hash123'],
      });
      const userId = Number(result.lastInsertRowid);

      // Create and then invalidate session
      const token = generateSessionToken();
      const session = await createSession(token, userId, testDb.db);
      await invalidateSession(session.id, testDb.db);

      // Session should no longer be valid
      const validationResult = await validateSessionToken(token, testDb.db);
      expect(validationResult).toEqual({ session: null, user: null });
    });
  });

  describe('Cookie Management', () => {
    let mockContext: MockContext;

    beforeEach(() => {
      mockContext = {
        cookies: {
          set: vi.fn(),
          delete: vi.fn(),
          get: vi.fn(),
          has: vi.fn(),
          headers: Object.assign(
            function* () {
              for (const [key, value] of new Headers()) {
                yield `${key}: ${value}`;
              }
            },
            new Headers()
          ),
          merge: vi.fn(), // Added merge method
        } as unknown as AstroCookies & MockCookies, // Updated type assertion
      };
    });

    it('should set session cookie with correct options', () => {
      const token = 'test-token';
      const expiresAt = INITIAL_TIME + 1000000;

      setSessionCookie(mockContext as ActionAPIContext, token, expiresAt);

      expect(mockContext.cookies?.set).toHaveBeenCalledWith('session', token, {
        httpOnly: true,
        secure: false, // We're in dev mode
        sameSite: 'lax',
        path: '/',
        expires: new Date(expiresAt),
      });
    });

    it('should delete session cookie', () => {
      deleteSessionCookie(mockContext as ActionAPIContext);

      expect(mockContext.cookies?.delete).toHaveBeenCalledWith('session', {
        path: '/',
      });
    });
  });
});