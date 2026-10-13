import crypto from 'node:crypto';
import express from 'express';

const FLYING_NOW_VOICE_CHANNEL_ID = String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '');
const sessions = new Map();
const installedApps = new WeakSet();
let pool = null;

function isSnowflake(value) {
  return /^\d{16,20}$/.test(String(value || ''));
}

function parseCookies(header='') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function auth(req) {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    const raw = parseCookies(req.headers.cookie || '').ms32_auth;
    if (!raw) return null;
    const [payload, sig] = raw.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!user?.id || !user?.username || !user?.member || Number(user.exp || 0) <= Date.now()) return null;
    return {id:String(user.id), username:String(user.username).slice(0,80)};
  } catch { return null; }
}

function clean(value, max) {
  return String(value || '').replace(/[\r\n\t]/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max).toUpperCase();
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (pool) return pool;
  try {
    const {Pool} = await import('pg');
    pool = new Pool({connectionString:process.env.DATABASE_URL});
    return pool;
  } catch (e) {
    console.error('Flying Now lifecycle database unavailable:', e?.message || e);
    return null;
  }
}

function pointsForMinutes(minutes) {
  const m = Number(minutes || 0);
  if (m < 30) return 0;
  if (m >= 120) return 300;
  if (m >= 60) return 200;
  return 100;
}

function sessionTotalMs(s, now=Date.now()) {
  if (!s) return 0;
  let ms = Number(s.baseAttendanceMs || 0) + Number(s.sessionAttendanceMs || 0);
  if (s.state === 'active' && s.joinedAt) ms += Math.max(0, now - Number(s.joinedAt));
  return ms;
}

async function loadBaseAttendance(userId, eventId) {
  const p = await getPool();
  if (!p) return 0;
  try {
    const q = await p.query('SELECT attendance_ms FROM passport_registrations WHERE user_id=$1 AND event_id=$2 LIMIT 1',[userId,eventId]);
    return q.rowCount ? Number(q.rows[0].attendance_ms || 0) : 0;
  } catch { return 0; }
}

async function persistSession(s) {
  const p = await getPool();
  if (!p || !s) return;
  const total = Math.max(0, Math.round(sessionTotalMs(s)));
  const verified = total >= 30 * 60 * 1000;
  try {
    await p.query(`INSERT INTO passport_registrations
      (user_id,event_id,username,event_name,event_start,channel_id,attendance_ms,verified,claimed,active,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,false,NOW())
      ON CONFLICT (user_id,event_id) DO UPDATE SET
        username=EXCLUDED.username,
        event_name=EXCLUDED.event_name,
        channel_id=EXCLUDED.channel_id,
        attendance_ms=GREATEST(passport_registrations.attendance_ms,EXCLUDED.attendance_ms),
        verified=(passport_registrations.verified OR EXCLUDED.verified),
        claimed=(passport_registrations.claimed OR EXCLUDED.claimed),
        active=false,
        updated_at=NOW()`,
      [s.userId,s.eventId,s.username,`Flying Now · ${s.departure} to ${s.destination} · ${s.aircraft}`,new Date(s.postedAt).toISOString(),FLYING_NOW_VOICE_CHANNEL_ID,total,verified]);
  } catch (e) {
    console.error('Flying Now lifecycle persistence failed:', e?.message || e);
  }
}

function activateSession(userId) {
  const s = sessions.get(String(userId));
  if (!s || s.state !== 'pending') return s;
  s.state = 'active';
  s.joinedAt = Date.now();
  s.activatedAt = s.joinedAt;
  void persistSession(s);
  console.log('Flying Now pilot became active in Champagne Voice');
  return s;
}

function finishSession(userId, reason='finished') {
  const s = sessions.get(String(userId));
  if (!s || s.state === 'finished') return s;
  const now = Date.now();
  if (s.state === 'active' && s.joinedAt) {
    s.sessionAttendanceMs = Number(s.sessionAttendanceMs || 0) + Math.max(0, now - Number(s.joinedAt));
  }
  s.joinedAt = null;
  s.state = 'finished';
  s.finishedAt = now;
  s.finishReason = reason;
  void persistSession(s);
  console.log(`Flying Now flight closed: ${reason}`);
  return s;
}

async function createPendingSession(user, body) {
  if (!user) return null;
  const departure = clean(body?.departure,32);
  const destination = clean(body?.destination,32);
  const aircraft = clean(body?.aircraft,48);
  if (!departure || !destination || !aircraft) return null;
  const day = new Date().toISOString().slice(0,10);
  const eventId = `flying-now:${day}`;
  const baseAttendanceMs = await loadBaseAttendance(user.id,eventId);
  const s = {
    userId:user.id,username:user.username,eventId,departure,destination,aircraft,
    postedAt:Date.now(),state:'pending',joinedAt:null,activatedAt:null,finishedAt:null,
    finishReason:null,baseAttendanceMs,sessionAttendanceMs:0
  };
  sessions.set(user.id,s);
  if (currentVoiceChannel(user.id) === FLYING_NOW_VOICE_CHANNEL_ID) activateSession(user.id);
  return s;
}

