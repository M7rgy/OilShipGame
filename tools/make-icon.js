'use strict';

/**
 * Generates build/icon.ico (and a build/icon.png preview) for Hormuz Escape.
 *
 * No image libraries: the icon is drawn procedurally into RGBA buffers and
 * encoded to PNG with Node's built-in zlib, then several sizes are packed
 * into a Windows .ico. Re-run with `node tools/make-icon.js` after tweaking.
 *
 * The art is drawn in normalised 0..1 space and rasterised per size, so every
 * size stays crisp instead of being downscaled from one bitmap.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ----------------------------------------------------------------- raster ops

class Canvas {
  constructor(size) {
    this.size = size;
    this.data = Buffer.alloc(size * size * 4); // RGBA, transparent
  }

  // alpha-composite a pixel (0..255 channels, a 0..1)
  px(x, y, r, g, b, a) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size || a <= 0) {
      return;
    }
    const i = (y * this.size + x) * 4;
    const ia = 1 - a;
    this.data[i] = r * a + this.data[i] * ia;
    this.data[i + 1] = g * a + this.data[i + 1] * ia;
    this.data[i + 2] = b * a + this.data[i + 2] * ia;
    this.data[i + 3] = Math.min(255, a * 255 + this.data[i + 3] * ia);
  }

  // filled rectangle in normalised coords
  rect(nx, ny, nw, nh, col) {
    const s = this.size;
    const x0 = Math.round(nx * s);
    const y0 = Math.round(ny * s);
    const x1 = Math.round((nx + nw) * s);
    const y1 = Math.round((ny + nh) * s);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        this.px(x, y, col[0], col[1], col[2], col[3] === undefined ? 1 : col[3]);
      }
    }
  }

  // filled circle (normalised), lightly anti-aliased at the rim
  circle(ncx, ncy, nr, col) {
    const s = this.size;
    const cx = ncx * s;
    const cy = ncy * s;
    const r = nr * s;
    const x0 = Math.floor(cx - r - 1);
    const y0 = Math.floor(cy - r - 1);
    const x1 = Math.ceil(cx + r + 1);
    const y1 = Math.ceil(cy + r + 1);
    const baseA = col[3] === undefined ? 1 : col[3];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const edge = r - d;
        if (edge > 0) {
          const a = baseA * Math.min(1, edge); // 1px feather
          this.px(x, y, col[0], col[1], col[2], a);
        }
      }
    }
  }

  // filled convex polygon (normalised points [[x,y],...])
  poly(points, col) {
    const s = this.size;
    const pts = points.map((p) => [p[0] * s, p[1] * s]);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    const a = col[3] === undefined ? 1 : col[3];
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        if ((p1[1] <= y && p2[1] > y) || (p2[1] <= y && p1[1] > y)) {
          xs.push(p1[0] + (y - p1[1]) / (p2[1] - p1[1]) * (p2[0] - p1[0]));
        }
      }
      xs.sort((m, n) => m - n);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
          this.px(x, y, col[0], col[1], col[2], a);
        }
      }
    }
  }

  // rounded-rect background fill (normalised), vertical gradient top->bottom
  roundedGradient(nx, ny, nw, nh, nrad, top, bot) {
    const s = this.size;
    const x0 = nx * s;
    const y0 = ny * s;
    const x1 = (nx + nw) * s;
    const y1 = (ny + nh) * s;
    const rad = nrad * s;
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      const t = (y - y0) / (y1 - y0);
      const r = top[0] + (bot[0] - top[0]) * t;
      const g = top[1] + (bot[1] - top[1]) * t;
      const b = top[2] + (bot[2] - top[2]) * t;
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        // corner rounding
        let a = 1;
        const cornerX = x < x0 + rad ? x0 + rad : (x > x1 - rad ? x1 - rad : x);
        const cornerY = y < y0 + rad ? y0 + rad : (y > y1 - rad ? y1 - rad : y);
        if (cornerX !== x || cornerY !== y) {
          const d = Math.hypot(x + 0.5 - cornerX, y + 0.5 - cornerY);
          a = Math.max(0, Math.min(1, rad - d));
        }
        this.px(x, y, r, g, b, a);
      }
    }
  }
}

// ------------------------------------------------------------------- artwork

// Palette lifted from the game.
const HULL = [61, 72, 84];
const HULL_RED = [138, 47, 43];
const DECK = [85, 97, 110];
const DOME = [154, 165, 174];
const BRIDGE = [216, 221, 226];
const WATERLINE = [199, 205, 212];
const MINE_BODY = [30, 34, 40];
const MINE_RED = [255, 40, 40];
const FUNNEL_RED = [201, 75, 63];

function drawIcon(size) {
  const c = new Canvas(size);

  // rounded background: sky navy fading into deep water
  c.roundedGradient(0.02, 0.02, 0.96, 0.96, 0.20, [26, 58, 82], [5, 30, 46]);

  // waterline highlights
  c.rect(0.10, 0.66, 0.80, 0.010, [95, 130, 150, 0.5]);
  c.rect(0.16, 0.74, 0.68, 0.008, [95, 130, 150, 0.35]);

  // --- tanker, bow to the right, centred a touch high
  const y = 0.50;
  // hull (grey upper) + red waterline band
  c.poly([[0.12, y + 0.08], [0.86, y + 0.08], [0.92, y - 0.02], [0.16, y - 0.02]], HULL);
  c.rect(0.14, y + 0.08, 0.72, 0.06, HULL_RED);
  c.rect(0.14, y + 0.055, 0.74, 0.02, WATERLINE);
  // deck line
  c.rect(0.16, y - 0.03, 0.74, 0.02, DECK);
  // oil-tank domes
  for (let i = 0; i < 4; i++) {
    c.circle(0.30 + i * 0.13, y - 0.03, 0.035, DOME);
  }
  // aft bridge + funnel
  c.rect(0.17, y - 0.16, 0.11, 0.13, BRIDGE);
  c.rect(0.185, y - 0.10, 0.03, 0.02, [20, 52, 76]); // window row
  c.rect(0.225, y - 0.10, 0.03, 0.02, [20, 52, 76]);
  c.rect(0.20, y - 0.24, 0.05, 0.09, [46, 53, 60]); // funnel
  c.rect(0.20, y - 0.215, 0.05, 0.025, FUNNEL_RED); // funnel stripe

  // bow wake fleck
  c.poly([[0.90, y + 0.02], [0.965, y + 0.03], [0.90, y + 0.06]], [234, 246, 251, 0.9]);

  // --- red naval mine, lower-left, with glow + horns
  const mx = 0.30;
  const my = 0.80;
  const mr = 0.085;
  // glow
  for (let g = 6; g > 0; g--) {
    c.circle(mx, my, mr + g * 0.014, [255, 48, 48, 0.05]);
  }
  // horns
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.poly([
      [mx + Math.cos(a) * mr, my + Math.sin(a) * mr],
      [mx + Math.cos(a) * (mr + 0.05) + Math.cos(a + 1.57) * 0.012,
        my + Math.sin(a) * (mr + 0.05) + Math.sin(a + 1.57) * 0.012],
      [mx + Math.cos(a) * (mr + 0.05) - Math.cos(a + 1.57) * 0.012,
        my + Math.sin(a) * (mr + 0.05) - Math.sin(a + 1.57) * 0.012]
    ], [40, 45, 52]);
  }
  c.circle(mx, my, mr, MINE_BODY);
  c.circle(mx - mr * 0.3, my - mr * 0.3, mr * 0.55, [57, 64, 73]); // sheen
  c.circle(mx, my, mr * 0.32, MINE_RED); // detonator light
  c.circle(mx - mr * 0.1, my - mr * 0.1, mr * 0.13, [255, 160, 160]);

  return c;
}

// --------------------------------------------------------------- PNG encoder

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (~crc) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(canvas) {
  const s = canvas.size;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0);
  ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(s * (s * 4 + 1));
  for (let y = 0; y < s; y++) {
    raw[y * (s * 4 + 1)] = 0;
    canvas.data.copy(raw, y * (s * 4 + 1) + 1, y * s * 4, (y + 1) * s * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --------------------------------------------------------------- ICO encoder

function encodeICO(pngs) {
  // pngs: [{size, buf}]
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(count, 4);  // image count

  const entries = [];
  let offset = 6 + count * 16;
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    e[0] = p.size >= 256 ? 0 : p.size; // width (0 == 256)
    e[1] = p.size >= 256 ? 0 : p.size; // height
    e[2] = 0;  // palette
    e[3] = 0;  // reserved
    e.writeUInt16LE(1, 4);   // colour planes
    e.writeUInt16LE(32, 6);  // bits per pixel
    e.writeUInt32LE(p.buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += p.buf.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

// ------------------------------------------------------------------- run it

const buildDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(buildDir, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map((size) => ({ size, buf: encodePNG(drawIcon(size)) }));

fs.writeFileSync(path.join(buildDir, 'icon.ico'), encodeICO(pngs));
// 512px standalone PNG: electron-builder derives the macOS/Linux icons from it
fs.writeFileSync(path.join(buildDir, 'icon.png'), encodePNG(drawIcon(512)));

console.log(`Wrote build/icon.ico (${sizes.join(', ')}) and build/icon.png (512)`);
