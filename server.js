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
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*24*30 }
}));

const cfg = {
  clientId: process.env.DISCORD_CLIENT_ID,
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
let gatewayReady = false;
let gatewayUser = null;
let gatewaySocket = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let gatewaySequence = null;

function mustAuth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Not signed in'}); next(); }
function key(userId,eventId){ return `${userId}:${eventId}`; }
function makeCode(){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out='';
  for(let i=0;i<6;i++) out += alphabet[crypto.randomInt(0,alphabet.length)];
  return out;
}
function cleanupCodes(){
  const now=Date.now();
  for(const [code,entry] of linkCodes) if(entry.expiresAt<=now) linkCodes.delete(code);
}

async function discordApi(endpoint, token, scheme='Bot') {
  const r = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers:{ Authorization:`${scheme} ${token}`, Accept:'application/json' }
  });
  if(!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return r.status===204 ? null : r.json();
}

async function refreshEvents(){
  if(!cfg.botToken || !cfg.guildId) return cachedEvents;
  try{
    cachedEvents = await discordApi(`/guilds/${cfg.guildId}/scheduled-events?with_user_count=true`, cfg.botToken);
    return cachedEvents;
  }catch(e){
    if(cachedEvents.length) return cachedEvents;
    throw e;
  }
}

function upsertGatewayEvent(event){
  if(!event || event.guild_id!==cfg.guildId) return;
  const i=cachedEvents.findIndex(e=>e.id===event.id);
  if(i>=0) cachedEvents[i]=event; else cachedEvents.push(event);
}
function removeGatewayEvent(event){
  if(!event) return;
  cachedEvents=cachedEvents.filter(e=>e.id!==event.id);
}
function eventChannel(event){ return event?.channel_id || cfg.fallbackVoiceChannelId; }
function relevantEventForChannel(userId, channelId){
  const now = Date.now();
  const candidates = [...registrations.values()].filter(r => r.userId===userId && r.channelId===channelId && !r.claimed);
  candidates.sort((a,b)=>Math.abs(new Date(a.start).getTime()-now)-Math.abs(new Date(b.start).getTime()-now));
  return candidates[0] || null;
}
function addElapsed(record, start, end=Date.now()){
  if(!record || !start) return;
  record.attendanceMs += Math.max(0, end-start);
  record.verified = record.attendanceMs >= cfg.thresholdMs;
}
function handleVoiceState(userId, oldCh, newCh){
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

function scheduleGatewayReconnect(reason='connection closed'){
  gatewayReady=false;
  gatewayUser=null;
  if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer=null; }
  if(reconnectTimer || !cfg.botToken) return;
  console.warn(`Discord Gateway reconnect scheduled: ${reason}`);
  reconnectTimer=setTimeout(()=>{ reconnectTimer=null; startGateway(); },5000);
}

function sendGateway(payload){
  if(gatewaySocket?.readyState===WebSocket.OPEN) gatewaySocket.send(JSON.stringify(payload));
}

