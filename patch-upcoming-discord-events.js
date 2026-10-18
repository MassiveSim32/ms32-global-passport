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

// Separate activity endpoint: /api/events intentionally contains only future flights.
// The activity indicator must inspect the full Discord event cache instead.
const activityMarker="app.get('/api/events/activity',";
const activityRoute=`app.get('/api/events/activity',(req,res)=>{
  const now=Date.now();
  const active=cachedEvents.some(e=>{
    const status=Number(e?.status);
    if(status!==1&&status!==2)return false;
    const start=Date.parse(e?.scheduled_start_time||'');
    const end=Date.parse(e?.scheduled_end_time||'');
    return Number.isFinite(start)&&start<=now&&Number.isFinite(end)&&now<end;
  });
  res.set('Cache-Control','no-store');
  res.json({communityActive:active});
});

`;
if(!src.includes(activityMarker)){
  const eventRouteAnchor="app.get('/api/events',";
  if(!src.includes(eventRouteAnchor))throw new Error('Could not find events route for activity summary');
  src=src.replace(eventRouteAnchor,activityRoute+eventRouteAnchor);
}

await fs.writeFile(file,src,'utf8');
console.log('Upcoming flights now include future Discord scheduled events only');
