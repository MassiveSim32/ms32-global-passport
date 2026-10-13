import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname,'public','index.html');

let html = await fs.readFile(file,'utf8');
html = html.replaceAll('v0.0.14','v0.0.15');
if (!html.includes('http-equiv="Cache-Control"')) {
  html = html.replace('<head>','<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">');
}
await fs.writeFile(file,html,'utf8');
console.log('App shell patched to v0.0.15 with no-cache meta headers');
