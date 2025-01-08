import { vi } from 'vitest';

// Mock for astro:schema
export const z = {
  string: () => ({
    email: () => z.string(),
    min: (n: number) => z.string(),
  }),
  object: (schema: any) => schema,
};

// Mock for astro:actions
export const defineAction = vi.fn((config) => ({
  ...config,
  orThrow: async (formData: FormData) => {
    const context = (formData as any).context;
    return config.handler({}, context);
  },
})); 