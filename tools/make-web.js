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
const { execFileSync } = require('child_process');

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

// 4. zip it (index.html must sit at the archive root for itch.io)
const zipPath = path.join(out, 'hormuz-escape-web.zip');
execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: app });

const sizeKB = Math.round(fs.statSync(zipPath).size / 1024);
console.log(`Wrote ${path.relative(root, zipPath)} (${sizeKB} KB)`);
console.log('Upload this zip to itch.io as an HTML5 game (see README > itch.io).');
