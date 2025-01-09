import { defineMiddleware } from 'astro:middleware';
import { getActionContext, isActionError } from 'astro:actions';
import { validateSessionToken, deleteSessionCookie, setSessionCookie, SessionValidationError } from './lib/auth/session';
import { loginRateLimiter } from './lib/auth/rateLimiters';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next();
  }

  // Grab all info about the inbound action request
  const { action, setActionResult, serializeActionResult } = getActionContext(context);

  // -- Rate-limiting for login attempts. Keep this if you like. --
  if (action?.calledFrom === 'form' && action.name === 'auth.login') {
    const ipKey = context.clientAddress;
    if (!loginRateLimiter.isAllowed(ipKey)) {
      // Instead of setting the result, throw or remember to handle the limit in your action
      // Or remove completely if you want to do it inside the action
    }
  }

  // ❌ REMOVE or comment out the entire "if (action?.calledFrom === 'form')" block:
  // if (action?.calledFrom === 'form') {
  //   try {
  //     const result = await action.handler();
  //     setActionResult(action.name, serializeActionResult(result));
  //     return next();
  //   } catch (err) {
  //     // ...
  //   }
  // }

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