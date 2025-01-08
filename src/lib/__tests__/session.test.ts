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
import type { MockContext } from './types';
import type { ActionAPIContext } from 'astro:actions';

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
          headers: new Headers(),
        },
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
