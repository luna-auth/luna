import { vi } from 'vitest';
import type { ActionAPIContext } from 'astro:actions';

export type MockCookies = {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  has: ReturnType<typeof vi.fn>;
  headers: Headers;
};

export type MockContext = Partial<ActionAPIContext> & {
  cookies: MockCookies;
};
