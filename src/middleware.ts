import { defineMiddleware } from "astro:middleware";
import {
  validateSessionToken,
  deleteSessionCookie,
  setSessionCookie,
} from "./lib/session";


export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get("session")?.value ?? null;
  const locals = context.locals as App.Locals;

  if (token === null) {
    locals.session = null;
    locals.user = null;
    return next();
  }

  const { session, user } = await validateSessionToken(token);
  if (session === null) {
    deleteSessionCookie(context);
  } else {
    // Refresh the session cookie
    setSessionCookie(context, token, session.expiresAt.getTime());
  }

  locals.session = session;
  locals.user = user;

  return next();
});
