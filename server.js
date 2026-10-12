import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const sessionStore = new session.MemoryStore();

app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', maxAge:1000*60*60*24*30 }
}));

const cfg = {
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  linkChannelId: process.env.DISCORD_LINK_CHANNEL_ID || null,
  fallbackVoiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID || null,
  thresholdMs: Number(process.env.ATTENDANCE_MINUTES || 30) * 60_000
};

const registrations = new Map();
const voiceStarts = new Map();
const voiceChannelsByUser = new Map();
const linkCodes = new Map();
let cachedEvents = [];
let eventCachePrimed = false;
let guildOnline = false;
let gatewayReady = false;
let gatewayUser = null;
let gatewaySocket = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let gatewaySequence = null;

function mustAuth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Not signed in'}); next(); }
function key(userId,eventId){ return `${userId}:${eventId}`; }
function makeCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=a[crypto.randomInt(0,a.length)]; return s; }
function cleanupCodes(){ const now=Date.now(); for(const [c,e] of linkCodes) if(e.expiresAt<=now) linkCodes.delete(c); }
function eventChannel(event){ return event?.channel_id || cfg.fallbackVoiceChannelId; }

function normalizeEvent(e){
  return {
    id:e.id,
    name:e.name,
    description:e.description||'',
    start:e.scheduled_start_time,
    end:e.scheduled_end_time,
    status:e.status,
    channelId:e.channel_id||null,
    entityType:e.entity_type,
    userCount:e.user_count||0,
    image:e.image||null
  };
}
function upsertEvent(event){
  if(!event || event.guild_id!==cfg.guildId) return;
  const i=cachedEvents.findIndex(e=>e.id===event.id);
  if(i>=0) cachedEvents[i]={...cachedEvents[i],...event}; else cachedEvents.push(event);
  cachedEvents.sort((a,b)=>new Date(a.scheduled_start_time||0)-new Date(b.scheduled_start_time||0));
}
function removeEvent(event){ if(event?.id) cachedEvents=cachedEvents.filter(e=>e.id!==event.id); }
function relevantEventForChannel(userId,channelId){
  const now=Date.now();
  const candidates=[...registrations.values()].filter(r=>r.userId===userId&&r.channelId===channelId&&!r.claimed);
  candidates.sort((a,b)=>Math.abs(new Date(a.start).getTime()-now)-Math.abs(new Date(b.start).getTime()-now));
  return candidates[0]||null;
}
function addElapsed(record,start,end=Date.now()){
  if(!record||!start) return;
  record.attendanceMs += Math.max(0,end-start);
  record.verified = record.attendanceMs >= cfg.thresholdMs;
}
function handleVoiceState(userId,oldCh,newCh){
  if(oldCh===newCh) return;
  if(oldCh){
    const r=relevantEventForChannel(userId,oldCh);
    if(r){ const k=key(userId,r.eventId); addElapsed(r,voiceStarts.get(k)); voiceStarts.delete(k); }
  }
  if(newCh){
    const r=relevantEventForChannel(userId,newCh);
    if(r) voiceStarts.set(key(userId,r.eventId),Date.now());
  }
}
function seedGuildState(guild){
  if(!guild || guild.id!==cfg.guildId) return;
  guildOnline=true;
  if(Array.isArray(guild.guild_scheduled_events)){
    cachedEvents=[];
    for(const e of guild.guild_scheduled_events) upsertEvent(e);
    eventCachePrimed=true;
    console.log(`Discord event cache primed from Gateway: ${cachedEvents.length} scheduled event(s)`);
  }
  if(Array.isArray(guild.voice_states)){
    voiceChannelsByUser.clear();
    for(const v of guild.voice_states){ if(v?.user_id&&v?.channel_id) voiceChannelsByUser.set(v.user_id,v.channel_id); }
    console.log(`Discord voice cache primed from Gateway: ${voiceChannelsByUser.size} active voice state(s)`);
  }
}

