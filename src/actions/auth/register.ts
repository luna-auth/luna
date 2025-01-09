import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { db } from '../../db';
import { usersTable } from '../../db/schema';
import { hashPassword } from '../../lib/auth/password';
import { generateSessionToken, createSession, setSessionCookie } from '../../lib/auth/session';
import type { ActionAPIContext } from 'astro:actions';
import { eq } from 'drizzle-orm';

export const register = defineAction({
  accept: 'form',
  input: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    confirm: z.string()
  }).refine((data) => data.password === data.confirm, {
    message: "Passwords don't match. Please try again!",
    path: ["confirm"]
  }),
  handler: async ({ email, password }, context: ActionAPIContext) => {
    // Check if user already exists
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (existingUser) {
      throw new ActionError({
        code: 'CONFLICT',
        message: 'This email is already registered. Please use a different one.',
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
        message: 'Registration failed. Please try again.',
      });
    }

    // Create session
    const token = generateSessionToken();
    const session = await createSession(token, user.id);

    // Set session cookie
    setSessionCookie(context, token, session.expiresAt.getTime());

    return { 
      success: true,
      redirect: '/'
    };
  },
}); 