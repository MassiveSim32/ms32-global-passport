import crypto from 'node:crypto';
import express from 'express';
import './persistence-bridge.js';

// Runtime bridge while the beta still keeps attendance in memory.
// Verified comms only count from the advertised Discord event start time
// until three hours after that start time. Time before/after that window
// never contributes to attendance or Frequent Flyer rewards.
const originalMapSet = Map.prototype.set;
const originalMapDelete = Map.prototype.delete;
let registrationsMap = null;
let voiceStartsMap = null;
let voiceChannelsMap = null;
let claimRequestDepth = 0;
const cutoffTimers = new Map();
const EVENT_WINDOW_MS = 3 * 60 * 60 * 1000;

// Flying Now / Ad Hoc Flights
const FLYING_NOW_TEXT_CHANNEL_ID = '1395186045846290452';
const FLYING_NOW_VOICE_CHANNEL_ID = String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '');
const FLYING_NOW_COOLDOWN_MS = 15 * 60 * 1000;
const flyingNowCooldowns = new Map();
const flyingNowMemoryStamps = new Map();
const flyingNowInstalledApps = new WeakSet();
let flyingNowPool = null;

function isSnowflake(value) {
  return /^\d{16,20}$/.test(String(value || ''));
}

function eventWindow(record) {
  const start = new Date(record?.start || 0).getTime();
  if (!Number.isFinite(start) || start <= 0) return null;
  return { start, end: start + EVENT_WINDOW_MS };
}

function clearCutoffTimer(key) {
  const t = cutoffTimers.get(key);
  if (t) clearTimeout(t);
  cutoffTimers.delete(key);
}

function bankWindowedVoice(record, key, endTime = Date.now()) {
  if (!record || !voiceStartsMap) return;
  const started = voiceStartsMap.get(key);
  if (!started) return;
  const window = eventWindow(record);
  let elapsed = 0;
  if (window) {
    const from = Math.max(Number(started), window.start);
    const to = Math.min(Number(endTime), window.end);
    elapsed = Math.max(0, to - from);
  } else {
    elapsed = Math.max(0, Number(endTime) - Number(started));
  }
  record.attendanceMs = Number(record.attendanceMs || 0) + elapsed;
  record.verified = record.attendanceMs >= (30 * 60 * 1000);
  originalMapDelete.call(voiceStartsMap, key);
  clearCutoffTimer(key);
}

function scheduleCutoff(record, key) {
  clearCutoffTimer(key);
  const window = eventWindow(record);
  if (!window) return;
  const delay = window.end - Date.now();
  if (delay <= 0) {
    bankWindowedVoice(record, key, window.end);
    return;
  }
  cutoffTimers.set(key, setTimeout(() => {
    bankWindowedVoice(record, key, window.end);
  }, delay));
}

function startWindowedVoice(record, key, requestedStart = Date.now()) {
  if (!record || !voiceStartsMap) return false;
  const window = eventWindow(record);
  const now = Date.now();
  if (window && now >= window.end) return false;
  const startAt = window ? Math.max(Number(requestedStart), window.start) : Number(requestedStart);
  originalMapSet.call(voiceStartsMap, key, startAt);
  scheduleCutoff(record, key);
  return true;
}

function bankClaimedVoice(userId, channelId) {
  if (!registrationsMap || !voiceStartsMap || !channelId) return;
  for (const r of registrationsMap.values()) {
    if (!r?.claimed || String(r.userId) !== String(userId) || r.channelId !== channelId) continue;
    const key = `${r.userId}:${r.eventId}`;
    if (voiceStartsMap.has(key)) bankWindowedVoice(r, key);
  }
}

function restartClaimedVoiceIfNeeded(userId, channelId) {
  if (!registrationsMap || !voiceStartsMap || !channelId) return;
  const matches = [...registrationsMap.values()].filter(r => String(r?.userId) === String(userId) && r.channelId === channelId);
  if (matches.some(r => !r.claimed)) return; // server.js tracks the active unstamped registration itself
  const claimed = matches.filter(r => r.claimed).sort((a, b) => Math.abs(new Date(a.start || 0).getTime() - Date.now()) - Math.abs(new Date(b.start || 0).getTime() - Date.now()))[0];
  if (!claimed) return;
  const key = `${claimed.userId}:${claimed.eventId}`;
  if (!voiceStartsMap.has(key)) startWindowedVoice(claimed, key, Date.now());
}

