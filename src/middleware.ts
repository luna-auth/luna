import { defineMiddleware } from 'astro:middleware';
import { validateSessionToken } from './lib/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get('session')?.value ?? null;
  const locals = context.locals as App.Locals;

  if (token === null) {
    locals.session = null;
    locals.user = null;
    return next();
  }

  const { session, user } = await validateSessionToken(token);
  if (session === null) {
    context.cookies.delete('session', { path: '/' });
  } else {
    // Refresh the session cookie
    context.cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      expires: session.expiresAt,
    });
  }

  locals.session = session;
  locals.user = user;

  return next();
});
