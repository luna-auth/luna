import type { ActionAPIContext } from 'astro:actions';

// Mock dla astro:schema
export const z = {
  object: (schema: any) => ({
    ...schema,
    parse: (data: any) => {
      const result: any = {};
      for (const [key, validator] of Object.entries(schema)) {
        if (data instanceof FormData) {
          result[key] = data.get(key);
        } else {
          result[key] = data[key];
        }
      }
      return result;
    },
  }),
  string: () => ({
    email: () => ({
      parse: (value: string) => value,
    }),
    min: (min: number) => ({
      parse: (value: string) => value,
    }),
    parse: (value: string) => value,
  }),
};

// Mock dla astro:actions
export class ActionError extends Error {
  constructor(public options: { code: string; message: string }) {
    super(options.message);
  }
}

export function defineAction<T, R>({ 
  accept, 
  input, 
  handler 
}: { 
  accept: string; 
  input?: any; 
  handler: (data: T, context: ActionAPIContext) => Promise<R>; 
}) {
  return {
    orThrow: async (data: any) => {
      const parsedData = input ? input.parse(data) : data;
      return handler(parsedData, data.context);
    },
  };
} 