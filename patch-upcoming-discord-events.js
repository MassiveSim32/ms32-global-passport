import fs from 'node:fs/promises';

const file='server.js';
let src=await fs.readFile(file,'utf8');

const target="app.get('/api/events',(req,res)=>res.json(cachedEvents.map(normalizeEvent)));";
const replacement=`app.get('/api/events',(req,res)=>{
  const now=Date.now();
  const upcoming=cachedEvents.filter(e=>{
    const scheduled=Number(e?.status)===1;
    const start=Date.parse(e?.scheduled_start_time||'');
    return scheduled && Number.isFinite(start) && start>now;
  });
  res.set('Cache-Control','no-store');
  res.json(upcoming.map(normalizeEvent));
});`;

if(src.includes(target)){
  src=src.replace(target,replacement);
}else if(!src.includes("const upcoming=cachedEvents.filter")){
  throw new Error('Could not find /api/events route to apply upcoming Discord event filter');
}

await fs.writeFile(file,src,'utf8');
console.log('Upcoming flights now include future Discord scheduled events only');
