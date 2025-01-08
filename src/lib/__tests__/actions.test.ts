import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AstroCookies } from 'astro';
import { hashPassword } from '../hashPassword';

// Mockujemy moduły
vi.mock('../../db', () => import('./mocks/db'));
vi.mock('astro:schema', () => import('./mocks/astro'));
vi.mock('astro:actions', () => import('./mocks/astro'));

// Import zamockowanego db
import { db } from '../../db';

// Import akcji
import { server } from '../../actions';

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as any).__reset();
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = await hashPassword(password);

      // Mockujemy zwracanie usera
      const mockUser = { 
        id: 1, 
        email, 
        passwordHash 
      };
      (db as any).__setReturnValue('select', db);
      (db as any).__setReturnValue('from', db);
      (db as any).__setReturnValue('where', [mockUser]);

      const mockContext = {
        cookies: {
          set: vi.fn(),
        } as unknown as AstroCookies,
        clientAddress: '127.0.0.1',
      };

      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      Object.defineProperty(formData, 'context', { value: mockContext });

      const result = await server.login.orThrow(formData);

      expect(result).toEqual({ success: true });
      expect(mockContext.cookies.set).toHaveBeenCalled();
    });

    // Dodaj więcej testów...
  });
}); 