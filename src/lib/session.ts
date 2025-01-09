import { encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { db } from '../db';
import type { Session, User } from '../db/schema';
import { usersTable, sessionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { APIContext } from 'astro';
import type { ActionAPIContext } from 'astro:actions';

export interface SessionValidationResult {
  session: Session | null;
  user: User | null;
}

export class SessionValidationError extends Error {
  constructor(message: string, public code: 'EXPIRED' | 'INVALID' | 'USER_NOT_FOUND') {
    super(message);
    this.name = 'SessionValidationError';
  }
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeHexLowerCase(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: number
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
  };
  await db.insert(sessionsTable).values(session);
  return session;
}

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
      throw error;
    }
    throw new SessionValidationError('Session validation failed', 'INVALID');
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
}

export function setSessionCookie(
  context: APIContext | ActionAPIContext,
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

export function deleteSessionCookie(context: APIContext | ActionAPIContext): void {
  context.cookies.delete('session', {
    path: '/',
  });
}

export function getSessionError(session: Session | null): 'EXPIRED' | 'INVALID' | null {
  if (!session) return 'INVALID';
  if (Date.now() >= session.expiresAt.getTime()) return 'EXPIRED';
  return null;
}
