import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname,'public','index.html');

let html = await fs.readFile(file,'utf8');

// Keep the visible beta version aligned with the deployed package.
html = html.replaceAll('v0.0.14','v0.0.15');

// Do not let an old installed/browser shell linger between beta builds.
if (!html.includes('http-equiv="Cache-Control"')) {
  html = html.replace(
    '<head>',
    '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">'
  );
}

// These enhancements used to be injected only through response.send().
// Ordinary beta pilots are served index.html by express.static(), which bypasses
// response.send(), so they were receiving the old base shell without Flying Now.
// Put the complete Companion App bundle directly into the app shell for everyone.
const appBundle = [
  '<script src="/rewards-prototype.js?v=20261013-15"></script>',
  '<script src="/dual-clock.js?v=20261013-15"></script>',
  '<script src="/stamp-style-v2.js?v=20261013-15"></script>',
  '<script src="/bush-location-fix.js?v=20261013-15"></script>',
  '<script src="/airliner-location-fix.js?v=20261013-15"></script>',
  '<script src="/flying-now.js?v=20261013-15"></script>',
  '<script src="/passport-pages.js?v=20261013-15"></script>'
].join('');

if (!html.includes('/flying-now.js?v=20261013-15')) {
  html = html.replace('</body>', appBundle + '</body>');
}

await fs.writeFile(file,html,'utf8');
console.log('App shell patched to full v0.0.15 Companion App bundle');