Map.prototype.set = function patchedMapSet(key, value) {
  if (typeof key === 'string' && key.includes(':') && value && typeof value === 'object' && 'userId' in value && 'eventId' in value) {
    registrationsMap = this;
  }

  if (typeof key === 'string' && key.includes(':') && typeof value === 'number') {
    voiceStartsMap = this;
    const record = registrationsMap?.get(key);
    if (record) {
      startWindowedVoice(record, key, value);
      return this;
    }
  }

  if (isSnowflake(key) && isSnowflake(value)) {
    voiceChannelsMap = this;
    const oldChannel = this.get(key);
    if (oldChannel && oldChannel !== value) bankClaimedVoice(key, oldChannel);
    const result = originalMapSet.call(this, key, value);
    restartClaimedVoiceIfNeeded(key, value);
    return result;
  }

  return originalMapSet.call(this, key, value);
};

Map.prototype.delete = function patchedMapDelete(key) {
  // Discord removes the user's cached voice state before server.js handles the leave.
  // Bank any post-stamp time at that exact moment so it is not lost.
  if (this === voiceChannelsMap && isSnowflake(key)) {
    const oldChannel = this.get(key);
    if (oldChannel) bankClaimedVoice(key, oldChannel);
  }

  // Claiming a stamp must not stop the timer. Bank the qualifying time and
  // restart while the pilot remains in the event voice channel, but never
  // outside the event's advertised start + three-hour window.
  if (this === voiceStartsMap && typeof key === 'string' && key.includes(':')) {
    const [userId] = key.split(':');
    const record = registrationsMap?.get(key);
    const stillInEventVoice = !!(record?.channelId && voiceChannelsMap?.get(String(userId)) === record.channelId);
    if (stillInEventVoice && (claimRequestDepth > 0 || record?.claimed)) {
      clearCutoffTimer(key);
      startWindowedVoice(record, key, Date.now());
      return true;
    }
    clearCutoffTimer(key);
  }

  return originalMapDelete.call(this, key);
};

function parseFlyingNowCookies(header='') {
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

function flyingNowAuth(req) {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    const raw = parseFlyingNowCookies(req.headers.cookie || '').ms32_auth;
    if (!raw) return null;
    const [payload, sig] = raw.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!user?.id || !user?.username || !user?.member || Number(user.exp || 0) <= Date.now()) return null;
    return { id: String(user.id), username: String(user.username).slice(0, 80) };
  } catch { return null; }
}

function cleanFlightField(value, max) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').replace(/@/g, '@\u200b').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

async function getFlyingNowPool() {
  if (!process.env.DATABASE_URL) return null;
  if (flyingNowPool) return flyingNowPool;
  try {
    const { Pool } = await import('pg');
    flyingNowPool = new Pool({ connectionString: process.env.DATABASE_URL });
    return flyingNowPool;
  } catch (e) {
    console.error('Flying Now database unavailable:', e?.message || e);
    return null;
  }
}

function flyingNowEventFromRecord(r) {
  const departure = r.departure || 'AD HOC';
  const destination = r.destination || 'FLIGHT';
  const aircraft = r.aircraft || 'Aircraft';
  return {
    id: r.eventId,
    name: `Flying Now · ${departure} to ${destination}`,
    description: `Special Event · Flying Now · ${aircraft}`,
    start: r.start,
    end: null,
    status: 2,
    channelId: r.channelId || null,
    entityType: 2,
    userCount: 1,
    image: null
  };
}

function flyingNowStatus() {
  return { registered:false, attendanceMinutes:0, thresholdMinutes:0, verified:true, claimed:true, inVoice:false };
}

async function flyingNowStampExists(userId, eventId) {
  if (flyingNowMemoryStamps.has(`${userId}:${eventId}`)) return true;
  const pool = await getFlyingNowPool();
  if (!pool) return false;
  try {
    const q = await pool.query('SELECT 1 FROM passport_registrations WHERE user_id=$1 AND event_id=$2 LIMIT 1', [userId, eventId]);
    return q.rowCount > 0;
  } catch { return false; }
}

