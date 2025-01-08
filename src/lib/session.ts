import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { db } from '../db';
import type { Session, User } from '../db/schema';
import { usersTable, sessionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { APIContext } from 'astro';
import type { ActionAPIContext } from 'astro:actions';

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(token: string, userId: number): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
  };
  await db.insert(sessionsTable).values(session);
  return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
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
    return { session: null, user: null };
  }

  const firstResult = result[0];
  if (!firstResult) {
    return { session: null, user: null };
  }

  // Now destructure safely
  const { session, user } = firstResult;

  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
    return { session: null, user: null };
  }

  // Extend session expiration if close to expiry (e.g., less than 15 days left)
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(sessionsTable)
      .set({ expiresAt: session.expiresAt })
      .where(eq(sessionsTable.id, session.id));
  }

  return { session, user };
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

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };