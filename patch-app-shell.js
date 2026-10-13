import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname,'public','index.html');

let html = await fs.readFile(file,'utf8');

html = html.replaceAll('v0.0.14','v1.0.0-rc.1');
html = html.replaceAll('v0.0.15','v1.0.0-rc.1');
html = html.replaceAll('<span class="beta-pill">BETA</span>','<span class="beta-pill">RC</span>');

// Personalise the Home headline as one concise journey message, kept compact
// to match the HOME eyebrow label directly above it.
html = html.replace(
  '<h1 id="hello">Welcome aboard.</h1><p class="sub">Your interactive Massive Simulations 32 Journey starts here</p>',
  '<h1 id="hello" style="font-size:10px;line-height:1.35;margin:4px 0 8px">Your MS32 interactive journey starts here.</h1>'
);
html = html.replace(
  "el('hello').textContent=`Welcome, ${me.user.username}.`;",
  "el('hello').textContent=`${me.user.username}, your MS32 interactive journey starts here`;"
);

if (!html.includes('http-equiv="Cache-Control"')) {
  html = html.replace(
    '<head>',
    '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">'
  );
}

const quickColours = '<link rel="stylesheet" href="/home-quick-colours.css?v=20261014-1">';
if (!html.includes('/home-quick-colours.css?v=20261014-1')) html = html.replace('</head>', quickColours + '\n</head>');

const spontaneousStyle = '<link rel="stylesheet" href="/spontaneous-flight-style.css?v=20261014-1">';
if (!html.includes('/spontaneous-flight-style.css?v=20261014-1')) html = html.replace('</head>', spontaneousStyle + '\n</head>');

// Hard-lock the Home Journey Points rail via a cache-busted stylesheet so even
// legacy/admin shells that loaded an older rewards script receive the stable bar.
html = html.replaceAll('/journey-banner-colours.css?v=20261014-1','/journey-banner-colours.css?v=20261014-2');
const journeyStyle = '<link rel="stylesheet" href="/journey-banner-colours.css?v=20261014-2">';
if (!html.includes('/journey-banner-colours.css?v=20261014-2')) html = html.replace('</head>', journeyStyle + '\n</head>');

const oldLoaders = [
  '<script src="/full-app-loader.js?v=20261013-15"></script>',
  '<script src="/full-app-loader.js?v=20261014-1"></script>',
  '<script src="/full-app-loader.js?v=20261014-2"></script>',
  '<script src="/full-app-loader.js?v=20261014-3"></script>',
  '<script src="/full-app-loader.js?v=20261014-4"></script>',
  '<script src="/full-app-loader.js?v=20261014-5"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc1"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc2"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc3"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc4"></script>'
];
const loader = '<script src="/full-app-loader.js?v=20261014-rc5"></script>';
for (const oldLoader of oldLoaders) {
  if (html.includes(oldLoader)) html = html.replace(oldLoader, loader);
}
if (!html.includes('/full-app-loader.js?v=20261014-rc5')) html = html.replace('</html>', loader + '</html>');

await fs.writeFile(file,html,'utf8');
console.log('App shell patched to Massive Simulations 32 Companion App v1.0.0-rc.1');
