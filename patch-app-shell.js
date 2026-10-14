import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname,'public','index.html');

const a2aPartFiles = [
  'a2a.part01.b64',
  'a2a.part02.b64',
  'a2a.part03.b64',
  'a2a.part04.b64',
  'a2a.part05.b64'
].map(name => path.join(__dirname,'assets','a2a',name));
const a2aBase64 = (await Promise.all(a2aPartFiles.map(part => fs.readFile(part,'utf8')))).join('').replace(/\s+/g,'');
const a2aPng = Buffer.from(a2aBase64,'base64');
const a2aHash = createHash('sha256').update(a2aPng).digest('hex');
const expectedA2aHash = 'e75fa32edf9d2b62ca12933f1967e3beae14a95a33c669261e8610816d74c5f2';
if (a2aHash !== expectedA2aHash) throw new Error(`A2A sponsor image checksum mismatch: ${a2aHash}`);
const sponsorDir = path.join(__dirname,'public','images','sponsors');
await fs.mkdir(sponsorDir,{recursive:true});
await fs.writeFile(path.join(sponsorDir,'a2a.png'),a2aPng);

let html = await fs.readFile(file,'utf8');

html = html.replaceAll('v0.0.14','v1.0.0-rc.1');
html = html.replaceAll('v0.0.15','v1.0.0-rc.1');
html = html.replaceAll('<span class="beta-pill">BETA</span>','<span class="beta-pill">RC</span>');

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

html = html.replaceAll('/journey-banner-colours.css?v=20261014-1','/journey-banner-colours.css?v=20261014-3');
html = html.replaceAll('/journey-banner-colours.css?v=20261014-2','/journey-banner-colours.css?v=20261014-3');
const journeyStyle = '<link rel="stylesheet" href="/journey-banner-colours.css?v=20261014-3">';
if (!html.includes('/journey-banner-colours.css?v=20261014-3')) html = html.replace('</head>', journeyStyle + '\n</head>');

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
  '<script src="/full-app-loader.js?v=20261014-rc4"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc5"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc6"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc7"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc8"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc9"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc10"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc11"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc12"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc13"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc14"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc15"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc16"></script>'
];
const loader = '<script src="/full-app-loader.js?v=20261014-rc17"></script>';
for (const oldLoader of oldLoaders) {
  if (html.includes(oldLoader)) html = html.replace(oldLoader, loader);
}
if (!html.includes('/full-app-loader.js?v=20261014-rc17')) html = html.replace('</html>', loader + '</html>');

await fs.writeFile(file,html,'utf8');
console.log('App shell patched to Massive Simulations 32 Companion App v1.0.0-rc.1');
