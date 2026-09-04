import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ledger = JSON.parse(await readFile(path.join(root, 'data/legacy-urls.json'), 'utf8'));

const redirectText = await readFile(path.join(dist, '_redirects'), 'utf8').catch(() => '');
const redirectSources = new Set(
  redirectText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => line.split(/\s+/)[0]),
);

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

function outputCandidates(urlPath) {
  const decoded = decodeURIComponent(new URL(urlPath, ledger.site).pathname);
  const segments = decoded.split('/').filter(Boolean);
  if (decoded === '/') return [path.join(dist, 'index.html')];
  if (path.posix.extname(decoded)) return [path.join(dist, ...segments), path.join(dist, ...segments, 'index.html')];
  return [path.join(dist, ...segments, 'index.html')];
}

const urls = [...new Set(ledger.all ?? [...ledger.posts, ...ledger.pages, ...ledger.categories, ...ledger.media, ...ledger.mediaFiles])];
const failures = [];
for (const url of urls) {
  const candidates = outputCandidates(url);
  if (!(await Promise.all(candidates.map(exists))).some(Boolean) && !redirectSources.has(url)) failures.push(url);
}

// A literal percent directory indicates that an encoded URL was used as a disk path.
async function findPercentDirectory(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    if (entry.name.includes('%')) found.push(path.relative(dist, child));
    found.push(...await findPercentDirectory(child));
  }
  return found;
}
const percentDirectories = await findPercentDirectory(dist);
for (const directory of percentDirectories) failures.push(`[encoded directory] ${directory}`);

const checked = urls.length + percentDirectories.length;
const failed = failures.length;
const passed = checked - failed;
console.log(`URL verification: checked ${checked}, passed ${passed}, failed ${failed}`);
if (failures.length) {
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exitCode = 1;
}
