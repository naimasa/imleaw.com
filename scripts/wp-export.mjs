#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SITE_URL = (process.env.WP_SITE_URL ?? 'https://imleaw.com').replace(/\/$/, '');
const API_ROOT = `${SITE_URL}/wp-json/wp/v2`;
const OUTPUT_DIR = path.resolve('data/wp-export');
const PER_PAGE = 100;
const EXPECTED_COUNTS = { posts: 431, pages: 11, media: 562, categories: 5 };
const MAX_ATTEMPTS = 4;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'imleaw-astro-migrator/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) return response;
      const body = (await response.text()).slice(0, 500);
      const error = new Error(`HTTP ${response.status} ${response.statusText}: ${body}`);
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_ATTEMPTS) {
      const delay = 500 * 2 ** (attempt - 1);
      console.warn(`[export] Request failed (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

async function fetchCollection(name) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(`${API_ROOT}/${name}`);
    url.searchParams.set('per_page', String(PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('context', 'view');
    const response = await fetchWithRetry(url);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new TypeError(`${name} page ${page} did not return an array`);

    const headerPages = Number(response.headers.get('x-wp-totalpages'));
    const headerTotal = Number(response.headers.get('x-wp-total'));
    if (page === 1) {
      if (!Number.isInteger(headerPages) || headerPages < 1) {
        throw new Error(`${name}: missing or invalid X-WP-TotalPages header`);
      }
      totalPages = headerPages;
      console.log(`[export] ${name}: ${headerTotal} items across ${totalPages} page(s)`);
    }
    items.push(...batch);
    console.log(`[export] ${name}: fetched page ${page}/${totalPages} (${items.length} items)`);
    page += 1;
  } while (page <= totalPages);

  return items;
}

function canonicalPath(value, label) {
  if (!value) throw new Error(`${label} has no canonical URL`);
  const url = new URL(value, SITE_URL);
  if (url.origin !== new URL(SITE_URL).origin) {
    throw new Error(`${label} points outside ${SITE_URL}: ${value}`);
  }
  return `${url.pathname}${url.search}`;
}

function unique(values, label) {
  const result = [...new Set(values)];
  if (result.length !== values.length) throw new Error(`Duplicate ${label} detected`);
  return result;
}

function buildLegacyUrls(collections) {
  const posts = unique(collections.posts.map((item) => canonicalPath(item.link, `post ${item.id}`)), 'post URL');
  const pages = unique(collections.pages.map((item) => canonicalPath(item.link, `page ${item.id}`)), 'page URL');
  const categories = unique(
    collections.categories.map((item) => canonicalPath(item.link, `category ${item.id}`)),
    'category URL',
  );
  const media = unique(collections.media.map((item) => canonicalPath(item.link, `media ${item.id}`)), 'media URL');
  const mediaFiles = unique(
    collections.media.map((item) => canonicalPath(item.source_url, `media file ${item.id}`)),
    'media source URL',
  );

  return {
    site: SITE_URL,
    generatedAt: new Date().toISOString(),
    counts: { posts: posts.length, pages: pages.length, categories: categories.length, media: media.length },
    posts,
    pages,
    categories,
    media,
    mediaFiles,
    all: unique([...posts, ...pages, ...categories, ...media, ...mediaFiles], 'legacy URL'),
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const entries = await Promise.all(
    Object.keys(EXPECTED_COUNTS).map(async (name) => [name, await fetchCollection(name)]),
  );
  const collections = Object.fromEntries(entries);

  for (const [name, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = collections[name].length;
    if (actual !== expected) throw new Error(`${name}: expected ${expected} items, received ${actual}`);
    await writeFile(path.join(OUTPUT_DIR, `${name}.json`), `${JSON.stringify(collections[name], null, 2)}\n`);
  }

  const legacyUrls = buildLegacyUrls(collections);
  await writeFile(path.resolve('data/legacy-urls.json'), `${JSON.stringify(legacyUrls, null, 2)}\n`);
  console.log(`[export] Complete: ${Object.values(EXPECTED_COUNTS).reduce((sum, count) => sum + count, 0)} records saved`);
}

main().catch((error) => {
  console.error('[export] Fatal error:', error);
  process.exitCode = 1;
});
