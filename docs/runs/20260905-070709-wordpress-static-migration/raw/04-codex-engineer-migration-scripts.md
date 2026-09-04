Implemented all three migration scripts:

- [wp-export.mjs](/Users/naimasa/Projects/imleaw.com/scripts/wp-export.mjs)
  - Paginated REST exports with retries and timeouts
  - Validates expected counts: 431 posts, 11 pages, 565 media, 5 categories
  - Generates categorized `data/legacy-urls.json`

- [wp-to-markdown.mjs](/Users/naimasa/Projects/imleaw.com/scripts/wp-to-markdown.mjs)
  - Turndown conversion for code, tables, images, headings, lists, and embeds
  - Validates JST dates against `date_gmt`
  - Preserves exact WordPress permalink paths
  - Rewrites upload references to `src/assets/uploads`
  - Generates requested post and page frontmatter

- [fetch-uploads.mjs](/Users/naimasa/Projects/imleaw.com/scripts/fetch-uploads.mjs)
  - Five concurrent downloads
  - Retries, timeouts, truncation checks, and atomic writes
  - Copies full `source_url` files into both compatibility and Astro asset layers
  - Preserves `-scaled` originals

All scripts pass `node --check` and `git diff --check`. The live migration was not executed, so no remote content or media was downloaded.