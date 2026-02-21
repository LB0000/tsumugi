/**
 * Resize style thumbnail images to max 400px width for performance.
 * Run once: npx tsx scripts/resize-thumbnails.ts
 */
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

const STYLES_DIR = 'public/images/styles';
const MAX_WIDTH = 400;
const WEBP_QUALITY = 80;
const CATEGORIES = ['pet', 'family', 'kids'];

async function resizeAll() {
  let totalBefore = 0;
  let totalAfter = 0;
  let count = 0;

  for (const category of CATEGORIES) {
    const dir = join(STYLES_DIR, category);
    const files = readdirSync(dir).filter(f => extname(f) === '.webp');

    for (const file of files) {
      const filePath = join(dir, file);
      const beforeSize = statSync(filePath).size;
      totalBefore += beforeSize;

      const buffer = await sharp(filePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      writeFileSync(filePath, buffer);

      const afterSize = buffer.length;
      totalAfter += afterSize;
      count++;
      console.log(`${filePath}: ${(beforeSize / 1024).toFixed(0)}KB -> ${(afterSize / 1024).toFixed(0)}KB`);
    }
  }

  console.log(`\nTotal: ${count} files`);
  console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(1)}MB`);
  console.log(`After: ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Saved: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
}

resizeAll().catch(console.error);
