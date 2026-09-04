Implemented the complete Astro 5.x site for `imleaw.com`.

Key outcomes:

- Added Content Layer schemas for all 431 posts and 11 pages.
- Preserved exact WordPress permalinks, including encoded Japanese slugs.
- Added centralized typography, color, spacing, radius, shadow, and layout tokens.
- Built responsive header, navigation, footer, breadcrumbs, cards, pagination, contact, map, Instagram, search, RSS, and 404 interfaces.
- Added blog and category pagination at 12 posts per page.
- Added `/feed.xml` and `/feed/` RSS endpoints.
- Normalized internal content filenames to WordPress IDs to avoid Astro/Vite URI decoding errors without changing public URLs.
- Converted Markdown body images to public WordPress-compatible paths.
- Corrected one legacy PDF incorrectly assigned as a hero image.
- Added `@astrojs/rss`.

Verification completed:

- `astro check`: 0 errors, warnings, or hints.
- Production build: successful.
- Generated: 519 HTML pages.
- Cached production build time: approximately 5 seconds.
- Image pipeline processed 2,385 optimized assets.