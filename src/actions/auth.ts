import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { hashPassword } from '../lib/hashPassword';
import { verify } from '@node-rs/argon2';
import {
  generateSessionToken,
  createSession,
  setSessionCookie,
  deleteSessionCookie,
  invalidateSession,
} from '../lib/session';
import type { ActionAPIContext } from 'astro:actions';
import { eq } from 'drizzle-orm';

export const auth = {
  register: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
    handler: async ({ email, password }, context: ActionAPIContext) => {
      // Check if user already exists
      const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

      if (existingUser) {
        throw new ActionError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);

      const [user] = await db
        .insert(usersTable)
        .values({
          email,
          passwordHash,
        })
        .returning({
          id: usersTable.id,
          email: usersTable.email,
        });

      if (!user) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'User creation failed',
        });
      }

      // Create session
      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      // Set session cookie
      setSessionCookie(context, token, session.expiresAt.getTime());

      return { success: true };
    },
  }),

  login: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
    handler: async ({ email, password }, context: ActionAPIContext) => {
      // Fetch user
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

      if (!user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const passwordMatch = await verify(user.passwordHash, password);

      if (!passwordMatch) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Create session
      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      // Set session cookie
      setSessionCookie(context, token, session.expiresAt.getTime());

      return { success: true };
    },
  }),

  logout: defineAction({
    accept: 'form',
    handler: async (_input, context: ActionAPIContext) => {
      const sessionId = context.locals.session?.id;

      if (sessionId) {
        await invalidateSession(sessionId);
      }

      deleteSessionCookie(context);

      return { success: true };
    },
  }),
};
