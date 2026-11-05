import fs from "fs";
import path from "path";

// 1. Generate SVG Favicons
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <radialGradient id="neonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00FF66" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#00FF66" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00FF66" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#00FF66" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <!-- Background Tactical Rounded Shield -->
  <rect width="64" height="64" rx="16" fill="#070a0e" stroke="#00FF66" stroke-width="2.5" stroke-opacity="0.6"/>
  <!-- Ambient Radial Glow -->
  <circle cx="32" cy="32" r="26" fill="url(#neonGlow)"/>
  <!-- Concentric Radar Guidance Rings -->
  <circle cx="32" cy="32" r="23" stroke="#00FF66" stroke-width="1.8" stroke-dasharray="4 4" stroke-opacity="0.85"/>
  <circle cx="32" cy="32" r="15" stroke="#00FF66" stroke-width="1" stroke-opacity="0.3"/>
  <!-- Central Defense Polygon / Shield -->
  <path d="M32 13L46 20.5V32C46 41 39.5 48.5 32 51C24.5 48.5 18 41 18 32V20.5L32 13Z"
        fill="url(#shieldGrad)"
        stroke="#00FF66"
        stroke-width="2.5"
        stroke-linejoin="round"/>
  <!-- Core Telemetry Node -->
  <circle cx="32" cy="31" r="5" fill="#00FF66"/>
  <circle cx="32" cy="31" r="8" stroke="#FFFFFF" stroke-width="1.2" stroke-opacity="0.85"/>
  <circle cx="32" cy="31" r="2" fill="#FFFFFF"/>
</svg>`;

// 2. Generate 32x32 TrueColor 32-bit ICO file
function create32x32Ico() {
  const width = 32;
  const height = 32;
  const bpp = 32;
  const pixelBytes = width * height * 4; // 4096 bytes
  const andMaskBytes = (width * height) / 8; // 128 bytes
  const biSize = 40;
  const imageOffset = 6 + 16; // 22
  const imageSize = biSize + pixelBytes + andMaskBytes; // 4264
  const totalFileSize = imageOffset + imageSize;

  const buf = Buffer.alloc(totalFileSize);

  // ICONDIR (6 bytes)
  buf.writeUInt16LE(0, 0); // reserved
  buf.writeUInt16LE(1, 2); // type 1 = ICO
  buf.writeUInt16LE(1, 4); // 1 image

  // ICONDIRENTRY (16 bytes)
  buf.writeUInt8(width, 6);
  buf.writeUInt8(height, 7);
  buf.writeUInt8(0, 8); // color palette count (0 for 256+)
  buf.writeUInt8(0, 9); // reserved
  buf.writeUInt16LE(1, 10); // color planes
  buf.writeUInt16LE(bpp, 12); // bits per pixel
  buf.writeUInt32LE(imageSize, 14); // image size in bytes
  buf.writeUInt32LE(imageOffset, 18); // offset to image

  // BITMAPINFOHEADER (40 bytes at offset 22)
  let offset = 22;
  buf.writeUInt32LE(biSize, offset); // biSize
  buf.writeInt32LE(width, offset + 4); // biWidth
  buf.writeInt32LE(height * 2, offset + 8); // biHeight (must be 2x for ICO)
  buf.writeUInt16LE(1, offset + 12); // biPlanes
  buf.writeUInt16LE(bpp, offset + 14); // biBitCount
  buf.writeUInt32LE(0, offset + 16); // biCompression = BI_RGB
  buf.writeUInt32LE(pixelBytes, offset + 20); // biSizeImage
  buf.writeInt32LE(0, offset + 24); // biXPelsPerMeter
  buf.writeInt32LE(0, offset + 28); // biYPelsPerMeter
  buf.writeUInt32LE(0, offset + 32); // biClrUsed
  buf.writeUInt32LE(0, offset + 36); // biClrImportant
  offset += biSize;

  // Pixel Data: 32 rows, bottom to top (ICO is bottom-up), each row 32 pixels BGRA
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    // ICO rows are bottom-to-top: row 0 is the bottom row
    const visualY = (height - 1) - y;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const dx = x - 15.5;
      const dy = visualY - 15.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const boxDist = Math.max(Math.abs(dx), Math.abs(dy));

      let b = 0, g = 0, r = 0, a = 0;

      // Rounded container (radius approx 15 with round corners)
      if (boxDist <= 14.5) {
        // Dark background base #080c11
        r = 8;
        g = 12;
        b = 17;
        a = 255;

        // Border neon stroke around container edge
        if (boxDist >= 13.2 && boxDist <= 14.5) {
          r = 0;
          g = 255;
          b = 102;
          a = 230;
        }

        // Radar circular ring at radius 11
        if (Math.abs(dist - 11) < 1.1) {
          r = 0;
          g = 255;
          b = 102;
          a = 220;
        }

        // Central Shield / Diamond shape
        const isShield = visualY >= 6 && visualY <= 24 &&
          Math.abs(dx) <= (visualY <= 15 ? (visualY - 6) * 0.8 + 2 : (24 - visualY) * 0.9);

        if (isShield) {
          r = 0;
          g = 255;
          b = 102;
          a = 90;
        }

        // Shield border
        const shieldEdge = visualY >= 6 && visualY <= 24 &&
          Math.abs(Math.abs(dx) - (visualY <= 15 ? (visualY - 6) * 0.8 + 2 : (24 - visualY) * 0.9)) < 0.9;
        if (shieldEdge) {
          r = 0;
          g = 255;
          b = 102;
          a = 255;
        }

        // Central beacon node at (15.5, 15.5)
        if (dist <= 3.2) {
          r = 0;
          g = 255;
          b = 102;
          a = 255;
        }
        if (dist <= 1.4) {
          r = 255;
          g = 255;
          b = 255;
          a = 255;
        }
      }

      // BGRA format for BMP
      pixels[idx] = b;
      pixels[idx + 1] = g;
      pixels[idx + 2] = r;
      pixels[idx + 3] = a;
    }
  }

  buf.set(pixels, offset);
  offset += pixelBytes;

  // AND mask: all 0s for transparency (128 bytes)
  buf.fill(0, offset, offset + andMaskBytes);

  return buf;
}

// Write files
const publicDir = path.resolve("public");
const appDir = path.resolve("src/app");

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Write SVGs
fs.writeFileSync(path.join(publicDir, "icon.svg"), svgContent);
fs.writeFileSync(path.join(publicDir, "favicon.svg"), svgContent);
fs.writeFileSync(path.join(appDir, "icon.svg"), svgContent);

// Write ICO
const icoBuffer = create32x32Ico();
fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuffer);

console.log("Successfully generated all favicon and icon assets:");
console.log("- public/favicon.ico (" + icoBuffer.length + " bytes)");
console.log("- src/app/favicon.ico (" + icoBuffer.length + " bytes)");
console.log("- public/icon.svg");
console.log("- public/favicon.svg");
console.log("- src/app/icon.svg");
