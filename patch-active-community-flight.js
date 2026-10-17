import fs from 'node:fs/promises';

const file='server.js';
let src=await fs.readFile(file,'utf8');

const marker="app.get('/api/events',(req,res)=>{";
const route=`app.get('/api/events/active',mustAuth,(req,res)=>{\n  const now=Date.now();\n  const userId=String(req.authUser.id);\n  const active=[...registrations.values()].filter(r=>{\n    if(String(r.userId)!==userId) return false;\n    const start=Date.parse(r.start||'');\n    if(!Number.isFinite(start)||start>now) return false;\n    const event=cachedEvents.find(e=>e.id===r.eventId);\n    const eventStatus=Number(event?.status||0);\n    if(eventStatus===3||eventStatus===4) return false;\n    const end=Date.parse(r.end||event?.scheduled_end_time||'');\n    const cutoff=Number.isFinite(end)?end+(2*60*60*1000):start+(8*60*60*1000);\n    return now<=cutoff;\n  }).map(r=>{\n    const event=cachedEvents.find(e=>e.id===r.eventId);\n    const base=event?normalizeEvent(event):{id:r.eventId,name:r.eventName||'MS32 Community Flight',description:'',start:r.start,end:r.end||null,status:2,channelId:r.channelId||null,entityType:null,userCount:0,image:null};\n    return {...base,statusInfo:{registered:true,...registrationView(r)}};\n  });\n  active.sort((a,b)=>Date.parse(b.start||0)-Date.parse(a.start||0));\n  res.set('Cache-Control','no-store');\n  res.json(active);\n});\n\n`;

const existing=/app\.get\('\/api\/events\/active',[\s\S]*?\n\}\);\n\n/;
if(existing.test(src)){
  src=src.replace(existing,route);
}else{
  if(!src.includes(marker)) throw new Error('Could not find /api/events route to add active community flights endpoint');
  src=src.replace(marker,route+marker);
}

await fs.writeFile(file,src,'utf8');
console.log('Active community flight endpoint now follows the signed-in pilot registration and event time window');
