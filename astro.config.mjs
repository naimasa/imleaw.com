import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://imleaw.com',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !['https://imleaw.com/404/', 'https://imleaw.com/search/'].includes(page) })],
  build: {
    format: 'directory',
  },
});
