#!/usr/bin/env node

import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Falta la dependencia "sharp". Instálala con: npm install sharp');
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function orientedDimensions(metadata) {
  const swap = [5, 6, 7, 8].includes(metadata.orientation);
  return {
    width: swap ? metadata.height : metadata.width,
    height: swap ? metadata.width : metadata.height,
  };
}

function extensionFor(kind, isOpaque) {
  return kind === 'photo' || isOpaque ? '.jpg' : '.png';
}

async function listImages(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(?:jpe?g|png|webp)$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function optimizeOne(inputPath, outputRoot, kind, qualities) {
  const inputBuffer = await fs.readFile(inputPath);
  const metadata = await sharp(inputBuffer).metadata();
  const stats = await sharp(inputBuffer).stats();
  const before = orientedDimensions(metadata);
  const maxEdge = kind === 'photo' ? 1600 : 1800;
  const outputExtension = extensionFor(kind, stats.isOpaque);
  const variants = [];

  for (const quality of qualities) {
    const outputDirectory = path.join(outputRoot, `q${quality}`);
    await fs.mkdir(outputDirectory, { recursive: true });
    const outputName = `${path.parse(inputPath).name}${outputExtension}`;
    const outputPath = path.join(outputDirectory, outputName);

    let pipeline = sharp(inputBuffer)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      });

    if (outputExtension === '.jpg') {
      pipeline = pipeline.jpeg({
        quality,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: '4:4:4',
      });
    } else {
      pipeline = pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        quality,
        effort: 10,
      });
    }

    const result = await pipeline.toFile(outputPath);
    variants.push({
      quality,
      output: path.relative(outputRoot, outputPath).replaceAll('\\', '/'),
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.size,
      savingsBytes: inputBuffer.length - result.size,
      savingsPercent: Number(((1 - result.size / inputBuffer.length) * 100).toFixed(2)),
    });
  }

  return {
    input: path.basename(inputPath),
    kind,
    original: {
      format: metadata.format,
      width: before.width,
      height: before.height,
      bytes: inputBuffer.length,
      orientation: metadata.orientation ?? 1,
      hasAlpha: Boolean(metadata.hasAlpha),
      isOpaque: stats.isOpaque,
    },
    decision: outputExtension === '.jpg'
      ? 'JPEG: la imagen es opaca; no se pierde transparencia.'
      : 'PNG: conserva transparencia real; no se fuerza JPEG.',
    variants,
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output || !['photo', 'card'].includes(args.kind)) {
  console.error('Uso: node tools/optimize-storage-images.mjs --input <dir> --output <dir> --kind photo|card [--qualities 88,84,80]');
  process.exit(1);
}

const inputDirectory = path.resolve(args.input);
const outputDirectory = path.resolve(args.output);
const qualities = (args.qualities ?? '88,84,80')
  .split(',')
  .map(Number)
  .filter((quality) => Number.isInteger(quality) && quality >= 1 && quality <= 100);

if (qualities.length === 0) {
  console.error('No hay calidades válidas. Usa enteros entre 1 y 100.');
  process.exit(1);
}

const images = await listImages(inputDirectory);
if (images.length === 0) {
  console.error(`No se encontraron imágenes en ${inputDirectory}`);
  process.exit(1);
}

const manifest = [];
for (const image of images) {
  manifest.push(await optimizeOne(image, outputDirectory, args.kind, qualities));
}

await fs.writeFile(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest }, null, 2)}\n`,
  'utf8',
);

console.log(`Optimizadas ${manifest.length} imágenes en ${outputDirectory}`);
