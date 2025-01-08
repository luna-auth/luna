import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AstroCookies } from 'astro';
import { hashPassword } from '../hashPassword';
import { loginRateLimiter } from '../rateLimiters';

// Mockujemy moduły
vi.mock('../../db', () => import('./mocks/db'));
vi.mock('astro:schema', () => import('./mocks/astro'));
vi.mock('astro:actions', () => import('./mocks/astro'));

// Import zamockowanego db
import { db } from '../../db';

// Import akcji
import { server } from '../../actions';

describe('🔐 Authentication Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as any).__reset();
  });

  describe('👤 Login Action', () => {
    describe('✅ Success Cases', () => {
      it('should login successfully with correct email and password', async () => {
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
    });

    describe('❌ Error Cases', () => {
      it('should reject login with incorrect password', async () => {
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
        formData.append('password', 'wrong_password');
        Object.defineProperty(formData, 'context', { value: mockContext });

        await expect(server.login.orThrow(formData)).rejects.toThrow('Invalid email or password');
      });

      it('should reject login with non-existent email', async () => {
        // Mockujemy pustą odpowiedź z bazy (user nie istnieje)
        (db as any).__setReturnValue('select', db);
        (db as any).__setReturnValue('from', db);
        (db as any).__setReturnValue('where', []);

        const mockContext = {
          cookies: {
            set: vi.fn(),
          } as unknown as AstroCookies,
          clientAddress: '127.0.0.1',
        };

        const formData = new FormData();
        formData.append('email', 'nonexistent@example.com');
        formData.append('password', 'password123');
        Object.defineProperty(formData, 'context', { value: mockContext });

        await expect(server.login.orThrow(formData)).rejects.toThrow('Invalid email or password');
      });
    });

    describe('🔒 Rate Limiting', () => {
      beforeEach(() => {
        // Reset rate limiter przed każdym testem
        loginRateLimiter.reset('127.0.0.1');
      });

      it('should block after too many failed attempts', async () => {
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
        formData.append('password', 'wrong_password');
        Object.defineProperty(formData, 'context', { value: mockContext });

        // Próbujemy 4 razy z błędnym hasłem
        for (let i = 0; i < 4; i++) {
          await expect(server.login.orThrow(formData)).rejects.toThrow('Invalid email or password');
        }

        // Piąta próba powinna być zablokowana przez rate limiter
        await expect(server.login.orThrow(formData)).rejects.toThrow('Too many login attempts');
      });
    });
  });
}); 