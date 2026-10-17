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

html = html.replaceAll('v0.0.14','v1.0.1');
html = html.replaceAll('v0.0.15','v1.0.1');
html = html.replaceAll('v1.0.0-rc.1','v1.0.1');
html = html.replaceAll('COMPANION APP · V1.0.0','COMPANION APP · V1.0.1');
html = html.replaceAll('<strong>v1.0.0</strong>','<strong>v1.0.1</strong>');
html = html.replaceAll('<span class="beta-pill">BETA</span>','<span class="beta-pill">V1</span>');
html = html.replaceAll('<span class="beta-pill">RC</span>','<span class="beta-pill">V1</span>');

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

const bootStyle = `<style id="ms32BootStyle">
html:not(.ms32-ready) .phone{visibility:hidden!important}
html:not(.ms32-ready) body::before{content:"";position:fixed;inset:0;z-index:2147483646;background:radial-gradient(circle at top,#12314c,#06101b 52%,#02070c)}
html:not(.ms32-ready) body::after{content:"MS32 COMPANION APP  ·  V1.0.1\\A Loading latest app…";white-space:pre;position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);color:#f5f8fb;text-align:center;font:800 13px/1.8 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:18px 24px;border:1px solid #2b506d;border-radius:18px;background:#0b1927e8;box-shadow:0 22px 60px #0008}
</style><script>setTimeout(()=>document.documentElement.classList.add('ms32-ready'),8000)</script>`;
if (!html.includes('id="ms32BootStyle"')) html = html.replace('</head>', bootStyle + '\n</head>');

const quickColours = '<link rel="stylesheet" href="/home-quick-colours.css?v=20261014-1">';
if (!html.includes('/home-quick-colours.css?v=20261014-1')) html = html.replace('</head>', quickColours + '\n</head>');

const spontaneousStyle = '<link rel="stylesheet" href="/spontaneous-flight-style.css?v=20261014-1">';
if (!html.includes('/spontaneous-flight-style.css?v=20261014-1')) html = html.replace('</head>', spontaneousStyle + '\n</head>');

html = html.replaceAll('/desktop-layout.css?v=20261016-1','/desktop-layout.css?v=20261016-3');
html = html.replaceAll('/desktop-layout.css?v=20261016-2','/desktop-layout.css?v=20261016-3');
const desktopLayout = '<link rel="stylesheet" href="/desktop-layout.css?v=20261016-3">';
if (!html.includes('/desktop-layout.css?v=20261016-3')) html = html.replace('</head>', desktopLayout + '\n</head>');

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
  '<script src="/full-app-loader.js?v=20261014-rc16"></script>',
  '<script src="/full-app-loader.js?v=20261014-rc17"></script>',
  '<script src="/full-app-loader.js?v=1.0.0"></script>',
  '<script src="/full-app-loader.js?v=1.0.1"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-upcoming2"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-fastboot1"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-activeflight1"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-activeflight2"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-activeflight3"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-activeflight4"></script>',
  '<script src="/full-app-loader.js?v=1.0.1-activeflight5"></script>'
];
const loader = '<script src="/full-app-loader.js?v=1.0.1-activeflight6"></script>';
for (const oldLoader of oldLoaders) {
  if (html.includes(oldLoader)) html = html.replace(oldLoader, loader);
}
if (!html.includes('/full-app-loader.js?v=1.0.1-activeflight6')) html = html.replace('</html>', loader + '</html>');

await fs.writeFile(file,html,'utf8');
console.log('App shell patched to Massive Simulations 32 Companion App v1.0.1 with Canadian passport stamp correction');
