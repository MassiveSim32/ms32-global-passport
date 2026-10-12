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
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  redirectUri: process.env.NODE_ENV === 'production'
    ? 'https://ms32-global-passport.onrender.com/auth/discord/callback'
    : (process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback'),
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  fallbackVoiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID || null,
  thresholdMs: Number(process.env.ATTENDANCE_MINUTES || 30) * 60_000
};

const registrations = new Map();
const voiceStarts = new Map();
const voiceChannelsByUser = new Map();
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
function eventChannel(event){ return event?.channel_id || cfg.fallbackVoiceChannelId; }
function safeHtml(s=''){ return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }

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

function oauthErrorPage(res,title,message){
  res.status(503).type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeHtml(title)}</title><style>body{margin:0;background:#06101b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}.card{width:min(440px,90vw);background:#0d1b2b;border:1px solid #26435e;border-radius:24px;padding:28px;text-align:center}.eyebrow{color:#4bb8ff;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.muted{color:#8ea7bb;line-height:1.55}.warn{color:#ffbd66}.btn{display:block;padding:13px 16px;border-radius:14px;background:#5865f2;color:#fff;text-decoration:none;font-weight:800;margin-top:14px}</style></head><body><div class="card"><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1>${safeHtml(title)}</h1><p class="muted">${safeHtml(message)}</p><a class="btn" href="/auth/discord">Try Discord Again</a><a class="btn" href="/" style="background:#102439">Back to Passport</a></div></body></html>`);
}

app.get('/health',(req,res)=>res.json({
  ok:true,
  bot:gatewayReady,
  gatewayMode:'direct',
  guildOnline,
  eventsFromGateway:true,
  eventCachePrimed,
  cachedEventCount:cachedEvents.length,
  voiceStateCount:voiceChannelsByUser.size,
  oauthConfigured:!!(cfg.clientId&&cfg.clientSecret&&cfg.guildId),
  loginMode:'discord-oauth'
}));

app.get('/flights-preview',(req,res)=>{
  const cards=cachedEvents.map(e=>{
    const start=e.scheduled_start_time?new Date(e.scheduled_start_time).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'Australia/Hobart'}):'TBA';
    const desc=safeHtml(e.description||'').replace(/\n/g,'<br>');
    const voice=e.channel_id?'Voice channel linked':'No voice channel linked';
    return `<article class="event"><div class="source">Discord Scheduled Event</div><h2>${safeHtml(e.name)}</h2><div class="meta">${safeHtml(start)} · ${voice}</div>${desc?`<p>${desc}</p>`:''}<div class="row"><span>${Number(e.user_count||0)} interested</span><span>${e.channel_id?'Attendance ready':'Attendance mapping needed'}</span></div></article>`;
  }).join('');
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MS32 Upcoming Flights</title><style>:root{--bg:#06101b;--panel:#0d1b2b;--line:#26435e;--text:#f5f8fb;--muted:#8ea7bb;--orange:#ff9f2f;--blue:#4bb8ff;--green:#45d18e}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#12314c,#06101b 48%,#02070c);color:var(--text);font:14px system-ui;min-height:100vh}.wrap{max-width:760px;margin:auto;padding:28px 18px 60px}.eyebrow{color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}h1{font-size:34px;margin:6px 0}.pill{padding:8px 11px;border:1px solid var(--line);border-radius:999px;color:var(--green);font-weight:800;font-size:11px}.event{background:linear-gradient(145deg,#10283c,#091725);border:1px solid var(--line);border-radius:22px;padding:18px;margin:12px 0}.source{font-size:10px;color:#b8bdff;font-weight:800;text-transform:uppercase}.event h2{margin:5px 0 4px;font-size:19px}.meta,.event p{color:var(--muted);line-height:1.5}.row{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #1c3549;margin-top:14px;padding-top:12px;font-size:11px;color:#bcd0df}.notice{margin-top:18px;padding:14px;border-radius:16px;background:#0b1725;border:1px solid #1d374e;color:var(--muted)}a{color:var(--orange)}</style></head><body><main class="wrap"><div class="hero"><div><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1>Upcoming Flights</h1><div style="color:var(--muted)">Live from Discord Gateway cache</div></div><div class="pill">${gatewayReady?'BOT ONLINE':'BOT CONNECTING'}</div></div>${eventCachePrimed?(cards||'<div class="notice">No scheduled events are currently published in Discord.</div>'):'<div class="notice">Discord event cache is still loading. Refresh in a few seconds.</div>'}<div class="notice">Read-only preview from the same event cache used by Passport attendance.</div></main></body></html>`);
});

app.get('/auth/discord',(req,res)=>{
  if(req.session.user) return res.redirect('/');
  if(!cfg.clientId||!cfg.clientSecret) return oauthErrorPage(res,'Discord sign-in is not configured','The Discord OAuth client ID or client secret is missing from the Singapore Render service.');
  const state=crypto.randomBytes(24).toString('hex');
  req.session.oauthState=state;
  req.session.save(err=>{
    if(err) return oauthErrorPage(res,'Could not start sign-in','Passport could not save the sign-in session. Please try again.');
    const u=new URL('https://discord.com/oauth2/authorize');
    u.searchParams.set('response_type','code');
    u.searchParams.set('client_id',cfg.clientId);
    u.searchParams.set('scope','identify guilds');
    u.searchParams.set('state',state);
    u.searchParams.set('redirect_uri',cfg.redirectUri);
    res.redirect(u.toString());
  });
});

