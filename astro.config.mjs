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
    optimizeDeps: {
      esbuildOptions: {
        plugins: [{
          name: 'ignore-astro-syntax',
          setup(build) {
            // Astro's own Vite plugin transforms .astro files through its pipeline.
            // When esbuild dep-scans them directly it fails on Astro template syntax
            // (e.g. `class=` attributes read as invalid JSX). Return empty JS so the
            // scan succeeds; actual transforms happen via Astro's Vite plugin.
            build.onLoad({ filter: /\.astro$/ }, () => ({ contents: '', loader: 'js' }));
          },
        }],
      },
    },
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
