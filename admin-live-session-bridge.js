import crypto from 'node:crypto';
import express from 'express';

const nativeMapSet = Map.prototype.set;
const originalJson = express.response.json;
let flyingSessions = null;

function looksLikeFlyingSession(value) {
  return !!(value && typeof value === 'object' && value.eventId && value.userId && value.departure && value.destination && 'baseAttendanceMs' in value && 'sessionAttendanceMs' in value && 'state' in value);
}

Map.prototype.set = function captureFlyingSession(key, value) {
  if (looksLikeFlyingSession(value)) flyingSessions = this;
  return nativeMapSet.call(this, key, value);
};

function sessionMinutes(s) {
  if (!s) return 0;
  let ms = Number(s.baseAttendanceMs || 0) + Number(s.sessionAttendanceMs || 0);
  if (s.state === 'active' && s.joinedAt) ms += Math.max(0, Date.now() - Number(s.joinedAt));
  return Math.floor(Math.max(0, ms) / 60000);
}

function mergeLiveSessions(rows) {
  const out = Array.isArray(rows) ? rows.map(r => ({...r})) : [];
  if (!flyingSessions) return out;

  for (const s of flyingSessions.values()) {
    if (!looksLikeFlyingSession(s)) continue;
    const minutes = sessionMinutes(s);
    const i = out.findIndex(r => String(r.userId) === String(s.userId) && String(r.eventId) === String(s.eventId));
    const live = {
      userId:String(s.userId),
      username:s.username || `Discord ${s.userId}`,
      eventId:String(s.eventId),
      eventName:`Flying Now · ${s.departure} to ${s.destination} · ${s.aircraft}`,
      start:s.postedAt ? new Date(s.postedAt).toISOString() : null,
      channelId:s.channelId || String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '') || null,
      joinPolicy:s.joinPolicy === 'solo' ? 'solo' : 'open',
      attendanceMinutes:minutes,
      thresholdMinutes:30,
      verified:minutes >= 30,
      claimed:minutes >= 30,
      inVoice:s.state === 'active',
      active:s.state === 'active'
    };
    if (i >= 0) out[i] = {...out[i], ...live, attendanceMinutes:Math.max(Number(out[i].attendanceMinutes || 0), minutes)};
    else out.push(live);
  }
  return out;
}

express.response.json = function adminLiveSessionJson(body) {
  if (this.req?.path === '/api/admin/pilots') {
    this.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    return originalJson.call(this, mergeLiveSessions(body));
  }
  return originalJson.call(this, body);
};

const originalGet = express.application.get;
const installedFlightBoards = new WeakSet();

function signedInPilot(req) {
  if (req.session?.user?.id && req.session.user.member) return true;
  try {
    const secret = process.env.SESSION_SECRET;
    const cookie = String(req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('ms32_auth='));
    if (!secret || !cookie) return false;
    const [payload,sig] = decodeURIComponent(cookie.slice(10)).split('.');
    if (!payload || !sig) return false;
    const expected = crypto.createHmac('sha256',secret).update(payload).digest('base64url');
    const a=Buffer.from(sig), b=Buffer.from(expected);
    if(a.length!==b.length || !crypto.timingSafeEqual(a,b))return false;
    const user=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return !!(user.id && user.member && Number(user.exp)>Date.now());
  } catch {return false;}
}

express.application.get = function liveFlightsRoute(path,...handlers) {
  if (!installedFlightBoards.has(this)) {
    installedFlightBoards.add(this);
    originalGet.call(this,'/api/community/live-flights',(req,res)=>{
      res.set('Cache-Control','no-store, no-cache, must-revalidate');
      if(!signedInPilot(req))return res.status(401).json({error:'Sign in to browse live flights'});
      const flights = flyingSessions ? [...flyingSessions.values()]
        .filter(s=>looksLikeFlyingSession(s) && s.state==='active')
        .map(s=>({
          pilot:String(s.username || 'MS32 Pilot').slice(0,80),
          departure:String(s.departure || '').slice(0,32),
          destination:String(s.destination || '').slice(0,32),
          aircraft:String(s.aircraft || '').slice(0,48),
          channelId:String(s.channelId || ''),
          joinPolicy:s.joinPolicy === 'solo' ? 'solo' : 'open',
          startedAt:s.postedAt ? new Date(s.postedAt).toISOString() : null
        })) : [];
      res.json({flights,updatedAt:new Date().toISOString()});
    });
  }
  return originalGet.call(this,path,...handlers);
};