async function saveFlyingNowStamp(record) {
  flyingNowMemoryStamps.set(`${record.userId}:${record.eventId}`, record);
  if (registrationsMap) {
    registrationsMap.set(`${record.userId}:${record.eventId}`, {
      userId:record.userId,eventId:record.eventId,username:record.username,eventName:record.eventName,start:record.start,
      channelId:record.channelId,attendanceMs:0,verified:true,claimed:true,active:false
    });
  }
  const pool = await getFlyingNowPool();
  if (!pool) return;
  try {
    await pool.query(`INSERT INTO passport_registrations
      (user_id,event_id,username,event_name,event_start,channel_id,attendance_ms,verified,claimed,active,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,0,true,true,false,NOW())
      ON CONFLICT (user_id,event_id) DO UPDATE SET username=EXCLUDED.username,event_name=EXCLUDED.event_name,event_start=EXCLUDED.event_start,channel_id=EXCLUDED.channel_id,verified=true,claimed=true,active=false,updated_at=NOW()`,
      [record.userId,record.eventId,record.username,record.eventName,record.start,record.channelId]);
  } catch (e) { console.error('Flying Now stamp save failed:', e?.message || e); }
}

async function listFlyingNowStamps(userId) {
  const rows = [];
  for (const r of flyingNowMemoryStamps.values()) if (String(r.userId) === String(userId)) rows.push(r);
  const pool = await getFlyingNowPool();
  if (pool) {
    try {
      const q = await pool.query(`SELECT user_id,event_id,username,event_name,event_start,channel_id
        FROM passport_registrations WHERE user_id=$1 AND event_id LIKE 'flying-now:%' AND claimed=true ORDER BY event_start ASC`, [userId]);
      for (const x of q.rows) {
        if (rows.some(r => r.eventId === x.event_id)) continue;
        const m = String(x.event_name || '').match(/^Flying Now · (.+?) to (.+?) · (.+)$/);
        rows.push({
          userId:String(x.user_id),eventId:String(x.event_id),username:x.username||'',eventName:x.event_name||'Flying Now',
          start:new Date(x.event_start).toISOString(),channelId:x.channel_id||null,
          departure:m?.[1]||'AD HOC',destination:m?.[2]||'FLIGHT',aircraft:m?.[3]||'Aircraft'
        });
      }
    } catch (e) { console.error('Flying Now stamp load failed:', e?.message || e); }
  }
  rows.sort((a,b)=>new Date(a.start)-new Date(b.start));
  return rows;
}

