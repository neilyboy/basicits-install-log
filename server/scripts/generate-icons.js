'use strict';
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../../client/public');
const logoPath = path.join(publicDir, 'logo.svg');

const logoRaw = fs.readFileSync(logoPath, 'utf8');
const logoInner = logoRaw
  .replace(/<\?xml[^>]*\?>\s*/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<defs>[\s\S]*?<\/defs>/g, '')
  .replace(/class="st0"/g, 'fill="#ffffff"')
  // strip outer <svg ...> and </svg> wrapper so we can re-embed it
  .replace(/^[\s\S]*?(<path|<g)/, (m, p1) => p1)
  .replace(/<\/svg>\s*$/, '')
  .trim();

// Original logo viewBox dimensions
const LW = 3000;
const LH = 812.976378;

function buildIconSvg(size, contentFraction) {
  const displayW = Math.round(size * contentFraction);
  const displayH = Math.round(displayW * LH / LW);
  const x = Math.round((size - displayW) / 2);
  const y = Math.round((size - displayH) / 2);
  const scale = displayW / LW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f172a"/>
  <g transform="translate(${x},${y}) scale(${scale.toFixed(6)})">
    ${logoInner}
  </g>
</svg>`;
}

async function genPng(svgStr, outPath) {
  await sharp(Buffer.from(svgStr), { density: 300 }).png().toFile(outPath);
  console.log('  ✓', path.relative(process.cwd(), outPath));
}

async function main() {
  console.log('Generating PWA icons...');
  // Standard 192 icon
  await genPng(buildIconSvg(192, 0.72), path.join(publicDir, 'icon-192.png'));
  // Standard 512 icon
  await genPng(buildIconSvg(512, 0.72), path.join(publicDir, 'icon-512.png'));
  // Maskable icon — logo stays inside the safe zone (inner 60%)
  await genPng(buildIconSvg(512, 0.52), path.join(publicDir, 'icon-maskable.png'));
  // Apple touch icon (180x180)
  await genPng(buildIconSvg(180, 0.70), path.join(publicDir, 'apple-touch-icon.png'));
  // Favicon 32x32
  await genPng(buildIconSvg(32, 0.78), path.join(publicDir, 'favicon-32.png'));
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
