import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ledger = JSON.parse(await readFile(path.join(root, 'data/legacy-urls.json'), 'utf8'));

if (!Array.isArray(ledger.media) || !Array.isArray(ledger.mediaFiles) || ledger.media.length !== ledger.mediaFiles.length) {
  throw new Error('legacy-urls.json must contain equally sized media and mediaFiles arrays');
}

const redirects = new Map();
for (let index = 0; index < ledger.media.length; index += 1) {
  redirects.set(ledger.media[index], ledger.mediaFiles[index]);
}

// Cloudflare Pages serves the generated XML through an internal rewrite.
redirects.set('/feed/', '/feed/index.xml 200');
redirects.set('/sitemap.xml', '/sitemap-index.xml 301');

await mkdir(dist, { recursive: true });
const rules = [...redirects].map(([source, destination]) =>
  destination.endsWith(' 200') ? `${source} ${destination}` : `${source} ${destination} 301`,
);
await writeFile(path.join(dist, '_redirects'), `${rules.join('\n')}\n`);

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

for (let index = 0; index < ledger.media.length; index += 1) {
  const legacyUrl = ledger.media[index];
  const canonicalPath = ledger.mediaFiles[index];
  const outputDirectory = path.join(dist, ...decodeURIComponent(legacyUrl).split('/').filter(Boolean));
  const canonicalUrl = new URL(canonicalPath, ledger.site).href;
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${escapeHtml(canonicalPath)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta name="robots" content="noindex"><title>移動しました</title></head>
<body><p><a href="${escapeHtml(canonicalPath)}">画像へ移動します</a></p>
<script>location.replace(${JSON.stringify(canonicalPath)});</script></body></html>\n`;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), html);
}

console.log(`Generated ${rules.length} Cloudflare rules and ${ledger.media.length} GitHub Pages redirect files.`);
