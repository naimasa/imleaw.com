import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
const [inventory, posts, pages, categories, media] = await Promise.all([
  load('data/wp-inventory.json'),
  load('data/wp-export/posts.json'),
  load('data/wp-export/pages.json'),
  load('data/wp-export/categories.json'),
  load('data/wp-export/media.json'),
]);

// The discovery snapshot includes three media records that were no longer returned
// by the later export snapshot. Keep both frozen-fixture expectations explicit.
const expected = { posts: 431, pages: 11, categories: 5, inventoryMedia: 565, exportedMedia: 562 };
const checks = [
  ['wp-inventory posts', inventory.totalPosts, expected.posts],
  ['wp-inventory pages', inventory.pages?.length, expected.pages],
  ['wp-inventory categories', inventory.categories?.length, expected.categories],
  ['wp-inventory media', inventory.totalMedia, expected.inventoryMedia],
  ['wp-export posts', posts.length, expected.posts],
  ['wp-export pages', pages.length, expected.pages],
  ['wp-export categories', categories.length, expected.categories],
  ['wp-export media', media.length, expected.exportedMedia],
];

let failed = 0;
for (const [label, actual, wanted] of checks) {
  const ok = actual === wanted;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${actual} (expected ${wanted})`);
  if (!ok) failed += 1;
}
console.log(`Inventory verification: checked ${checks.length}, passed ${checks.length - failed}, failed ${failed}`);
if (failed) process.exitCode = 1;
