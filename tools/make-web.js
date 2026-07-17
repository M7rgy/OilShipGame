'use strict';

/**
 * Assembles a self-contained, itch.io-ready HTML5 build into dist-web/ and
 * zips it to dist-web/hormuz-escape-web.zip.
 *
 * The game runs unmodified in a browser; this just flattens the layout so the
 * upload has no node_modules path. Phaser is vendored in next to index.html
 * and index.html's <script src> for Phaser is rewritten to the flat path.
 *
 * Run with: npm run web
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist-web');
const app = path.join(out, 'hormuz-escape');

// fresh output dir
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(app, { recursive: true });

// recursive copy helper
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// 1. game source
copyDir(path.join(root, 'src'), path.join(app, 'src'));

// 2. vendor Phaser next to index.html
fs.copyFileSync(
  path.join(root, 'node_modules', 'phaser', 'dist', 'phaser.min.js'),
  path.join(app, 'phaser.min.js')
);

// 3. index.html with the Phaser path flattened
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('node_modules/phaser/dist/phaser.min.js', 'phaser.min.js');
if (html.includes('node_modules/')) {
  throw new Error('index.html still references node_modules after rewrite');
}
fs.writeFileSync(path.join(app, 'index.html'), html);

// 4. zip it (index.html must sit at the archive root for itch.io).
// A tiny, dependency-free ZIP writer so this works on every OS (Windows has
// no `zip` command); deflate compression via Node's built-in zlib.
const zipPath = path.join(out, 'hormuz-escape-web.zip');
writeZip(zipPath, collectFiles(app, app));

const sizeKB = Math.round(fs.statSync(zipPath).size / 1024);
console.log(`Wrote ${path.relative(root, zipPath)} (${sizeKB} KB)`);
console.log('Upload this zip to itch.io as an HTML5 game (see README > itch.io).');

// --------------------------------------------------------------- zip writer

// gather every file under dir as { name (forward-slash relative), data }
function collectFiles(dir, base) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push({
        name: path.relative(base, full).split(path.sep).join('/'),
        data: fs.readFileSync(full)
      });
    }
  }
  return files;
}

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

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}

function writeZip(dest, files) {
  const { time, date } = dosDateTime(new Date());
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    const compressed = zlib.deflateRawSync(f.data, { level: 9 });

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4);         // version needed
    local.writeUInt16LE(0, 6);          // flags
    local.writeUInt16LE(8, 8);          // method: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);         // extra length
    chunks.push(local, nameBuf, compressed);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);    // central directory signature
    cd.writeUInt16LE(20, 4);            // version made by
    cd.writeUInt16LE(20, 6);            // version needed
    cd.writeUInt16LE(0, 8);             // flags
    cd.writeUInt16LE(8, 10);            // method
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);       // local header offset
    central.push(Buffer.concat([cd, nameBuf]));

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);    // end of central directory signature
  eocd.writeUInt16LE(files.length, 8);  // entries on this disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);       // central directory offset

  fs.writeFileSync(dest, Buffer.concat([...chunks, centralBuf, eocd]));
}
