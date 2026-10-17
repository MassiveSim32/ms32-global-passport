import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(__dirname,'public','index.html');
let html=await fs.readFile(file,'utf8');
html=html.replace(/\/full-app-loader\.js\?v=1\.0\.1-activeflight\d+/g,'/full-app-loader.js?v=1.0.1-activeflight11');
await fs.writeFile(file,html,'utf8');
console.log('Active flight loader cache refreshed for flight type styling');
