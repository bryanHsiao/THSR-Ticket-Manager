/**
 * Generate PNG icons from SVG for PWA
 * Run with: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'public', 'icons');

const svgPath = join(iconsDir, 'icon.svg');
const svgContent = readFileSync(svgPath);

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(svgContent)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Also generate apple-touch-icon (180x180 is recommended for iOS)
  const appleTouchIconPath = join(iconsDir, 'apple-touch-icon.png');
  await sharp(svgContent)
    .resize(180, 180)
    .png()
    .toFile(appleTouchIconPath);

  console.log('Generated: apple-touch-icon.png');
  console.log('Done!');
}

generateIcons().catch(console.error);
