#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const classificationPath = path.resolve('tmp/storage-migration/object-classification.csv');
const backupRoot = path.resolve('backup/player-photos-before-migration');
const outputRoot = path.resolve('tmp/storage-migration/prepared');

function parseCsvLine(line) {
  return [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) => match[1].replaceAll('""', '"'));
}

function parsePlayerId(referencedBy, field) {
  const escaped = field.replace('.', '\\.');
  const match = referencedBy.match(new RegExp(`${escaped} \\(id=(\\d+)\\)`));
  if (!match) throw new Error(`No se encontró player_id en: ${referencedBy}`);
  return Number(match[1]);
}

async function writeVariant(row) {
  const isPhoto = row.functional_classification === 'B. FOTO WEB';
  const playerId = parsePlayerId(row.referenced_by, isPhoto ? 'players.photo_url' : 'players.card_url');
  const isGeneratedCard = row.functional_classification === 'C. CARTA GENERADA activa';
  const generationId = isGeneratedCard ? parsePlayerId(row.referenced_by, 'card_generations.image_url') : null;
  const inputPath = path.join(backupRoot, ...row.path.split('/'));
  const input = await fs.readFile(inputPath);
  const metadata = await sharp(input).metadata();
  const stats = await sharp(input).stats();
  const outputExtension = isPhoto || stats.isOpaque ? '.jpg' : '.png';
  const relativeOutput = isPhoto
    ? `player-photos/${playerId}.jpg`
    : `player-cards/${isGeneratedCard ? `generation-${generationId}` : `player-${playerId}`}${outputExtension}`;
  const outputPath = path.join(outputRoot, ...relativeOutput.split('/'));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  let pipeline = sharp(input).rotate().resize({
    width: isPhoto ? 1600 : 1800,
    height: isPhoto ? 1600 : 1800,
    fit: 'inside',
    withoutEnlargement: true,
  });
  if (outputExtension === '.jpg') {
    pipeline = pipeline.jpeg({
      quality: isPhoto ? 80 : 84,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: '4:4:4',
    });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  }
  const result = await pipeline.toFile(outputPath);
  const output = await fs.readFile(outputPath);
  return {
    playerId,
    generationId,
    classification: row.functional_classification,
    sourcePath: row.path,
    sourceBytes: input.length,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    sourceFormat: metadata.format,
    sourceHasAlpha: Boolean(metadata.hasAlpha),
    sourceIsOpaque: stats.isOpaque,
    outputPath: relativeOutput,
    outputBytes: output.length,
    outputWidth: result.width,
    outputHeight: result.height,
    outputFormat: result.format,
    outputSha256: createHash('sha256').update(output).digest('hex'),
    savingsBytes: input.length - output.length,
    savingsPercent: Number(((1 - output.length / input.length) * 100).toFixed(2)),
  };
}

const csv = await fs.readFile(classificationPath, 'utf8');
const lines = csv.trim().split(/\r?\n/);
const headers = lines[0].split(',');
const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
});
const selected = rows.filter((row) => row.functional_classification === 'B. FOTO WEB' || /activa$/.test(row.functional_classification));

await fs.mkdir(outputRoot, { recursive: true });
const items = [];
for (const row of selected) items.push(await writeVariant(row));
items.sort((a, b) => a.classification.localeCompare(b.classification) || a.playerId - b.playerId);
const manifest = {
  generatedAt: new Date().toISOString(),
  photos: items.filter((item) => item.classification === 'B. FOTO WEB').length,
  cards: items.filter((item) => item.classification !== 'B. FOTO WEB').length,
  sourceBytes: items.reduce((sum, item) => sum + item.sourceBytes, 0),
  outputBytes: items.reduce((sum, item) => sum + item.outputBytes, 0),
  items,
};
await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Preparadas ${manifest.photos} fotos y ${manifest.cards} cartas.`);
console.log(`Bytes: ${manifest.sourceBytes} -> ${manifest.outputBytes}`);
