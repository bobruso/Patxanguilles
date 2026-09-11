#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const projectRef = 'cnnhstlguewrxjihhlqc';
const bucket = 'player-photos';
const inventoryPath = path.resolve('tmp/image-compression-test/bucket-inventory.csv');
const outputRoot = path.resolve('backup/player-photos-before-migration');
const publicBase = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/`;

function parseCsvLine(line) {
  return [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) => match[1].replaceAll('""', '"'));
}

async function downloadWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

const csv = await fs.readFile(inventoryPath, 'utf8');
const lines = csv.trim().split(/\r?\n/);
const headers = lines[0].split(',');
const rows = lines.slice(1).map((line) => Object.fromEntries(headers.map((key, index) => [key, parseCsvLine(line)[index]])));

await fs.mkdir(path.dirname(outputRoot), { recursive: true });
await fs.mkdir(outputRoot, { recursive: false });
const manifest = [];
let nextIndex = 0;

async function worker() {
  while (nextIndex < rows.length) {
    const row = rows[nextIndex];
    nextIndex += 1;
    const encodedPath = row.name.split('/').map(encodeURIComponent).join('/');
    const bytes = await downloadWithRetry(`${publicBase}${encodedPath}`);
    const expectedSize = Number(row.size_bytes);
    if (bytes.length !== expectedSize) throw new Error(`${row.name}: ${bytes.length} bytes; esperados ${expectedSize}`);

    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) throw new Error(`${row.name}: imagen no decodificable`);

    const destination = path.join(outputRoot, ...row.name.split('/'));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes, { flag: 'wx' });
    manifest.push({
      path: row.name,
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      date: row.updated_at || row.created_at,
      contentType: row.mime_type,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      orientation: metadata.orientation ?? 1,
      hasAlpha: Boolean(metadata.hasAlpha),
    });
    console.log(`[${manifest.length}/${rows.length}] ${row.name}`);
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));
manifest.sort((a, b) => a.path.localeCompare(b.path));
const totalBytes = manifest.reduce((sum, item) => sum + item.size, 0);
await fs.writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({ bucket, objectCount: manifest.length, totalBytes, generatedAt: new Date().toISOString(), objects: manifest }, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
);
console.log(`Backup completo: ${manifest.length} objetos, ${totalBytes} bytes`);
