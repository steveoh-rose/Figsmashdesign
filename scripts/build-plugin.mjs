/**
 * Build the Club Figma Figma-plugin UI.
 *
 * Figma plugins load their UI from a single self-contained HTML file (`__html__`).
 * Vite emits index.html + separate JS/CSS chunks, so after a normal `vite build`
 * we inline those chunks into one file at clubfigma-plugin/ui.html.
 *
 * Usage: pnpm build:plugin   (runs `vite build` first, then this script)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');
const outDir = join(root, 'clubfigma-plugin');

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// Inline the module script: <script ... src="/assets/index-xxx.js"></script>
html = html.replace(
  /<script[^>]*\ssrc="([^"]+\.js)"[^>]*><\/script>/g,
  (_m, src) => {
    const file = join(dist, src.replace(/^\//, ''));
    const code = readFileSync(file, 'utf8');
    return `<script type="module">\n${code}\n</script>`;
  },
);

// Inline the stylesheet: <link rel="stylesheet" ... href="/assets/index-xxx.css">
html = html.replace(
  /<link[^>]*\shref="([^"]+\.css)"[^>]*>/g,
  (_m, href) => {
    const file = join(dist, href.replace(/^\//, ''));
    const css = readFileSync(file, 'utf8');
    return `<style>\n${css}\n</style>`;
  },
);

// Strip any leftover modulepreload hints (assets are already inlined).
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '');

// Sanity check: nothing should still point at /assets/.
const leftover = readdirSync(assets).filter((f) => html.includes(`/assets/${f}`));
if (leftover.length) {
  console.error('✗ Some assets were not inlined:', leftover.join(', '));
  process.exit(1);
}

writeFileSync(join(outDir, 'ui.html'), html, 'utf8');
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`✓ clubfigma-plugin/ui.html written (${kb} KB, self-contained)`);
