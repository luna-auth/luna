import { encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { db } from '../../db';
import type { Session, User } from '../../db/schema';
import { usersTable, sessionsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Define a generic context interface that any framework can implement
interface CookieContext {
  cookies: {
    set(name: string, value: string, options?: CookieOptions): void;
    delete(name: string, options?: { path: string }): void;
  };
}

interface CookieOptions {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  expires?: Date;
}

/**
 * SessionValidationResult is returned after checking if the token
 * in the user's cookies matches a valid session in the DB.
 */
export interface SessionValidationResult {
  session: Session | null;
  user: User | null;
}

/**
 * Throw this custom error if we detect an expired or invalid session.
 * We'll catch it in our middleware to remove cookies or handle redirection.
 */
export class SessionValidationError extends Error {
  constructor(
    message: string,
    public code: 'EXPIRED' | 'INVALID' | 'USER_NOT_FOUND'
  ) {
    super(message);
    this.name = 'SessionValidationError';
  }
}

/**
 * Generate a 20-byte random token for sessions
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeHexLowerCase(bytes);
  return token;
}

/**
 * Create a new session in the DB with hashed token ID
 */
export async function createSession(
  token: string,
  userId: number
): Promise<Session> {
  try {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const session: Session = {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    };
    await db.insert(sessionsTable).values(session);
    return session;
  } catch (error) {
    // Network/DB error
    throw new Error('Failed to create session. Please try again later.');
  }
}

/**
 * Validate session token by checking DB for user and session
 * Throws SessionValidationError if expired or invalid
 */
export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  try {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const result = await db
      .select({
        session: sessionsTable,
        user: usersTable,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(eq(sessionsTable.id, sessionId));

    if (result.length === 0) {
      throw new SessionValidationError('Session not found', 'INVALID');
    }

    const row = result[0];
    if (!row) {
      throw new SessionValidationError('Session not found', 'INVALID');
    }

    const { session, user } = row;
    if (Date.now() >= session.expiresAt.getTime()) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
      throw new SessionValidationError('Session expired', 'EXPIRED');
    }

    return { session, user };
  } catch (error) {
    if (error instanceof SessionValidationError) {
      // Rethrow known session errors to the middleware
      throw error;
    }
    // Any other error is unexpected (network issue, DB down, etc.)
    throw new SessionValidationError('Session validation failed', 'INVALID');
  }
}

/**
 * Invalidate a session by removing it from the DB
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  } catch {
    // If DB is down, user simply won't have that session invalidated. Not critical.
  }
}

/**
 * Set a session cookie in the browser; used by login, register, and rolling sessions
 */
export function setSessionCookie(
  context: CookieContext,
  token: string,
  expiresAt: number
): void {
  context.cookies.set('session', token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    expires: new Date(expiresAt),
  });
}

/**
 * Remove a session cookie by name
 */
export function deleteSessionCookie(context: CookieContext): void {
  context.cookies.delete('session', {
    path: '/',
  });
}

/**
 * Helper: determine if session is expired or invalid. Not used directly but
 * can be helpful for UI if you want to display a reason to the user.
 */
export function getSessionError(session: Session | null): 'EXPIRED' | 'INVALID' | null {
  if (!session) return 'INVALID';
  if (Date.now() >= session.expiresAt.getTime()) return 'EXPIRED';
  return null;
}