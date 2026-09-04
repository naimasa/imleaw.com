#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import TurndownService from 'turndown';

const EXPORT_DIR = path.resolve('data/wp-export');
const POSTS_DIR = path.resolve('src/content/posts');
const PAGES_DIR = path.resolve('src/content/pages');
const SITE_ORIGIN = 'https://imleaw.com';
const UPLOAD_MARKER = '/wp-content/uploads/';

const yamlString = (value) => JSON.stringify(String(value ?? ''));
const yamlArray = (values) => `[${values.map(yamlString).join(', ')}]`;

async function readJson(name) {
  const filename = path.join(EXPORT_DIR, `${name}.json`);
  try {
    return JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${filename}: ${error.message}`, { cause: error });
  }
}

function permalink(link, label) {
  const url = new URL(link, SITE_ORIGIN);
  if (url.origin !== SITE_ORIGIN) throw new Error(`${label} has an unexpected origin: ${link}`);
  return url.pathname;
}

function jstDate(localDate, gmtDate, label) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(localDate ?? '')) {
    throw new Error(`${label} has an invalid WordPress local date: ${localDate}`);
  }
  const formatted = `${localDate}+09:00`;
  if (gmtDate) {
    const localEpoch = Date.parse(formatted);
    const gmtEpoch = Date.parse(`${gmtDate}Z`);
    if (!Number.isFinite(gmtEpoch) || localEpoch !== gmtEpoch) {
      throw new Error(`${label} date/date_gmt do not differ by exactly +09:00`);
    }
  }
  return formatted;
}

function localUploadPath(rawUrl) {
  if (!rawUrl) return null;
  const url = new URL(rawUrl, SITE_ORIGIN);
  const markerIndex = url.pathname.indexOf(UPLOAD_MARKER);
  if (markerIndex < 0) return null;
  let suffix;
  try {
    suffix = url.pathname
      .slice(markerIndex + UPLOAD_MARKER.length)
      .split('/')
      .map((part) => decodeURIComponent(part))
      .join('/');
  } catch {
    throw new Error(`Upload URL contains invalid percent encoding: ${rawUrl}`);
  }
  if (!suffix || suffix.split('/').some((part) => part === '..')) return null;
  return `../../assets/uploads/${suffix}`;
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

function createTurndown() {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
  });
  service.keep(['iframe', 'video', 'audio', 'source']);
  service.remove(['script', 'style', 'noscript']);

  service.addRule('fencedPre', {
    filter: (node) => node.nodeName === 'PRE',
    replacement(_content, node) {
      const code = node.querySelector?.('code');
      const language = code?.getAttribute('class')?.match(/(?:language-|lang-)([\w+-]+)/)?.[1] ?? '';
      const text = (code ?? node).textContent.replace(/\n$/, '');
      const fence = text.includes('```') ? '````' : '```';
      return `\n\n${fence}${language}\n${text}\n${fence}\n\n`;
    },
  });
  service.addRule('uploadImages', {
    filter: 'img',
    replacement(_content, node) {
      const src = node.getAttribute('src') ?? '';
      const destination = localUploadPath(src) ?? src;
      if (!destination) return '';
      const alt = (node.getAttribute('alt') ?? '').replace(/([\\[\]])/g, '\\$1');
      const title = node.getAttribute('title');
      return `![${alt}](${destination}${title ? ` ${JSON.stringify(title)}` : ''})`;
    },
  });
  service.addRule('tables', {
    filter: 'table',
    replacement(_content, table) {
      const rows = [...table.querySelectorAll('tr')].map((row) =>
        [...row.querySelectorAll('th,td')].map((cell) => cleanText(cell.textContent).replace(/\|/g, '\\|')),
      );
      if (!rows.length || !rows[0].length) return '';
      const width = Math.max(...rows.map((row) => row.length));
      const normalized = rows.map((row) => [...row, ...Array(width - row.length).fill('')]);
      const header = normalized[0];
      return `\n\n| ${header.join(' | ')} |\n| ${header.map(() => '---').join(' | ')} |\n${normalized
        .slice(1)
        .map((row) => `| ${row.join(' | ')} |`)
        .join('\n')}\n\n`;
    },
  });
  service.addRule('wordpressEmbeds', {
    filter: (node) => node.nodeName === 'FIGURE' && /wp-block-embed/.test(node.getAttribute('class') ?? ''),
    replacement(content, node) {
      const iframe = node.querySelector?.('iframe');
      const link = node.querySelector?.('a');
      if (iframe) return `\n\n${iframe.outerHTML}\n\n`;
      if (link) return `\n\n[${cleanText(link.textContent) || link.href}](${link.href})\n\n`;
      return `\n\n${content}\n\n`;
    },
  });
  return service;
}

function markdown(service, html) {
  return cleanText(service.turndown(html ?? '')).replace(/\n{3,}/g, '\n\n');
}

function safeFilenameSlug(slug, id) {
  const safe = String(slug ?? '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/\.+$/g, '')
    .slice(0, 120);
  return safe || `wp-${id}`;
}

async function main() {
  const [posts, pages, media, categories] = await Promise.all(
    ['posts', 'pages', 'media', 'categories'].map(readJson),
  );
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const service = createTurndown();
  await Promise.all([mkdir(POSTS_DIR, { recursive: true }), mkdir(PAGES_DIR, { recursive: true })]);

  for (const post of posts) {
    const date = jstDate(post.date, post.date_gmt, `post ${post.id}`);
    const canonical = permalink(post.link, `post ${post.id}`);
    const expectedPrefix = `/${date.slice(0, 10).replaceAll('-', '/')}/`;
    if (!canonical.startsWith(expectedPrefix)) throw new Error(`post ${post.id}: date does not match ${canonical}`);
    const categorySlugs = (post.categories ?? []).map((id) => {
      const category = categoryById.get(id);
      if (!category) throw new Error(`post ${post.id}: unknown category ID ${id}`);
      return category.slug;
    });
    const featured = post.featured_media ? mediaById.get(post.featured_media) : null;
    if (post.featured_media && !featured) {
      console.warn(`[markdown] post ${post.id}: missing media ${post.featured_media}, skipping heroImage`);
    }
    const heroImage = localUploadPath(featured?.source_url);
    const frontmatter = [
      '---',
      `title: ${yamlString(post.title?.rendered)}`,
      `permalink: ${yamlString(canonical)}`,
      `date: ${date}`,
      `categories: ${yamlArray(categorySlugs)}`,
      ...(heroImage ? [`heroImage: ${yamlString(heroImage)}`, `heroImageAlt: ${yamlString(featured.alt_text || post.title?.rendered)}`] : []),
      `wpPostId: ${post.id}`,
      '---',
      '',
    ].join('\n');
    const filename = `${date.slice(0, 10)}-${safeFilenameSlug(post.slug, post.id)}.md`;
    await writeFile(path.join(POSTS_DIR, filename), `${frontmatter}${markdown(service, post.content?.rendered)}\n`);
  }

  const orderedPages = [...pages].sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0) || a.id - b.id);
  for (const [index, page] of orderedPages.entries()) {
    const frontmatter = [
      '---',
      `title: ${yamlString(page.title?.rendered)}`,
      `permalink: ${yamlString(permalink(page.link, `page ${page.id}`))}`,
      `order: ${Number.isInteger(page.menu_order) ? page.menu_order : index}`,
      `wpPageId: ${page.id}`,
      '---',
      '',
    ].join('\n');
    await writeFile(path.join(PAGES_DIR, `${safeFilenameSlug(page.slug, page.id)}.md`), `${frontmatter}${markdown(service, page.content?.rendered)}\n`);
  }

  console.log(`[markdown] Complete: wrote ${posts.length} posts and ${pages.length} pages`);
}

main().catch((error) => {
  console.error('[markdown] Fatal error:', error);
  process.exitCode = 1;
});