async function postFlyingNowToDiscord(user, departure, destination, aircraft) {
  if (!process.env.DISCORD_BOT_TOKEN) throw new Error('Discord posting is unavailable');
  const payload = {
    content:'✈️ **MS32 PILOT FLYING NOW**',
    allowed_mentions:{parse:[]},
    embeds:[{
      title:`${departure} → ${destination}`,
      color:16752431,
      fields:[
        {name:'Pilot',value:user.username,inline:true},
        {name:'Aircraft',value:aircraft,inline:true},
        {name:'Route',value:`${departure} → ${destination}`,inline:false}
      ],
      footer:{text:'Massive Simulations 32 Companion App · Fly Together - Fly Massive'},
      timestamp:new Date().toISOString()
    }]
  };
  const r = await fetch(`https://discord.com/api/v10/channels/${FLYING_NOW_TEXT_CHANNEL_ID}/messages`, {
    method:'POST',
    headers:{authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`,'content-type':'application/json'},
    body:JSON.stringify(payload)
  });
  if (!r.ok) {
    console.error(`Flying Now Discord post failed with status ${r.status}`);
    throw new Error('Could not post to the Ad Hoc Flights channel');
  }
}

const originalPost = express.application.post;
const originalGet = express.application.get;

function installFlyingNowRoutes(app) {
  if (flyingNowInstalledApps.has(app)) return;
  flyingNowInstalledApps.add(app);

  originalPost.call(app, '/api/flying-now', async (req, res) => {
    const user = flyingNowAuth(req);
    if (!user) return res.status(401).json({error:'Please sign in with Discord first'});
    const departure = cleanFlightField(req.body?.departure, 32);
    const destination = cleanFlightField(req.body?.destination, 32);
    const aircraft = cleanFlightField(req.body?.aircraft, 48);
    if (!departure || !destination || !aircraft) return res.status(400).json({error:'Departure, destination and aircraft are required'});

    const last = Number(flyingNowCooldowns.get(user.id) || 0);
    if (Date.now() - last < FLYING_NOW_COOLDOWN_MS) return res.status(429).json({error:'You recently posted a Flying Now flight. Please wait before posting another.'});

    try {
      await postFlyingNowToDiscord(user, departure, destination, aircraft);
      flyingNowCooldowns.set(user.id, Date.now());
    } catch (e) {
      return res.status(502).json({error:e?.message || 'Could not post flight'});
    }

    const currentVoice = voiceChannelsMap?.get(String(user.id)) || null;
    const voiceConfigured = !!FLYING_NOW_VOICE_CHANNEL_ID;
    const voiceEligible = voiceConfigured && currentVoice === FLYING_NOW_VOICE_CHANNEL_ID;
    let stampAwarded = false;
    let bonusReason = '';

    if (!voiceConfigured) {
      bonusReason = 'Bonus stamp verification is waiting for the Flying Now voice/comms channel to be configured.';
    } else if (!voiceEligible) {
      bonusReason = 'Join the approved Flying Now voice/comms channel before posting to earn the bonus stamp.';
    } else {
      const day = new Date().toISOString().slice(0,10);
      const eventId = `flying-now:${day}`;
      const exists = await flyingNowStampExists(user.id, eventId);
      if (exists) {
        bonusReason = 'Your Flying Now bonus stamp for today is already in your Passport.';
      } else {
        const start = new Date().toISOString();
        await saveFlyingNowStamp({
          userId:user.id,eventId,username:user.username,
          eventName:`Flying Now · ${departure} to ${destination} · ${aircraft}`,
          start,channelId:currentVoice,departure,destination,aircraft
        });
        stampAwarded = true;
      }
    }

    res.json({ok:true,posted:true,stampAwarded,voiceEligible,bonusReason});
  });

  originalGet.call(app, '/api/flying-now/stamps', async (req, res) => {
    const user = flyingNowAuth(req);
    if (!user) return res.status(401).json({error:'Please sign in with Discord first'});
    const rows = await listFlyingNowStamps(user.id);
    res.json({stamps:rows.map(r=>({event:flyingNowEventFromRecord(r),status:flyingNowStatus()}))});
  });
}

express.application.post = function patchedPost(path, ...handlers) {
  installFlyingNowRoutes(this);
  if (path === '/api/events/:id/claim' && handlers.length) {
    const i = handlers.length - 1;
    const handler = handlers[i];
    handlers[i] = function wrappedClaim(req, res, next) {
      claimRequestDepth++;
      try { return handler(req, res, next); }
      finally { claimRequestDepth--; }
    };
  }
  return originalPost.call(this, path, ...handlers);
};

const originalSend = express.response.send;
express.response.send = function patchedSend(body) {
  try {
    if (this.req?.path === '/admin' && typeof body === 'string' && body.includes('Loading admin data')) {
      body = body.replace(/<script>\s*const content=document\.getElementById\('content'\);[\s\S]*?<\/script><\/body><\/html>$/, '<script src="/admin-fix.js?v=20261012-1108"></script><script src="/admin-pilot-lookup.js?v=20261012-lookup1"></script></body></html>');
    }
    if (this.req?.path === '/' && typeof body === 'string' && body.includes('Global Passport')) {
      body = body.replace('</body>', '<script src="/rewards-prototype.js"></script><script src="/dual-clock.js"></script><script src="/stamp-style-v2.js"></script><script src="/bush-location-fix.js"></script><script src="/airliner-location-fix.js"></script><script src="/flying-now.js?v=20261013-1"></script><script src="/passport-pages.js"></script></body>');
    }
  } catch {}
  return originalSend.call(this, body);
};

await import('./server.js');
