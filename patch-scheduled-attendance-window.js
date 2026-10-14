import fs from 'node:fs/promises';

const file='server.js';
let src=await fs.readFile(file,'utf8');

const oldRelevant=`function relevantEventForChannel(userId,channelId){
  const now=Date.now();
  const candidates=[...registrations.values()].filter(r=>r.userId===userId&&r.channelId===channelId&&!r.claimed);
  candidates.sort((a,b)=>Math.abs(new Date(a.start).getTime()-now)-Math.abs(new Date(b.start).getTime()-now));
  return candidates[0]||null;
}`;

const newRelevant=`function relevantEventForChannel(userId,channelId){
  const now=Date.now();
  const windowMs=3*60*60*1000;
  const candidates=[...registrations.values()].filter(r=>{
    if(r.userId!==userId||r.channelId!==channelId||r.claimed)return false;
    const start=new Date(r.start||0).getTime();
    return Number.isFinite(start)&&start>0&&now>=start&&now<start+windowMs;
  });
  candidates.sort((a,b)=>new Date(b.start).getTime()-new Date(a.start).getTime());
  return candidates[0]||null;
}`;

const oldElapsed=`function addElapsed(record,start,end=Date.now()){
  if(!record||!start) return;
  record.attendanceMs += Math.max(0,end-start);
  record.verified = record.attendanceMs >= cfg.thresholdMs;
}`;

const newElapsed=`function addElapsed(record,start,end=Date.now()){
  if(!record||!start) return;
  const eventStart=new Date(record.start||0).getTime();
  if(!Number.isFinite(eventStart)||eventStart<=0)return;
  const eventEnd=eventStart+(3*60*60*1000);
  const from=Math.max(Number(start),eventStart);
  const to=Math.min(Number(end),eventEnd);
  record.attendanceMs += Math.max(0,to-from);
  record.verified = record.attendanceMs >= cfg.thresholdMs;
}`;

if(!src.includes(oldRelevant)) throw new Error('Scheduled attendance event-selection patch target not found');
if(!src.includes(oldElapsed)) throw new Error('Scheduled attendance elapsed patch target not found');

src=src.replace(oldRelevant,newRelevant).replace(oldElapsed,newElapsed);
await fs.writeFile(file,src);
console.log('Scheduled attendance window patch applied; pre-event comms cannot count');
