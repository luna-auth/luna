import { defineAction } from 'astro:actions';
import { invalidateSession } from '../../lib/auth/session';

export const logout = defineAction({
  accept: 'form',
  handler: async (_input, context) => {
    const sessionId = context.locals.session?.id;
    
    if (sessionId) {
      await invalidateSession(sessionId);
    }
    
    context.cookies.delete('session', {
      path: '/',
    });

    return { success: true };
  },
}); 