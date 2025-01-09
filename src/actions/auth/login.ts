import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { db } from '../../db';
import { usersTable } from '../../db/schema';
import { verify } from '@node-rs/argon2';
import { createSession, setSessionCookie, generateSessionToken } from '../../lib/auth/session';
import { eq } from 'drizzle-orm';
import { loginRateLimiter } from '../../lib/auth/rateLimiters';

export const login = defineAction({
  accept: 'form',
  input: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
  handler: async ({ email, password }, context) => {
    try {
      const clientIp = context.clientAddress;
      
      if (!loginRateLimiter.isAllowed(clientIp)) {
        throw new ActionError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many login attempts. Please wait a moment and try again.'
        });
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (!user || !(await verify(user.passwordHash, password))) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect email or password. Please try again.'
        });
      }

      const token = generateSessionToken();
      const session = await createSession(token, user.id);
      setSessionCookie(context, token, session.expiresAt.getTime());

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof ActionError) {
        throw error;
      }

      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again.'
      });
    }
  }
}); 