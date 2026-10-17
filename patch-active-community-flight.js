import fs from 'node:fs/promises';

const file='server.js';
let src=await fs.readFile(file,'utf8');

const marker="app.get('/api/events',(req,res)=>{";
const route=`app.get('/api/events/active',(req,res)=>{\n  const active=cachedEvents.filter(e=>Number(e?.status)===2);\n  res.set('Cache-Control','no-store');\n  res.json(active.map(normalizeEvent));\n});\n\n`;

if(!src.includes("app.get('/api/events/active'")){
  if(!src.includes(marker)) throw new Error('Could not find /api/events route to add active community flights endpoint');
  src=src.replace(marker,route+marker);
}

await fs.writeFile(file,src,'utf8');
console.log('Active Discord community flights endpoint applied');
