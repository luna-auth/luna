import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
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
