import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { db } from '../../db';
import { usersTable } from '../../db/schema';
import { verify } from '@node-rs/argon2';
import { createSession, setSessionCookie } from '../../lib/session';
import { eq } from 'drizzle-orm';
import { generateSessionToken } from '../../lib/session';
import { loginRateLimiter } from '../../lib/rateLimiters';

export const login = defineAction({
  accept: 'form',
  input: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
  handler: async ({ email, password }, context) => {
    const clientIp = context.clientAddress;
    
    if (!loginRateLimiter.isAllowed(clientIp)) {
      throw new ActionError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again later.'
      });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user || !(await verify(user.passwordHash, password))) {
      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password'
      });
    }

    const token = generateSessionToken();
    const session = await createSession(token, user.id);
    setSessionCookie(context, token, session.expiresAt.getTime());

    return { success: true };
  }
}); 