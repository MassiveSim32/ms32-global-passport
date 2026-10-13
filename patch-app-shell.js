import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname,'public','index.html');

let html = await fs.readFile(file,'utf8');

html = html.replaceAll('v0.0.14','v0.0.15');

if (!html.includes('http-equiv="Cache-Control"')) {
  html = html.replace(
    '<head>',
    '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">'
  );
}

// Normal pilots receive index.html via express.static(), which bypasses the
// server response.send() enhancement hook used by the admin account. Add one
// small loader to the static shell so every beta pilot receives the same full
// Companion App features, including Flying Now, Journey Points and new stamps.
const loader = '<script src="/full-app-loader.js?v=20261013-15"></script>';
if (!html.includes('/full-app-loader.js?v=20261013-15')) {
  html = html.replace('</html>', loader + '</html>');
}

await fs.writeFile(file,html,'utf8');
console.log('App shell patched to full v0.0.15 Companion App loader');