function sendGateway(payload){ if(gatewaySocket?.readyState===WebSocket.OPEN) gatewaySocket.send(JSON.stringify(payload)); }
function scheduleReconnect(reason='connection closed'){
  gatewayReady=false; guildOnline=false;
  if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer=null; }
  if(reconnectTimer||!cfg.botToken) return;
  console.warn(`Discord Gateway reconnect scheduled: ${reason}`);
  reconnectTimer=setTimeout(()=>{ reconnectTimer=null; startGateway(); },5000);
}
function startGateway(){
  if(!cfg.botToken){ console.warn('Discord Gateway not started: bot token missing'); return; }
  if(gatewaySocket&&(gatewaySocket.readyState===WebSocket.OPEN||gatewaySocket.readyState===WebSocket.CONNECTING)) return;
  console.log('Starting Discord Gateway connection...');
  const ws=new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
  gatewaySocket=ws;
  ws.addEventListener('close',e=>{ if(gatewaySocket===ws) gatewaySocket=null; scheduleReconnect(`close code ${e.code}`); });
  ws.addEventListener('error',()=>console.error('Discord Gateway socket error'));
  ws.addEventListener('message',event=>{
    let p; try{p=JSON.parse(String(event.data));}catch{return;}
    if(p.s!=null) gatewaySequence=p.s;
    if(p.op===10){
      const interval=Number(p.d?.heartbeat_interval||45000);
      if(heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer=setInterval(()=>sendGateway({op:1,d:gatewaySequence}),interval);
      sendGateway({op:2,d:{token:cfg.botToken,intents:65665,properties:{os:'linux',browser:'ms32-global-passport',device:'ms32-global-passport'}}});
      return;
    }
    if(p.op===7||p.op===9){ try{ws.close(4000,'gateway reconnect');}catch{} return; }
    if(p.op!==0) return;

    if(p.t==='READY'){
      gatewayReady=true; gatewayUser=p.d?.user||null;
      const name=gatewayUser?.global_name||gatewayUser?.username||gatewayUser?.id||'unknown';
      console.log(`Discord Gateway READY as ${name}`);
      return;
    }
    if(p.t==='GUILD_CREATE'){ seedGuildState(p.d); return; }
    if(p.t==='GUILD_DELETE'&&p.d?.id===cfg.guildId){ guildOnline=false; return; }
    if(p.t==='VOICE_STATE_UPDATE'){
      const d=p.d; if(d?.guild_id!==cfg.guildId||!d.user_id) return;
      const oldCh=voiceChannelsByUser.get(d.user_id)||null, newCh=d.channel_id||null;
      if(newCh) voiceChannelsByUser.set(d.user_id,newCh); else voiceChannelsByUser.delete(d.user_id);
      handleVoiceState(d.user_id,oldCh,newCh); return;
    }
    if(p.t==='GUILD_SCHEDULED_EVENT_CREATE'||p.t==='GUILD_SCHEDULED_EVENT_UPDATE'){ upsertEvent(p.d); eventCachePrimed=true; return; }
    if(p.t==='GUILD_SCHEDULED_EVENT_DELETE'){ removeEvent(p.d); eventCachePrimed=true; return; }
    if(p.t==='GUILD_SCHEDULED_EVENT_USER_ADD'||p.t==='GUILD_SCHEDULED_EVENT_USER_REMOVE'){
      const e=cachedEvents.find(x=>x.id===p.d?.guild_scheduled_event_id);
      if(e){ const delta=p.t.endsWith('_ADD')?1:-1; e.user_count=Math.max(0,Number(e.user_count||0)+delta); }
    }
  });
}
startGateway();

app.get('/health',(req,res)=>res.json({
  ok:true,
  bot:gatewayReady,
  gatewayMode:'direct',
  guildOnline,
  eventsFromGateway:true,
  eventCachePrimed,
  cachedEventCount:cachedEvents.length,
  voiceStateCount:voiceChannelsByUser.size,
  loginMode:'discord-bot-link'
}));

app.get('/auth/discord',(req,res)=>{
  if(req.session.user) return res.redirect('/');
  cleanupCodes(); let code=makeCode(); while(linkCodes.has(code)) code=makeCode();
  linkCodes.set(code,{sessionId:req.sessionID,expiresAt:Date.now()+10*60_000});
  req.session.linkCode=code; req.session.save(()=>{});
  const web=cfg.linkChannelId?`https://discord.com/channels/${cfg.guildId}/${cfg.linkChannelId}`:`https://discord.com/channels/${cfg.guildId}`;
  const deep=cfg.linkChannelId?`discord:///channels/${cfg.guildId}/${cfg.linkChannelId}`:`discord:///channels/${cfg.guildId}`;
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect Discord</title><style>body{margin:0;background:#06101b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}.card{width:min(420px,90vw);background:#0d1b2b;border:1px solid #26435e;border-radius:24px;padding:28px;text-align:center}.eyebrow{color:#4bb8ff;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.code{font-size:42px;letter-spacing:.16em;font-weight:900;color:#ff9f2f;margin:18px 0}.cmd{background:#07111d;border:1px solid #29465f;border-radius:14px;padding:14px;font-family:ui-monospace,monospace;color:#cfe9ff}.muted{color:#8ea7bb;line-height:1.5}.warn{color:#ffbd66}.btn{display:block;width:100%;border:0;margin-top:12px;padding:13px;border-radius:14px;background:#5865f2;color:#fff;text-decoration:none;font-weight:800}</style></head><body><div class="card"><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1>Connect your Discord</h1><p class="warn">Discord's HTTP API is currently rate-limiting this Render server, so command linking may be unavailable while we restore direct Discord sign-in.</p><div class="cmd">/passport link code:${code}</div><div class="code">${code}</div><p id="status" class="muted">Waiting for Discord…</p><button class="btn" id="open">Open Passport Link Channel</button><a class="btn" href="${web}" style="background:#102439">Open in Browser</a></div><script>open.onclick=()=>{location.href=${JSON.stringify(deep)};setTimeout(()=>{if(!document.hidden)location.href=${JSON.stringify(web)}},1200)};setInterval(async()=>{try{const j=await (await fetch('/api/link/status')).json();if(j.linked)location.href='/'}catch{}},1500)</script></body></html>`);
});

app.get('/api/link/status',(req,res)=>res.json({linked:!!req.session.user,user:req.session.user||null,botReady:gatewayReady}));
app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null,botReady:gatewayReady}));

