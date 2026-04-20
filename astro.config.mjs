// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import fs from 'fs';
import path from 'path';

// https://astro.build/config
export default defineConfig({
  site: 'https://michellefullwood.com',
  integrations: [svelte()],
  vite: {
    plugins: [{
      name: 'directory-index',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/private/')) return next();
          const [pathPart, ...queryParts] = (req.url ?? '').split('?');
          if (pathPart.endsWith('/')) {
            const indexPath = path.join(process.cwd(), 'public', pathPart, 'index.html');
            if (fs.existsSync(indexPath)) {
              req.url = pathPart + 'index.html' + (queryParts.length ? '?' + queryParts.join('?') : '');
            }
          }
          next();
        });
      }
    }]
  },
});
