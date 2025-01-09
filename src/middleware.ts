import { defineMiddleware } from 'astro:middleware';
import { getActionContext } from 'astro:actions';
import { validateSessionToken, deleteSessionCookie, setSessionCookie, SessionValidationError } from './lib/auth/session';
import { loginRateLimiter } from './lib/auth/rateLimiters';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next();
  }

  // Grab all info about the inbound action request
  const { action, setActionResult, serializeActionResult } = getActionContext(context);

  // -- Rate-limiting for login attempts --
  if (action?.calledFrom === 'form' && action.name === 'auth.login') {
    const ipKey = context.clientAddress;
    if (!loginRateLimiter.isAllowed(ipKey)) {
      const error = {
        code: 'TOO_MANY_REQUESTS' as const,
        message: 'Too many login attempts. Please try again later.',
        type: 'error', 
        status: 429,
        name: 'TooManyLoginAttempts'
      };
      setActionResult(action.name, serializeActionResult({
        data: undefined,
        error
      }));
      return next();
    }
  }

  // --- Session validation for every request ---
  const sessionCookie = context.cookies.get('session')?.value ?? null;
  const locals = context.locals as App.Locals;

  if (!sessionCookie) {
    return next();
  }

  try {
    const { session, user } = await validateSessionToken(sessionCookie);
    if (!session || !user) {
      deleteSessionCookie(context);
      return next();
    }

    // Refresh session cookie (rolling session)
    setSessionCookie(context, sessionCookie, session.expiresAt.getTime());

    locals.session = session;
    locals.user = user;
  } catch (error) {
    console.error('Session validation failed:', error);
    deleteSessionCookie(context);

    if (error instanceof SessionValidationError) {
      const redirectUrl =
        error.code === 'EXPIRED' ? '/login?error=session_expired' : '/login?error=invalid_session';
      return context.redirect(redirectUrl);
    }

    return context.redirect('/login?error=auth_error');
  }

  // Continue to the next middleware or final route
  return next();
});