function startGateway(){
  if(!cfg.botToken){ console.warn('Discord Gateway not started: bot token missing'); return; }
  if(gatewaySocket && (gatewaySocket.readyState===WebSocket.OPEN || gatewaySocket.readyState===WebSocket.CONNECTING)) return;

  console.log('Starting Discord Gateway-first connection (no REST bootstrap)...');
  const ws=new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
  gatewaySocket=ws;

  ws.addEventListener('open',()=>console.log('Discord Gateway socket open'));
  ws.addEventListener('error',()=>console.error('Discord Gateway socket error'));
  ws.addEventListener('close',event=>{
    console.warn(`Discord Gateway socket closed (${event.code})`);
    if(gatewaySocket===ws) gatewaySocket=null;
    scheduleGatewayReconnect(`close code ${event.code}`);
  });
  ws.addEventListener('message',event=>{
    let packet;
    try{ packet=JSON.parse(String(event.data)); }catch{ return; }
    if(packet.s!=null) gatewaySequence=packet.s;

    if(packet.op===10){
      const interval=Number(packet.d?.heartbeat_interval||45000);
      if(heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer=setInterval(()=>sendGateway({op:1,d:gatewaySequence}),interval);
      sendGateway({
        op:2,
        d:{
          token:cfg.botToken,
          intents:65665,
          properties:{os:'linux',browser:'ms32-global-passport',device:'ms32-global-passport'}
        }
      });
      console.log('Discord Gateway IDENTIFY sent');
      return;
    }
    if(packet.op===7){
      try{ ws.close(4000,'reconnect requested'); }catch{}
      return;
    }
    if(packet.op===9){
      console.warn('Discord Gateway invalid session; reconnecting');
      try{ ws.close(4000,'invalid session'); }catch{}
      return;
    }
    if(packet.op!==0) return;

    if(packet.t==='READY'){
      gatewayReady=true;
      gatewayUser=packet.d?.user || null;
      const name=gatewayUser?.global_name || gatewayUser?.username || gatewayUser?.id || 'unknown';
      console.log(`Discord Gateway READY as ${name}`);
      console.log('Gateway-first mode active: voice attendance enabled without Discord REST startup calls');
      return;
    }
    if(packet.t==='VOICE_STATE_UPDATE'){
      const d=packet.d;
      if(d?.guild_id!==cfg.guildId || !d.user_id) return;
      const oldCh=voiceChannelsByUser.get(d.user_id)||null;
      const newCh=d.channel_id||null;
      if(newCh) voiceChannelsByUser.set(d.user_id,newCh); else voiceChannelsByUser.delete(d.user_id);
      handleVoiceState(d.user_id,oldCh,newCh);
      return;
    }
    if(packet.t==='GUILD_SCHEDULED_EVENT_CREATE' || packet.t==='GUILD_SCHEDULED_EVENT_UPDATE') upsertGatewayEvent(packet.d);
    if(packet.t==='GUILD_SCHEDULED_EVENT_DELETE') removeGatewayEvent(packet.d);
  });
}

startGateway();

app.get('/health',(req,res)=>res.json({
  ok:true,
  bot:gatewayReady,
  gatewayMode:'direct',
  gatewayUser:gatewayUser ? {id:gatewayUser.id,username:gatewayUser.username} : null,
  guildConfigured:!!cfg.guildId,
  linkChannelConfigured:!!cfg.linkChannelId,
  cachedEventCount:cachedEvents.length,
  loginMode:'discord-bot-link'
}));

app.get('/auth/discord',(req,res)=>{
  if(req.session.user) return res.redirect('/');
  cleanupCodes();
  let code=makeCode();
  while(linkCodes.has(code)) code=makeCode();
  linkCodes.set(code,{sessionId:req.sessionID,expiresAt:Date.now()+10*60_000});
  req.session.linkCode=code;
  req.session.save(()=>{});
  const discordWebLink = cfg.linkChannelId ? `https://discord.com/channels/${cfg.guildId}/${cfg.linkChannelId}` : `https://discord.com/channels/${cfg.guildId}`;
  const discordAppLink = cfg.linkChannelId ? `discord:///channels/${cfg.guildId}/${cfg.linkChannelId}` : `discord:///channels/${cfg.guildId}`;
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect Discord</title><style>body{margin:0;background:#06101b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}.card{width:min(420px,90vw);background:#0d1b2b;border:1px solid #26435e;border-radius:24px;padding:28px;text-align:center}.eyebrow{color:#4bb8ff;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.code{font-size:42px;letter-spacing:.16em;font-weight:900;color:#ff9f2f;margin:18px 0}.cmd{background:#07111d;border:1px solid #29465f;border-radius:14px;padding:14px;font-family:ui-monospace,monospace;color:#cfe9ff}.muted{color:#8ea7bb;line-height:1.5}.ok{color:#45d18e;font-weight:800}.warn{color:#ffbd66}.btn{display:block;width:100%;border:0;margin-top:12px;padding:13px;border-radius:14px;background:#5865f2;color:white;text-decoration:none;font-weight:800;cursor:pointer;font-size:14px}.btn.secondary{background:#102439;border:1px solid #2b4a64}</style></head><body><div class="card"><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1>Connect your Discord</h1><p class="muted">The Passport bot is now using a Gateway-first connection because Discord is rate-limiting Render's REST traffic.</p><p class="warn">The existing /passport link command may remain unavailable until Discord REST access recovers. We are keeping this page for testing while direct Discord sign-in is restored.</p><div class="cmd">/passport link code:${code}</div><div class="code">${code}</div><p id="status" class="muted">Waiting for Discord…</p><button class="btn" id="openDiscord">Open Passport Link Channel in Discord</button><a class="btn secondary" href="${discordWebLink}">Open Channel in Browser</a><p class="muted" style="font-size:12px">This code expires in 10 minutes. The bot never listens to or records voice audio.</p></div><script>document.getElementById('openDiscord').addEventListener('click',()=>{const web=${JSON.stringify(discordWebLink)};const app=${JSON.stringify(discordAppLink)};window.location.href=app;setTimeout(()=>{if(!document.hidden) window.location.href=web},1200)});const timer=setInterval(async()=>{try{const r=await fetch('/api/link/status');const j=await r.json();if(j.linked){clearInterval(timer);document.getElementById('status').className='ok';document.getElementById('status').textContent='Discord connected ✓ Returning to Passport…';setTimeout(()=>location.href='/',900)}}catch{}},1500)</script></body></html>`);
});

app.get('/api/link/status',(req,res)=>res.json({linked:!!req.session.user,user:req.session.user||null,botReady:gatewayReady}));
app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null,botReady:gatewayReady}));