let voiceMap = null;
function currentVoiceChannel(userId) {
  return voiceMap?.get(String(userId)) || null;
}

const baseMapSet = Map.prototype.set;
const baseMapDelete = Map.prototype.delete;
Map.prototype.set = function flyingNowVoiceSet(key,value) {
  if (isSnowflake(key) && isSnowflake(value)) {
    voiceMap = this;
    const old = this.get(key);
    if (old === FLYING_NOW_VOICE_CHANNEL_ID && value !== FLYING_NOW_VOICE_CHANNEL_ID) finishSession(key,'left_voice');
    const result = baseMapSet.call(this,key,value);
    if (value === FLYING_NOW_VOICE_CHANNEL_ID) activateSession(key);
    return result;
  }
  return baseMapSet.call(this,key,value);
};
Map.prototype.delete = function flyingNowVoiceDelete(key) {
  if (this === voiceMap && isSnowflake(key)) {
    const old = this.get(key);
    if (old === FLYING_NOW_VOICE_CHANNEL_ID) finishSession(key,'left_voice');
  }
  return baseMapDelete.call(this,key);
};

async function historyFor(userId) {
  const p = await getPool();
  const rows = [];
  if (p) {
    try {
      const q = await p.query(`SELECT event_id,attendance_ms,verified,claimed,event_name,event_start
        FROM passport_registrations
        WHERE user_id=$1 AND event_id LIKE 'flying-now:%'
        ORDER BY event_start ASC`,[userId]);
      for (const r of q.rows) {
        const minutes = Math.floor(Number(r.attendance_ms || 0)/60000);
        rows.push({
          eventId:String(r.event_id),registered:true,attendanceMinutes:minutes,thresholdMinutes:30,
          verified:!!r.verified,claimed:!!r.verified && !!r.claimed,inVoice:false,points:pointsForMinutes(minutes)
        });
      }
    } catch (e) {
      console.error('Flying Now history load failed:', e?.message || e);
    }
  }
  const s = sessions.get(String(userId));
  if (s) {
    const minutes = Math.floor(sessionTotalMs(s)/60000);
    const current = {
      eventId:s.eventId,registered:true,attendanceMinutes:minutes,thresholdMinutes:30,
      verified:minutes>=30,claimed:minutes>=30,inVoice:s.state==='active',points:pointsForMinutes(minutes)
    };
    const i = rows.findIndex(x=>x.eventId===s.eventId);
    if (i >= 0) rows[i] = current; else rows.push(current);
  }
  return rows;
}

async function buildStatus(userId) {
  const id = String(userId);
  let s = sessions.get(id) || null;
  const voice = currentVoiceChannel(id);
  if (s?.state === 'pending' && voice === FLYING_NOW_VOICE_CHANNEL_ID) s = activateSession(id);
  if (s?.state === 'active' && voice !== FLYING_NOW_VOICE_CHANNEL_ID) s = finishSession(id,'left_voice');
  const history = await historyFor(id);
  if (!s) return {state:'idle',history};
  const attendanceMinutes = Math.floor(sessionTotalMs(s)/60000);
  return {
    state:s.state,eventId:s.eventId,departure:s.departure,destination:s.destination,aircraft:s.aircraft,
    attendanceMinutes,points:pointsForMinutes(attendanceMinutes),inVoice:s.state==='active',
    finishReason:s.finishReason||null,history
  };
}

const originalPost = express.application.post;
const originalGet = express.application.get;

function installRoutes(app) {
  if (installedApps.has(app)) return;
  installedApps.add(app);

  originalGet.call(app,'/api/flying-now/status',async(req,res)=>{
    const user = auth(req);
    if (!user) return res.status(401).json({error:'Please sign in with Discord first'});
    res.json(await buildStatus(user.id));
  });

  originalPost.call(app,'/api/flying-now/finish',async(req,res)=>{
    const user = auth(req);
    if (!user) return res.status(401).json({error:'Please sign in with Discord first'});
    finishSession(user.id,'finished_by_pilot');
    res.json(await buildStatus(user.id));
  });
}

express.application.post = function flyingNowLifecyclePost(path,...handlers) {
  installRoutes(this);
  if (path === '/api/flying-now' && handlers.length) {
    const i = handlers.length - 1;
    const handler = handlers[i];
    handlers[i] = async function flyingNowLifecycleWrapped(req,res,next) {
      const user = auth(req);
      const body = req.body ? {...req.body} : {};
      const result = await handler(req,res,next);
      if (user && res.statusCode >= 200 && res.statusCode < 300) {
        await createPendingSession(user,body);
      }
      return result;
    };
  }
  return originalPost.call(this,path,...handlers);
};

express.application.get = function flyingNowLifecycleGet(path,...handlers) {
  installRoutes(this);
  return originalGet.call(this,path,...handlers);
};

const originalSend = express.response.send;
express.response.send = function flyingNowLifecycleSend(body) {
  try {
    if (typeof body === 'string' && body.includes('/flying-now.js?v=20261013-1')) {
      body = body.replace('/flying-now.js?v=20261013-1','/flying-now.js?v=20261013-2');
    }
  } catch {}
  return originalSend.call(this,body);
};
