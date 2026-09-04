import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://imleaw.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
