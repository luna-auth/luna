import { defineMiddleware } from 'astro:middleware';
import { getActionContext } from 'astro:actions';
import { validateSessionToken, deleteSessionCookie, setSessionCookie } from './lib/auth/session';
import { loginRateLimiter } from './lib/auth/rateLimiters';

// Example: typed locals, declared in src/env.d.ts
// declare namespace App {
//   interface Locals {
//     session: Session | null;
//     user: User | null;
//   }
// }

export const onRequest = defineMiddleware(async (context, next) => {
  // If page was already prerendered at build time, skip
  if (context.isPrerendered) {
    return next();
  }

  // Access inbound action requests (from forms or RPC calls)
  const { action, setActionResult, serializeActionResult } = getActionContext(context);

  // --- Example: Rate limit login attempts at the middleware level ---
  // This can further centralize all rate-limiting checks (login or register).
  if (action?.calledFrom === 'form' && action.name === 'auth.login') {
    const ipKey = context.clientAddress;
    if (!loginRateLimiter.isAllowed(ipKey)) {
      // If user is rate-limited, we can short-circuit with an error or rewrite:
      // 1. Return a Response directly
      // 2. Rewrite to a dedicated "Too Many Attempts" page
      return new Response('Too many login attempts. Please try again later.', { status: 429 });
      // or:
      // return context.rewrite('/too-many-attempts');
    }
  }

  // --- Example: If an action is triggered from an HTML form, call the handler explicitly ---
  if (action?.calledFrom === 'form') {
    const result = await action.handler();
    setActionResult(action.name, serializeActionResult(result));

    if (result.error) {
      // For form submissions, you might want to redirect back to referer
      // or just let Astro handle re-rendering the same page to show errors
      // (Astro 5 default: re-render the same page)
      // return context.redirect(context.request.headers.get('Referer') ?? '/login');
    }
  }

  // --- Validate user session for every request ---
  // - All requests carry session cookies
  // - If session token is missing or invalid, we remove the cookie
  // - If session is valid, refresh the session cookie expiration date
  const sessionCookie = context.cookies.get('session')?.value ?? null;
  const locals = context.locals as App.Locals;

  if (!sessionCookie) {
    // not logged in, but route might not require auth, so just continue
    return next();
  }

  try {
    const { session, user } = await validateSessionToken(sessionCookie);
    // If session or user is missing, remove cookie
    if (!session || !user) {
      deleteSessionCookie(context);
      return next();
    }

    // Refresh session cookie (rolling session)
    setSessionCookie(context, sessionCookie, session.expiresAt.getTime());

    // Attach session & user to locals for easy access in pages
    locals.session = session;
    locals.user = user;
  } catch (error) {
    // If session check fails, remove cookie
    deleteSessionCookie(context);
    // Optionally rewrite to a /login or /error page
    // return context.rewrite('/login?expired=true');
  }

  // Check if user is trying to access protected routes
  if (!locals.user && context.url.pathname.startsWith('/protected')) {
    // Option 1: redirect user
    return context.redirect('/login?unauthorized=true');
    
    // Option 2: rewrite in place (uncomment to use)
    // return context.rewrite(new Request('/login', {
    //   headers: {
    //     'x-redirected-from': context.url.pathname,
    //   }
    // }));
  }

  // --- Finally, proceed to the next middleware or Astro route ---
  return next();
});