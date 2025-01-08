import { z } from "astro:schema";
import { defineAction, ActionError } from "astro:actions";
import type { ActionAPIContext } from "astro:actions";

import { db } from "../db";
import { usersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import {
  generateSessionToken,
  createSession,
  setSessionCookie,
  deleteSessionCookie,
  invalidateSession,
} from "../lib/session";
import { hashPassword } from "../lib/hashPassword";
import { loginRateLimiter, registerRateLimiter } from "../lib/rateLimiters";

export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
    handler: async (
      { email, password }: { email: string; password: string },
      context: ActionAPIContext,
    ): Promise<{ success: boolean }> => {
      // Rate limiting check
      const clientIp = context.clientAddress ?? 'unknown';
      const rateLimitKey = `login:${clientIp}:${email}`;
      
      // Check remaining attempts and warn if low
      const remainingAttempts = loginRateLimiter.getRemainingAttempts(rateLimitKey);
      if (remainingAttempts <= 2 && remainingAttempts > 0) {
        console.warn(`Warning: Only ${remainingAttempts} login attempts remaining!`);
      }

      if (!loginRateLimiter.isAllowed(rateLimitKey)) {
        const waitTime = loginRateLimiter.getRemainingTime(rateLimitKey);
        const minutes = Math.ceil((waitTime ?? 0) / 1000 / 60);
        
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many login attempts. Please try again in ${minutes} minutes.`,
        });
      }

      // Annotate 'context' parameter
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (!user) {
        // Increment rate limit counter even on failed attempts
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const passwordMatch = await verify(user.passwordHash, password);

      if (!passwordMatch) {
        // Increment rate limit counter even on failed attempts
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Reset rate limit on successful login
      loginRateLimiter.reset(rateLimitKey);

      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      // Set session cookie
      setSessionCookie(context, token, session.expiresAt.getTime());

      return { success: true };
    },
  }),

  logout: defineAction({
    accept: "form",
    handler: async (
      _input: unknown,
      context: ActionAPIContext,
    ): Promise<{ success: boolean }> => {
      const sessionId = (context.locals as App.Locals).session?.id;
      if (sessionId) {
        await invalidateSession(sessionId);
      }
      deleteSessionCookie(context);
      return { success: true };
    },
  }),

  register: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
    handler: async (
      { email, password }: { email: string; password: string },
      context: ActionAPIContext,
    ): Promise<{ success: boolean }> => {
      // Rate limiting check
      const clientIp = context.clientAddress ?? 'unknown';
      const rateLimitKey = `register:${clientIp}`;
      
      // Check remaining attempts and warn if low
      const remainingAttempts = registerRateLimiter.getRemainingAttempts(rateLimitKey);
      if (remainingAttempts <= 2 && remainingAttempts > 0) {
        console.warn(`Warning: Only ${remainingAttempts} registration attempts remaining!`);
      }

      if (!registerRateLimiter.isAllowed(rateLimitKey)) {
        const waitTime = registerRateLimiter.getRemainingTime(rateLimitKey);
        const minutes = Math.ceil((waitTime ?? 0) / 1000 / 60);
        
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many registration attempts. Please try again in ${minutes} minutes.`,
        });
      }

      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existingUser) {
        throw new ActionError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const passwordHash = await hashPassword(password);

      const [user] = await db
        .insert(usersTable)
        .values({
          email,
          passwordHash,
        })
        .returning({
          id: usersTable.id,
        });

      if (!user) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User creation failed",
        });
      }

      // Reset rate limit on successful registration
      registerRateLimiter.reset(rateLimitKey);

      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      // Set session cookie
      setSessionCookie(context, token, session.expiresAt.getTime());

      return { success: true };
    },
  }),
};
