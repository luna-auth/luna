import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActionAPIContext } from 'astro:actions';
import type { AstroCookies } from 'astro';

// Mock Astro modules
vi.mock('astro:schema', () => import('./mocks/astro'));
vi.mock('astro:actions', () => import('./mocks/astro'));

// Import after mocks
import { server } from '../../actions';

// Define types for mocks
type MockCookies = {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  has: ReturnType<typeof vi.fn>;
  headers: () => Generator<string, void, unknown>;
  merge: ReturnType<typeof vi.fn>;
};

type MockLocals = {
  session: {
    id: string;
    userId: number;
    expiresAt: Date;
  } | null;
  user: {
    id: number;
    email: string;
    passwordHash: string;
  } | null;
};

interface MockContext {
  locals: MockLocals;
  cookies: AstroCookies & MockCookies;
  clientAddress?: string;
}

describe('Auth Actions', () => {
  describe('logout', () => {
    let mockContext: MockContext;

    beforeEach(() => {
      mockContext = {
        locals: {
          session: {
            id: 'test-session-id',
            userId: 1,
            expiresAt: new Date(),
          },
          user: {
            id: 1,
            email: 'test@test.com',
            passwordHash: 'hash123',
          },
        },
        cookies: {
          set: vi.fn(),
          delete: vi.fn(),
          get: vi.fn(),
          has: vi.fn(),
          headers: function* () {
            for (const [key, value] of new Headers()) {
              yield `${key}: ${value}`;
            }
          },
          merge: vi.fn(),
        } as unknown as AstroCookies & MockCookies,
      };
    });

    it('should invalidate session and delete cookie', async () => {
      const formData = new FormData();
      Object.defineProperty(formData, 'context', { value: mockContext });

      const result = await server.logout.orThrow(formData);

      // Should return success
      expect(result).toEqual({ success: true });

      // Should delete cookie
      expect(mockContext.cookies?.delete).toHaveBeenCalledWith('session', {
        path: '/',
      });
    });

    it('should handle missing session gracefully', async () => {
      mockContext.locals = {
        session: null,
        user: {
          id: 1,
          email: 'test@test.com',
          passwordHash: 'hash123',
        },
      };

      const formData = new FormData();
      Object.defineProperty(formData, 'context', { value: mockContext });

      const result = await server.logout.orThrow(formData);

      // Should still return success
      expect(result).toEqual({ success: true });

      // Should still try to delete cookie
      expect(mockContext.cookies?.delete).toHaveBeenCalledWith('session', {
        path: '/',
      });
    });
  });
}); 