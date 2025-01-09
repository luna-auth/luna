import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  output: 'server',
  env: {
    schema: {
      DB_URL: envField.string({ 
        context: 'server', 
        access: 'secret',
        optional: false,
        url: true
      }),
      SESSION_SECRET: envField.string({ 
        context: 'server', 
        access: 'secret',
        optional: false,
        min: 32
      })
    }
  }
});
