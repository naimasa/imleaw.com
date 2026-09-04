#!/usr/bin/env node

import { copyFile, mkdir, open, rename, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import process from 'node:process';
import { readFile } from 'node:fs/promises';

const MEDIA_FILE = path.resolve('data/wp-export/media.json');
const SOURCE_ROOT = path.resolve('src/assets/uploads');
const PUBLIC_ROOT = path.resolve('public/wp-content/uploads');
const UPLOAD_MARKER = '/wp-content/uploads/';
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 4;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function destinationParts(media) {
  if (!media.source_url) throw new Error(`media ${media.id} has no source_url`);
  const url = new URL(media.source_url);
  const markerIndex = url.pathname.indexOf(UPLOAD_MARKER);
  if (markerIndex < 0) throw new Error(`media ${media.id} is outside wp-content/uploads: ${media.source_url}`);
  const encodedParts = url.pathname.slice(markerIndex + UPLOAD_MARKER.length).split('/').filter(Boolean);
  const parts = encodedParts.map((part) => decodeURIComponent(part));
  if (parts.length < 3 || parts.some((part) => part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error(`media ${media.id} has an unsafe upload path: ${url.pathname}`);
  }
  return parts;
}

async function isUsableFile(filename, expectedLength) {
  try {
    const info = await stat(filename);
    return info.isFile() && info.size > 0 && (!expectedLength || info.size === expectedLength);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function download(media, index, total) {
  const parts = destinationParts(media);
  const sourceTarget = path.join(SOURCE_ROOT, ...parts);
  const publicTarget = path.join(PUBLIC_ROOT, ...parts);
  await Promise.all([mkdir(path.dirname(sourceTarget), { recursive: true }), mkdir(path.dirname(publicTarget), { recursive: true })]);

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let temporary;
    try {
      const response = await fetch(media.source_url, {
        headers: { 'User-Agent': 'imleaw-astro-migrator/1.0' },
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      if (!response.body) throw new Error('Response has no body');
      const expectedLength = Number(response.headers.get('content-length')) || undefined;

      if (!(await isUsableFile(sourceTarget, expectedLength))) {
        temporary = `${sourceTarget}.part-${process.pid}-${media.id}`;
        const handle = await open(temporary, 'w');
        try {
          await pipeline(Readable.fromWeb(response.body), handle.createWriteStream());
        } finally {
          await handle.close().catch(() => {});
        }
        if (!(await isUsableFile(temporary, expectedLength))) throw new Error('Downloaded file is empty or truncated');
        await rename(temporary, sourceTarget);
        temporary = null;
      } else {
        await response.body.cancel();
      }

      if (!(await isUsableFile(publicTarget, expectedLength))) await copyFile(sourceTarget, publicTarget);
      console.log(`[uploads] ${index + 1}/${total} media ${media.id}: ${parts.join('/')}`);
      return;
    } catch (error) {
      lastError = error;
      if (temporary) await unlink(temporary).catch(() => {});
      if (attempt < MAX_ATTEMPTS) {
        const delay = 750 * 2 ** (attempt - 1);
        console.warn(`[uploads] media ${media.id} failed (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`media ${media.id} (${media.source_url}) failed: ${lastError.message}`, { cause: lastError });
}

async function main() {
  const media = JSON.parse(await readFile(MEDIA_FILE, 'utf8'));
  if (!Array.isArray(media)) throw new TypeError(`${MEDIA_FILE} must contain an array`);

  const destinations = new Map();
  for (const item of media) {
    const relative = destinationParts(item).join('/');
    const prior = destinations.get(relative);
    if (prior && prior !== item.source_url) throw new Error(`Conflicting media URLs map to ${relative}`);
    destinations.set(relative, item.source_url);
  }

  console.log(`[uploads] Downloading ${media.length} originals with concurrency ${CONCURRENCY}`);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, media.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= media.length) return;
      await download(media[index], index, media.length);
    }
  });
  await Promise.all(workers);
  console.log(`[uploads] Complete: ${media.length} files written to both asset layers`);
}

main().catch((error) => {
  console.error('[uploads] Fatal error:', error);
  process.exitCode = 1;
});
