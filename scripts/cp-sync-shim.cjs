/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS preload for node --require */
// Preloaded by `npm run dev` (node --require).
// Node's native fs.cpSync fails with EIO "Access is denied" on Windows when an existing
// parent directory has a non-ASCII name (e.g. "C:\Users\Eduardo Gómez Pueyo"), which
// breaks `ray develop` when it copies assets into ~/.config/raycast/extensions.
// Replace it with a plain recursive copy built on mkdirSync/copyFileSync, which work.
const fs = require("fs");
const path = require("path");

function copy(src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!opts.recursive) throw new Error(`cpSync: ${src} is a directory (recursive not set)`);
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copy(path.join(src, entry), path.join(dest, entry), opts);
    }
  } else {
    if (fs.existsSync(dest)) {
      if (opts.errorOnExist && opts.force === false) throw new Error(`cpSync: ${dest} already exists`);
      if (opts.force === false) return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.cpSync = (src, dest, opts = {}) => copy(String(src), String(dest), opts);
