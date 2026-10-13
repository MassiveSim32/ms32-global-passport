import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname,'public','index.html');

let html = await fs.readFile(file,'utf8');

html = html.replaceAll('v0.0.14','v1.0.0-rc.1');
html = html.replaceAll('v0.0.15','v1.0.0-rc.1');
html = html.replaceAll('<span class="beta-pill">BETA</span>','<span class="beta-pill">RC</span>');

// Personalise the Home headline as one concise journey message.
html = html.replace(
  '<h1 id="hello">Welcome aboard.</h1><p class="sub">Your interactive Massive Simulations 32 Journey starts here</p>',
  '<h1 id="hello">Your MS32 interactive journey starts here.</h1>'
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

// Give the four Home quick-access buttons distinct MS32-tinted shading.
const quickColours = '<link rel="stylesheet" href="/home-quick-colours.css?v=20261014-1">';
if (!html.includes('/home-quick-colours.css?v=20261014-1')) {
  html = html.replace('</head>', quickColours + '\n</head>');
}

// Keep scheduled community flight actions aviation-blue while making
// Spontaneous Flying a warmer amber/orange action so the two are unmistakable.
const spontaneousStyle = '<link rel="stylesheet" href="/spontaneous-flight-style.css?v=20261014-1">';
if (!html.includes('/spontaneous-flight-style.css?v=20261014-1')) {
  html = html.replace('</head>', spontaneousStyle + '\n</head>');
}

// Add a warmer MS32 colour treatment to the compact Journey Points banner.
const journeyStyle = '<link rel="stylesheet" href="/journey-banner-colours.css?v=20261014-1">';
if (!html.includes('/journey-banner-colours.css?v=20261014-1')) {
  html = html.replace('</head>', journeyStyle + '\n</head>');
}

// Normal pilots receive index.html via express.static(), while the admin root
// can receive an already-enhanced page. The loader fills only missing parts so
// both paths get the same Companion App features, including the Home feature tiles.
const oldLoaders = [
  '<script src="/full-app-loader.js?v=20261013-15"></script>',
  '<script src="/full-app-loader.js?v=20261014-1"></script>',
  '<script src="/full-app-loader.js?v=20261014-2"></script>',
  '<script src="/full-app-loader.js?v=20261014-3"></script>',
  '<script src="/full-app-loader.js?v=20261014-4"></script>',
  '<script src="/full-app-loader.js?v=20261014-5"></script>'
];
const loader = '<script src="/full-app-loader.js?v=20261014-rc1"></script>';
for (const oldLoader of oldLoaders) {
  if (html.includes(oldLoader)) html = html.replace(oldLoader, loader);
}
if (!html.includes('/full-app-loader.js?v=20261014-rc1')) html = html.replace('</html>', loader + '</html>');

await fs.writeFile(file,html,'utf8');
console.log('App shell patched to Massive Simulations 32 Companion App v1.0.0-rc.1');