app.get('/api/events',mustAuth,async(req,res)=>{
  try{
    const events=await refreshEvents();
    res.json(events.map(e=>({id:e.id,name:e.name,description:e.description||'',start:e.scheduled_start_time,end:e.scheduled_end_time,status:e.status,channelId:e.channel_id||null,entityType:e.entity_type,userCount:e.user_count||0,image:e.image||null})));
  }catch(e){
    res.status(502).json({error:e.message,gatewayOnline:gatewayReady,cachedEventCount:cachedEvents.length});
  }
});

app.post('/api/events/:id/join',mustAuth,async(req,res)=>{
  try{
    if(!cachedEvents.length) await refreshEvents();
    const e=cachedEvents.find(x=>x.id===req.params.id);
    if(!e) return res.status(404).json({error:'Scheduled event not found'});
    const existing=registrations.get(key(req.session.user.id,e.id));
    const record=existing || {userId:req.session.user.id,eventId:e.id,eventName:e.name,start:e.scheduled_start_time,end:e.scheduled_end_time,channelId:eventChannel(e),attendanceMs:0,verified:false,claimed:false};
    registrations.set(key(record.userId,record.eventId),record);
    if(voiceChannelsByUser.get(record.userId)===record.channelId && !voiceStarts.has(key(record.userId,record.eventId))) voiceStarts.set(key(record.userId,record.eventId),Date.now());
    res.json({ok:true,registration:record});
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/events/:id/status',mustAuth,(req,res)=>{
  const k=key(req.session.user.id,req.params.id); const r=registrations.get(k); if(!r) return res.json({registered:false});
  let attendanceMs=r.attendanceMs; const activeStart=voiceStarts.get(k); if(activeStart) attendanceMs += Date.now()-activeStart;
  const verified=attendanceMs>=cfg.thresholdMs;
  res.json({registered:true,inVoice:!!activeStart,attendanceMinutes:Math.floor(attendanceMs/60000),thresholdMinutes:Math.ceil(cfg.thresholdMs/60000),verified,eventName:r.eventName,channelId:r.channelId,claimed:r.claimed});
});

app.post('/api/events/:id/claim',mustAuth,(req,res)=>{
  const k=key(req.session.user.id,req.params.id); const r=registrations.get(k); if(!r) return res.status(404).json({error:'Not registered'});
  let ms=r.attendanceMs; const activeStart=voiceStarts.get(k); if(activeStart){ ms += Date.now()-activeStart; r.attendanceMs=ms; voiceStarts.delete(k); }
  if(ms<cfg.thresholdMs) return res.status(403).json({error:'Attendance threshold not met'});
  r.verified=true; r.claimed=true; res.json({ok:true,event:{id:r.eventId,name:r.eventName},attendanceMinutes:Math.floor(ms/60000)});
});

app.use(express.static(path.join(__dirname,'public')));
app.use((req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`MS32 Global Passport v0.0.6 gateway-first listening on ${port}`));
