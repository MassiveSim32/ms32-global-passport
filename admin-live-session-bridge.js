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
      channelId:String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '') || null,
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
