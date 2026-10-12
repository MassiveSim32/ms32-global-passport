import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const sessionStore = new session.MemoryStore();
const authSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const AUTH_COOKIE = 'ms32_auth';
const AUTH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

if(!process.env.SESSION_SECRET) console.warn('SESSION_SECRET is missing; persistent sign-in will not survive restarts.');

app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  store: sessionStore,
  secret: authSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', maxAge:AUTH_MAX_AGE_MS }
}));

const cfg = {
  clientId: process.env.DISCORD_CLIENT_ID,
  browserRedirectUri: process.env.NODE_ENV === 'production'
    ? 'https://ms32-global-passport.onrender.com/auth/discord/browser'
    : 'http://localhost:3000/auth/discord/browser',
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  fallbackVoiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID || null,
  thresholdMs: Number(process.env.ATTENDANCE_MINUTES || 30) * 60_000
};

const registrations = new Map();
const voiceStarts = new Map();
const voiceChannelsByUser = new Map();
const pendingVoiceProofs = new Map();
let cachedEvents = [];
let eventCachePrimed = false;
let guildOnline = false;
let gatewayReady = false;
let gatewayUser = null;
let gatewaySocket = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let gatewaySequence = null;

function parseCookies(header=''){
  const out={};
  for(const part of String(header).split(';')){
    const i=part.indexOf('=');
    if(i<0) continue;
    const k=part.slice(0,i).trim(), v=part.slice(i+1).trim();
    if(k) out[k]=decodeURIComponent(v);
  }
  return out;
}
function signAuthUser(user){
  const clean={id:String(user.id),username:String(user.username).slice(0,80),avatar:user.avatar||null,member:true,exp:Date.now()+AUTH_MAX_AGE_MS};
  const payload=Buffer.from(JSON.stringify(clean)).toString('base64url');
  const sig=crypto.createHmac('sha256',authSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function readPersistentAuth(req){
  try{
    const raw=parseCookies(req.headers.cookie||'')[AUTH_COOKIE];
    if(!raw) return null;
    const [payload,sig]=raw.split('.');
    if(!payload||!sig) return null;
    const expected=crypto.createHmac('sha256',authSecret).update(payload).digest('base64url');
    const a=Buffer.from(sig), b=Buffer.from(expected);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return null;
    const user=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(!user?.id||!user?.username||!user?.member||Number(user.exp||0)<=Date.now()) return null;
    return {id:String(user.id),username:String(user.username),avatar:user.avatar||null,member:true};
  }catch{return null;}
}
function getAuthUser(req){ return req.session?.user || readPersistentAuth(req); }
function setPersistentAuth(res,user){
  res.cookie(AUTH_COOKIE,signAuthUser(user),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:AUTH_MAX_AGE_MS,path:'/'});
}
function clearPersistentAuth(res){
  res.clearCookie(AUTH_COOKIE,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
}
function mustAuth(req,res,next){
  const user=getAuthUser(req);
  if(!user) return res.status(401).json({error:'Not signed in'});
  req.authUser=user;
  setPersistentAuth(res,user);
  next();
}
function key(userId,eventId){ return `${userId}:${eventId}`; }
function eventChannel(event){ return event?.channel_id || cfg.fallbackVoiceChannelId; }
function safeHtml(s=''){ return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function cleanupProofs(){ const now=Date.now(); for(const [sid,p] of pendingVoiceProofs) if(p.expiresAt<=now) pendingVoiceProofs.delete(sid); }

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
function completeVoiceProof(userId,newCh){
  if(!newCh) return;
  cleanupProofs();
  for(const [sessionId,p] of pendingVoiceProofs){
    if(p.user.id!==userId) continue;
    sessionStore.get(sessionId,(err,sess)=>{
      if(err||!sess) return;
      sess.user={id:p.user.id,username:p.user.username,avatar:p.user.avatar||null,member:true};
      sess.oauthState=null;
      sessionStore.set(sessionId,sess,saveErr=>{
        if(!saveErr){
          pendingVoiceProofs.delete(sessionId);
          console.log(`Discord browser sign-in verified through Gateway voice state for ${p.user.id}`);
        }
      });
    });
  }
}
function handleVoiceState(userId,oldCh,newCh){
  if(oldCh===newCh) return;
  completeVoiceProof(userId,newCh);
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

function simplePage(res,title,message,status=200){
  res.status(status).type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeHtml(title)}</title><style>body{margin:0;background:#06101b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}.card{width:min(440px,90vw);background:#0d1b2b;border:1px solid #26435e;border-radius:24px;padding:28px;text-align:center}.eyebrow{color:#4bb8ff;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.muted{color:#8ea7bb;line-height:1.55}.btn{display:block;padding:13px 16px;border-radius:14px;background:#5865f2;color:#fff;text-decoration:none;font-weight:800;margin-top:14px}</style></head><body><div class="card"><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1>${safeHtml(title)}</h1><p class="muted">${safeHtml(message)}</p><a class="btn" href="/auth/discord">Try Discord Again</a><a class="btn" href="/" style="background:#102439">Back to Passport</a></div></body></html>`);
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
  oauthConfigured:!!(cfg.clientId&&cfg.guildId),
  loginMode:'discord-browser-oauth-gateway-proof+persistent-signed-cookie'
}));

app.get('/flights-preview',(req,res)=>{
  const cards=cachedEvents.map(e=>{
    const start=e.scheduled_start_time?new Date(e.scheduled_start_time).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'Australia/Hobart'}):'TBA';
    const desc=safeHtml(e.description||'').replace(/\n/g,'<br>');
    const voice=e.channel_id?'Voice channel linked':'No voice channel linked';
    return `<article class="event"><div class="source">Discord Scheduled Event</div><h2>${safeHtml(e.name)}</h2><div class="meta">${safeHtml(start)} · ${voice}</div>${desc?`<p>${desc}</p>`:''}<div class="row"><span>${Number(e.user_count||0)} interested</span><span>${e.channel_id?'Attendance ready':'Attendance mapping needed'}</span></div></article>`;
  }).join('');
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MS32 Upcoming Flights</title><style>:root{--bg:#06101b;--panel:#0d1b2b;--line:#26435e;--text:#f5f8fb;--muted:#8ea7bb;--orange:#ff9f2f;--blue:#4bb8ff;--green:#45d18e}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#12314c,#06101b 48%,#02070c);color:var(--text);font:14px system-ui;min-height:100vh}.wrap{max-width:760px;margin:auto;padding:28px 18px 60px}.eyebrow{color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}h1{font-size:34px;margin:6px 0}.pill{padding:8px 11px;border:1px solid var(--line);border-radius:999px;color:var(--green);font-weight:800;font-size:11px}.event{background:linear-gradient(145deg,#10283c,#091725);border:1px solid var(--line);border-radius:22px;padding:18px;margin:12px 0}.source{font-size:10px;color:#b8bdff;font-weight:800;text-transform:uppercase}.event h2{margin:5px 0 4px;font-size:19px}.meta,.event p{color:var(--muted);line-height:1.5}.row{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #1c3549;margin-top:14px;padding-top:12px;font-size:11px;color:#bcd0df}.notice{margin-top:18px;padding:14px;border-radius:16px;background:#0b1725;border:1px solid #1d374e;color:var(--muted)}</style></head><body><main class="wrap"><div class="hero"><div><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1>Upcoming Flights</h1><div style="color:var(--muted)">Live from Discord Gateway cache</div></div><div class="pill">${gatewayReady?'BOT ONLINE':'BOT CONNECTING'}</div></div>${eventCachePrimed?(cards||'<div class="notice">No scheduled events are currently published in Discord.</div>'):'<div class="notice">Discord event cache is still loading. Refresh in a few seconds.</div>'}</main></body></html>`);
});

app.get('/auth/discord',(req,res)=>{
  const existing=getAuthUser(req);
  if(existing){ setPersistentAuth(res,existing); return res.redirect('/'); }
  if(!cfg.clientId) return simplePage(res,'Discord sign-in is not configured','The Discord client ID is missing from the Passport service.',503);
  const state=crypto.randomBytes(24).toString('hex');
  req.session.oauthState=state;
  req.session.save(err=>{
    if(err) return simplePage(res,'Could not start sign-in','Passport could not save the sign-in session. Please try again.',503);
    const u=new URL('https://discord.com/oauth2/authorize');
    u.searchParams.set('response_type','token');
    u.searchParams.set('client_id',cfg.clientId);
    u.searchParams.set('scope','identify');
    u.searchParams.set('state',state);
    u.searchParams.set('redirect_uri',cfg.browserRedirectUri);
    res.redirect(u.toString());
  });
});

app.get('/auth/discord/browser',(req,res)=>{
  const existing=getAuthUser(req);
  if(existing){ setPersistentAuth(res,existing); return res.redirect('/'); }
  const expectedState=req.session.oauthState||'';
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect Discord</title><style>body{margin:0;background:#06101b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}.card{width:min(460px,90vw);background:#0d1b2b;border:1px solid #26435e;border-radius:24px;padding:28px;text-align:center}.eyebrow{color:#4bb8ff;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.muted{color:#8ea7bb;line-height:1.55}.ok{color:#45d18e}.warn{color:#ffbd66}.spinner{width:34px;height:34px;border:4px solid #29465f;border-top-color:#5865f2;border-radius:50%;margin:18px auto;animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}.btn{display:block;padding:13px 16px;border-radius:14px;background:#5865f2;color:#fff;text-decoration:none;font-weight:800;margin-top:14px}</style></head><body><div class="card"><div class="eyebrow">Massive Sim 32 · Global Passport</div><h1 id="title">Finishing Discord sign-in</h1><div class="spinner" id="spin"></div><p id="msg" class="muted">Checking your Discord account…</p><a id="back" class="btn" href="/" style="display:none;background:#102439">Back to Passport</a></div><script>
const expected=${JSON.stringify(expectedState)};
const hash=new URLSearchParams(location.hash.slice(1));
const token=hash.get('access_token');
const state=hash.get('state');
const title=document.getElementById('title'), msg=document.getElementById('msg'), spin=document.getElementById('spin'), back=document.getElementById('back');
function fail(text){title.textContent='Discord sign-in could not finish';msg.textContent=text;msg.className='warn';spin.style.display='none';back.style.display='block';history.replaceState(null,'',location.pathname);}
(async()=>{
  if(!token||!state||state!==expected) return fail('The Discord sign-in response could not be verified. Please start again from Passport.');
  history.replaceState(null,'',location.pathname);
  try{
    const r=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bearer '+token}});
    if(!r.ok) return fail('Discord could not confirm your account. Please try signing in again.');
    const u=await r.json();
    const username=u.global_name||u.username;
    const b=await fetch('/auth/discord/browser-begin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,user:{id:u.id,username,avatar:u.avatar||null}})});
    const j=await b.json();
    if(!b.ok) return fail(j.error||'Passport could not begin verification.');
    title.textContent='One quick Discord check';
    msg.innerHTML='To securely link <b>'+username.replace(/[&<>\"']/g,'')+'</b>, join <b>any voice channel</b> in the Massive Sim 32 Discord for a moment. No command is required.'+(j.alreadyInVoice?'<br><br>You are already in voice, so switch channels or leave and rejoin once.':'');
    msg.className='muted'; spin.style.display='block';
    const timer=setInterval(async()=>{try{const s=await (await fetch('/auth/discord/browser-status')).json();if(s.linked){clearInterval(timer);title.textContent='Discord connected';msg.textContent='Verified through Massive Sim 32 Discord. Returning to your Passport…';msg.className='ok';spin.style.display='none';setTimeout(()=>location.href='/',700)}else if(s.expired){clearInterval(timer);fail('Verification timed out. Start Discord sign-in again.')}}catch{}},1200);
  }catch(e){ fail('Your browser could not complete Discord sign-in. Please try again.'); }
})();
</script></body></html>`);
});

app.post('/auth/discord/browser-begin',(req,res)=>{
  const {state,user}=req.body||{};
  if(!state||state!==req.session.oauthState) return res.status(400).json({error:'Invalid sign-in state'});
  if(!user?.id||!user?.username) return res.status(400).json({error:'Discord account details are missing'});
  delete req.session.oauthState;
  pendingVoiceProofs.set(req.sessionID,{user:{id:String(user.id),username:String(user.username).slice(0,80),avatar:user.avatar||null},expiresAt:Date.now()+3*60_000});
  req.session.save(()=>res.json({ok:true,alreadyInVoice:voiceChannelsByUser.has(String(user.id))}));
});

app.get('/auth/discord/browser-status',(req,res)=>{
  cleanupProofs();
  const pending=pendingVoiceProofs.get(req.sessionID);
  const user=getAuthUser(req);
  if(user) setPersistentAuth(res,user);
  res.json({linked:!!user,user:user||null,expired:!user&&!pending});
});

app.post('/auth/logout',(req,res)=>{
  pendingVoiceProofs.delete(req.sessionID);
  clearPersistentAuth(res);
  req.session.destroy(()=>res.json({ok:true}));
});
app.get('/api/me',(req,res)=>{
  const user=getAuthUser(req);
  if(user) setPersistentAuth(res,user);
  res.json({user:user||null,botReady:gatewayReady});
});
app.get('/api/events',(req,res)=>res.json(cachedEvents.map(normalizeEvent)));

app.post('/api/events/:id/join',mustAuth,(req,res)=>{
  const e=cachedEvents.find(x=>x.id===req.params.id);
  if(!e) return res.status(404).json({error:eventCachePrimed?'Scheduled event not found':'Discord event cache is still starting. Try again shortly.'});
  const k=key(req.authUser.id,e.id);
  const r=registrations.get(k)||{userId:req.authUser.id,eventId:e.id,eventName:e.name,start:e.scheduled_start_time,end:e.scheduled_end_time,channelId:eventChannel(e),attendanceMs:0,verified:false,claimed:false};
  registrations.set(k,r);
  if(voiceChannelsByUser.get(r.userId)===r.channelId&&!voiceStarts.has(k)) voiceStarts.set(k,Date.now());
  res.json({ok:true,registration:r});
});
app.post('/api/events/:id/cancel',mustAuth,(req,res)=>{
  const k=key(req.authUser.id,req.params.id), r=registrations.get(k);
  if(!r) return res.json({ok:true,registered:false});
  if(r.claimed) return res.status(409).json({error:'A stamped flight cannot be cancelled'});
  voiceStarts.delete(k);
  registrations.delete(k);
  res.json({ok:true,registered:false});
});
app.get('/api/events/:id/status',mustAuth,(req,res)=>{
  const k=key(req.authUser.id,req.params.id), r=registrations.get(k);
  if(!r) return res.json({registered:false});
  let ms=r.attendanceMs; const active=voiceStarts.get(k); if(active) ms+=Date.now()-active;
  res.json({registered:true,inVoice:!!active,attendanceMinutes:Math.floor(ms/60000),thresholdMinutes:Math.ceil(cfg.thresholdMs/60000),verified:ms>=cfg.thresholdMs,eventName:r.eventName,channelId:r.channelId,claimed:r.claimed});
});
app.post('/api/events/:id/claim',mustAuth,(req,res)=>{
  const k=key(req.authUser.id,req.params.id), r=registrations.get(k);
  if(!r) return res.status(404).json({error:'Not registered'});
  let ms=r.attendanceMs; const active=voiceStarts.get(k); if(active){ ms+=Date.now()-active; r.attendanceMs=ms; voiceStarts.delete(k); }
  if(ms<cfg.thresholdMs) return res.status(403).json({error:'Attendance threshold not met'});
  r.verified=true; r.claimed=true;
  res.json({ok:true,event:{id:r.eventId,name:r.eventName},attendanceMinutes:Math.floor(ms/60000)});
});

app.use(express.static(path.join(__dirname,'public')));
app.use((req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`MS32 Global Passport v0.0.12 persistent-auth+gateway listening on ${port}`));