app.get('/auth/discord/callback',async(req,res)=>{
  const {code,state,error,error_description:errorDescription}=req.query;
  if(error) return oauthErrorPage(res,'Discord sign-in cancelled',errorDescription||String(error));
  if(!code||!state||state!==req.session.oauthState){
    return oauthErrorPage(res,'Discord sign-in could not be verified','The sign-in state did not match. Please start again from Passport.');
  }
  delete req.session.oauthState;

  try{
    const tokenResponse=await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
      body:new URLSearchParams({
        client_id:cfg.clientId,
        client_secret:cfg.clientSecret,
        grant_type:'authorization_code',
        code:String(code),
        redirect_uri:cfg.redirectUri
      })
    });
    if(!tokenResponse.ok){
      const body=await tokenResponse.text();
      console.warn(`Discord OAuth token exchange failed: HTTP ${tokenResponse.status}`);
      if(tokenResponse.status===429||/1015|rate.?limit|cloudflare/i.test(body)){
        return oauthErrorPage(res,'Discord is temporarily rate-limiting sign-in','Passport reached Discord, but Discord is still blocking this Render server from completing OAuth. The bot and flights remain online. Please try again shortly.');
      }
      return oauthErrorPage(res,'Discord sign-in failed',`Discord returned HTTP ${tokenResponse.status} during sign-in.`);
    }
    const token=await tokenResponse.json();
    if(!token.access_token) return oauthErrorPage(res,'Discord sign-in failed','Discord did not return an access token.');

    const authHeaders={Authorization:`Bearer ${token.access_token}`,Accept:'application/json'};
    const [userResponse,guildsResponse]=await Promise.all([
      fetch('https://discord.com/api/v10/users/@me',{headers:authHeaders}),
      fetch('https://discord.com/api/v10/users/@me/guilds',{headers:authHeaders})
    ]);
    if(!userResponse.ok||!guildsResponse.ok){
      console.warn(`Discord OAuth profile lookup failed: user=${userResponse.status} guilds=${guildsResponse.status}`);
      return oauthErrorPage(res,'Discord sign-in could not finish','Discord authorized the account, but Passport could not verify the profile and Massive Sim 32 membership. Please try again shortly.');
    }
    const user=await userResponse.json();
    const guilds=await guildsResponse.json();
    const member=Array.isArray(guilds)&&guilds.some(g=>g.id===cfg.guildId);
    if(!member) return oauthErrorPage(res,'Massive Sim 32 membership required','This Discord account is not currently a member of the Massive Sim 32 server.');

    req.session.user={
      id:user.id,
      username:user.global_name||user.username,
      avatar:user.avatar||null,
      member:true
    };
    req.session.save(err=>{
      if(err) return oauthErrorPage(res,'Could not finish sign-in','Passport could not save the signed-in session. Please try again.');
      console.log('Discord OAuth sign-in completed');
      res.redirect('/');
    });
  }catch(e){
    console.error('Discord OAuth callback error:',e?.message||String(e));
    return oauthErrorPage(res,'Discord sign-in is temporarily unavailable','Passport could not complete the connection to Discord. The bot and live flights are still online. Please try again shortly.');
  }
});

app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null,botReady:gatewayReady}));

app.get('/api/events',(req,res)=>{
  res.json(cachedEvents.map(normalizeEvent));
});
app.post('/api/events/:id/join',mustAuth,(req,res)=>{
  const e=cachedEvents.find(x=>x.id===req.params.id);
  if(!e) return res.status(404).json({error:eventCachePrimed?'Scheduled event not found':'Discord event cache is still starting. Try again shortly.'});
  const k=key(req.session.user.id,e.id);
  const r=registrations.get(k)||{
    userId:req.session.user.id,
    eventId:e.id,
    eventName:e.name,
    start:e.scheduled_start_time,
    end:e.scheduled_end_time,
    channelId:eventChannel(e),
    attendanceMs:0,
    verified:false,
    claimed:false
  };
  registrations.set(k,r);
  if(voiceChannelsByUser.get(r.userId)===r.channelId&&!voiceStarts.has(k)) voiceStarts.set(k,Date.now());
  res.json({ok:true,registration:r});
});
app.get('/api/events/:id/status',mustAuth,(req,res)=>{
  const k=key(req.session.user.id,req.params.id), r=registrations.get(k);
  if(!r) return res.json({registered:false});
  let ms=r.attendanceMs; const active=voiceStarts.get(k); if(active) ms+=Date.now()-active;
  res.json({
    registered:true,
    inVoice:!!active,
    attendanceMinutes:Math.floor(ms/60000),
    thresholdMinutes:Math.ceil(cfg.thresholdMs/60000),
    verified:ms>=cfg.thresholdMs,
    eventName:r.eventName,
    channelId:r.channelId,
    claimed:r.claimed
  });
});
app.post('/api/events/:id/claim',mustAuth,(req,res)=>{
  const k=key(req.session.user.id,req.params.id), r=registrations.get(k);
  if(!r) return res.status(404).json({error:'Not registered'});
  let ms=r.attendanceMs; const active=voiceStarts.get(k);
  if(active){ ms+=Date.now()-active; r.attendanceMs=ms; voiceStarts.delete(k); }
  if(ms<cfg.thresholdMs) return res.status(403).json({error:'Attendance threshold not met'});
  r.verified=true; r.claimed=true;
  res.json({ok:true,event:{id:r.eventId,name:r.eventName},attendanceMinutes:Math.floor(ms/60000)});
});

app.use(express.static(path.join(__dirname,'public')));
app.use((req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`MS32 Global Passport v0.0.9 oauth+gateway listening on ${port}`));