app.get('/api/events',mustAuth,(req,res)=>{
  res.json(cachedEvents.map(normalizeEvent));
});
app.post('/api/events/:id/join',mustAuth,(req,res)=>{
  const e=cachedEvents.find(x=>x.id===req.params.id);
  if(!e) return res.status(404).json({error:eventCachePrimed?'Scheduled event not found':'Discord event cache is still starting. Try again shortly.'});
  const k=key(req.session.user.id,e.id);
  const r=registrations.get(k)||{userId:req.session.user.id,eventId:e.id,eventName:e.name,start:e.scheduled_start_time,end:e.scheduled_end_time,channelId:eventChannel(e),attendanceMs:0,verified:false,claimed:false};
  registrations.set(k,r);
  if(voiceChannelsByUser.get(r.userId)===r.channelId&&!voiceStarts.has(k)) voiceStarts.set(k,Date.now());
  res.json({ok:true,registration:r});
});
app.get('/api/events/:id/status',mustAuth,(req,res)=>{
  const k=key(req.session.user.id,req.params.id), r=registrations.get(k);
  if(!r) return res.json({registered:false});
  let ms=r.attendanceMs; const active=voiceStarts.get(k); if(active) ms+=Date.now()-active;
  res.json({registered:true,inVoice:!!active,attendanceMinutes:Math.floor(ms/60000),thresholdMinutes:Math.ceil(cfg.thresholdMs/60000),verified:ms>=cfg.thresholdMs,eventName:r.eventName,channelId:r.channelId,claimed:r.claimed});
});
app.post('/api/events/:id/claim',mustAuth,(req,res)=>{
  const k=key(req.session.user.id,req.params.id), r=registrations.get(k);
  if(!r) return res.status(404).json({error:'Not registered'});
  let ms=r.attendanceMs; const active=voiceStarts.get(k); if(active){ms+=Date.now()-active;r.attendanceMs=ms;voiceStarts.delete(k);}
  if(ms<cfg.thresholdMs) return res.status(403).json({error:'Attendance threshold not met'});
  r.verified=true; r.claimed=true;
  res.json({ok:true,event:{id:r.eventId,name:r.eventName},attendanceMinutes:Math.floor(ms/60000)});
});

app.use(express.static(path.join(__dirname,'public')));
app.use((req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`MS32 Global Passport v0.0.7 gateway-cache listening on ${port}`));
