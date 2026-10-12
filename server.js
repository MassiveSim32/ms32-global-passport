import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import { Client, GatewayIntentBits } from 'discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const DISCORD_UA = 'DiscordBot (https://ms32-global-passport.onrender.com, 0.0.3)';

app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*24*7 }
}));

const cfg = {
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
  fallbackVoiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID || null,
  thresholdMs: Number(process.env.ATTENDANCE_MINUTES || 30) * 60_000
};

const registrations = new Map();
const voiceStarts = new Map();
let cachedEvents = [];

function mustAuth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Not signed in'}); next(); }
function key(userId,eventId){ return `${userId}:${eventId}`; }

async function discordApi(endpoint, token, scheme='Bot') {
  const r = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers:{
      Authorization:`${scheme} ${token}`,
      'User-Agent': DISCORD_UA,
      'Accept':'application/json'
    }
  });
  if(!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return r.status===204 ? null : r.json();
}

async function refreshEvents(){
  if(!cfg.botToken || !cfg.guildId) return [];
  cachedEvents = await discordApi(`/guilds/${cfg.guildId}/scheduled-events?with_user_count=true`, cfg.botToken);
  return cachedEvents;
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

const bot = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
bot.on('ready', async()=>{ console.log(`Discord bot ready as ${bot.user.tag}`); try{await refreshEvents()}catch(e){console.error(e.message)} });
bot.on('voiceStateUpdate',(oldState,newState)=>{
  const userId = newState.id || oldState.id;
  const oldCh = oldState.channelId;
  const newCh = newState.channelId;
  if(oldCh===newCh) return;
  if(oldCh){
    const r = relevantEventForChannel(userId, oldCh);
    if(r){ const k=key(userId,r.eventId); const start=voiceStarts.get(k); addElapsed(r,start); voiceStarts.delete(k); }
  }
  if(newCh){
    const r = relevantEventForChannel(userId,newCh);
    if(r) voiceStarts.set(key(userId,r.eventId),Date.now());
  }
});
if(cfg.botToken) bot.login(cfg.botToken).catch(e=>console.error('Bot login failed:',e.message));

app.get('/health',(req,res)=>res.json({ok:true,bot:bot.isReady(),guildConfigured:!!cfg.guildId}));

app.get('/auth/discord',(req,res)=>{
  if(!cfg.clientId || !cfg.redirectUri) return res.status(503).send('Discord OAuth is not configured yet.');
  const state=crypto.randomBytes(18).toString('hex'); req.session.oauthState=state;
  const q=new URLSearchParams({client_id:cfg.clientId,response_type:'code',redirect_uri:cfg.redirectUri,scope:'identify guilds',state,prompt:'consent'});
  res.redirect(`https://discord.com/oauth2/authorize?${q}`);
});

app.get('/auth/discord/callback',async(req,res)=>{
  try{
    if(!req.query.code || req.query.state!==req.session.oauthState) return res.status(400).send('Invalid OAuth state.');
    const body=new URLSearchParams({
      client_id:cfg.clientId,
      client_secret:cfg.clientSecret,
      grant_type:'authorization_code',
      code:String(req.query.code),
      redirect_uri:cfg.redirectUri
    });
    const tokenRes=await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded',
        'Accept':'application/json',
        'User-Agent':DISCORD_UA
      },
      body
    });
    if(!tokenRes.ok){
      const text=await tokenRes.text();
      console.error(`Discord OAuth token error ${tokenRes.status}: ${text.slice(0,500)}`);
      if(text.includes('Error 1015') || text.includes('temporarily from accessing')) {
        return res.status(503).send('Discord temporarily rate-limited the Passport server. Please try again shortly.');
      }
      throw new Error(`OAuth token exchange failed with status ${tokenRes.status}`);
    }
    const token=await tokenRes.json();
    const me=await discordApi('/users/@me',token.access_token,'Bearer');
    const guilds=await discordApi('/users/@me/guilds',token.access_token,'Bearer');
    if(!guilds.some(g=>g.id===cfg.guildId)) return res.status(403).send('Your Discord login worked, but you are not a member of the configured Massive Sim 32 server.');
    req.session.user={id:me.id,username:me.global_name||me.username,avatar:me.avatar,member:true};
    delete req.session.oauthState;
    res.redirect('/?discord=connected');
  }catch(e){ console.error(e); res.status(500).send('Discord sign-in failed. Check the server configuration and Discord credentials.'); }
});

app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null,botReady:bot.isReady()}));

app.get('/api/events',mustAuth,async(req,res)=>{
  try{
    const events=await refreshEvents();
    res.json(events.map(e=>({id:e.id,name:e.name,description:e.description||'',start:e.scheduled_start_time,end:e.scheduled_end_time,status:e.status,channelId:e.channel_id||null,entityType:e.entity_type,userCount:e.user_count||0,image:e.image||null})));
  }catch(e){res.status(502).json({error:e.message});}
});

app.post('/api/events/:id/join',mustAuth,async(req,res)=>{
  try{
    if(!cachedEvents.length) await refreshEvents();
    const e=cachedEvents.find(x=>x.id===req.params.id); if(!e) return res.status(404).json({error:'Scheduled event not found'});
    const record={userId:req.session.user.id,eventId:e.id,eventName:e.name,start:e.scheduled_start_time,end:e.scheduled_end_time,channelId:eventChannel(e),attendanceMs:0,verified:false,claimed:false};
    registrations.set(key(record.userId,record.eventId),record);
    const guild=bot.guilds.cache.get(cfg.guildId); const voiceState=guild?.voiceStates?.cache?.get(record.userId);
    if(voiceState?.channelId && voiceState.channelId===record.channelId) voiceStarts.set(key(record.userId,record.eventId),Date.now());
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
  let ms=r.attendanceMs; const activeStart=voiceStarts.get(k); if(activeStart) ms += Date.now()-activeStart;
  if(ms<cfg.thresholdMs) return res.status(403).json({error:'Attendance threshold not met'});
  r.verified=true; r.claimed=true; res.json({ok:true,event:{id:r.eventId,name:r.eventName},attendanceMinutes:Math.floor(ms/60000)});
});

app.use(express.static(path.join(__dirname,'public')));
app.use((req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`MS32 Global Passport v0.0.3 listening on ${port}`));
