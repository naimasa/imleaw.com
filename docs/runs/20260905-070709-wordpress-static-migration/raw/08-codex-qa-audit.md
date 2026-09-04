Implemented the audit fixes across `src/`, `public/`, and `scripts/`.

### Results

- CSS tokens: Pass after fixes.
  - Removed all hardcoded colors from components/layouts.
  - Added semantic header, overlay, footer, and category tokens in [tokens.css](/Users/naimasa/Projects/imleaw.com/src/styles/tokens.css:12).
  - Remaining component spacing, fonts, and colors consistently use variables.
  - Verified key contrast ratios: 5.69:1–14.53:1, meeting WCAG AA for normal text.

- Accessibility: Pass for application components.
  - Skip link targets `#main-content`.
  - Buttons, navigation, inputs, maps, and external links have accessible names.
  - Map iframe has a title and lazy loading.
  - Post and Open Graph images now receive meaningful fallback descriptions.
  - Decorative card thumbnails intentionally use `alt=""`.
  - Copy result uses an `aria-live` status message.

- SEO and metadata: Pass.
  - All 519 actual pages have canonical URLs, descriptions, Open Graph metadata, and skip links.
  - Canonicals follow the trailing-slash policy.
  - Posts now emit `og:type="article"`, their hero image, and `og:image:alt` via [BaseLayout.astro](/Users/naimasa/Projects/imleaw.com/src/layouts/BaseLayout.astro:7).
  - Added sitemap generation in [astro.config.mjs](/Users/naimasa/Projects/imleaw.com/astro.config.mjs:1).
  - Generated sitemap contains 517 indexable URLs and excludes `/404/` and `/search/`.
  - `robots.txt` correctly references the generated `/sitemap-index.xml`.

- Contact: Pass after fixes.
  - Both contact links contain the correctly percent-encoded subject.
  - Clipboard API support now includes a legacy fallback and success/failure feedback in [ContactSection.astro](/Users/naimasa/Projects/imleaw.com/src/components/embed/ContactSection.astro:3).

- Search and map: Pass by build/output inspection.
  - Pagefind indexed 438 pages and generated five Japanese index shards.
  - Category filtering is indexed and now persists in/restores from the search URL.
  - Google Maps uses `loading="lazy"`, a descriptive title, safe referrer policy, and a no-script link.

- Scripts: Pass after correcting the frozen inventory expectations in [verify-inventory.mjs](/Users/naimasa/Projects/imleaw.com/scripts/verify-inventory.mjs:15).

### Verification

- `npm run build`: passed, 519 pages
- `npm run check`: 0 errors, 0 warnings; one deprecation hint for the intentional clipboard fallback
- `npm run verify:urls`: 1,571/1,571 passed
- `npm run verify:inventory`: 8/8 passed
- Hardcoded component/layout color scan: no findings

### Remaining observations

- Imported WordPress content contains empty image descriptions across 361 Markdown files. These may be decorative, but their meaning cannot be safely inferred automatically; editorial review is recommended.
- Two untitled legacy map iframes remain in source content that is explicitly replaced by dedicated routes, so they do not appear in generated pages.
- `npm audit` reports three production dependency advisories: two high and one low, primarily requiring major Astro/Sharp upgrades.
- Live browser interaction could not be performed because no browser runtime was connected; runtime-sensitive behavior was validated through compiled output and script inspection.
- Existing unrelated `.agents` and QA artifact changes were preserved.