import express from 'express';

// Runtime bridge while the beta still keeps attendance in memory.
// It keeps verified event voice time running after a pilot has claimed a stamp,
// so the full comms session can feed Frequent Flyer rewards.
const originalMapSet = Map.prototype.set;
const originalMapDelete = Map.prototype.delete;
let registrationsMap = null;
let voiceStartsMap = null;
let voiceChannelsMap = null;
let claimRequestDepth = 0;

function isSnowflake(value) {
  return /^\d{16,20}$/.test(String(value || ''));
}

function bankClaimedVoice(userId, channelId) {
  if (!registrationsMap || !voiceStartsMap || !channelId) return;
  const now = Date.now();
  for (const r of registrationsMap.values()) {
    if (!r?.claimed || String(r.userId) !== String(userId) || r.channelId !== channelId) continue;
    const k = `${r.userId}:${r.eventId}`;
    const started = voiceStartsMap.get(k);
    if (!started) continue;
    r.attendanceMs = Number(r.attendanceMs || 0) + Math.max(0, now - started);
    r.verified = true;
    originalMapDelete.call(voiceStartsMap, k);
  }
}

function restartClaimedVoiceIfNeeded(userId, channelId) {
  if (!registrationsMap || !voiceStartsMap || !channelId) return;
  const matches = [...registrationsMap.values()].filter(r => String(r?.userId) === String(userId) && r.channelId === channelId);
  if (matches.some(r => !r.claimed)) return; // server.js will track the active unstamped registration itself
  const claimed = matches.filter(r => r.claimed).sort((a, b) => Math.abs(new Date(a.start || 0).getTime() - Date.now()) - Math.abs(new Date(b.start || 0).getTime() - Date.now()))[0];
  if (!claimed) return;
  const k = `${claimed.userId}:${claimed.eventId}`;
  if (!voiceStartsMap.has(k)) originalMapSet.call(voiceStartsMap, k, Date.now());
}

Map.prototype.set = function patchedMapSet(key, value) {
  if (typeof key === 'string' && key.includes(':') && value && typeof value === 'object' && 'userId' in value && 'eventId' in value) {
    registrationsMap = this;
  }
  if (typeof key === 'string' && key.includes(':') && typeof value === 'number') {
    voiceStartsMap = this;
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

  // Claiming a stamp used to stop the active timer. Instead, bank the first
  // 30+ minutes and immediately restart from now while the pilot remains in voice.
  if (this === voiceStartsMap && typeof key === 'string' && key.includes(':')) {
    const [userId, eventId] = key.split(':');
    const r = registrationsMap?.get(key);
    const stillInEventVoice = !!(r?.channelId && voiceChannelsMap?.get(String(userId)) === r.channelId);
    if (stillInEventVoice && (claimRequestDepth > 0 || r?.claimed)) {
      originalMapSet.call(this, key, Date.now());
      return true;
    }
  }
  return originalMapDelete.call(this, key);
};

const originalPost = express.application.post;
express.application.post = function patchedPost(path, ...handlers) {
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
      body = body.replace(/<script>\s*const content=document\.getElementById\('content'\);[\s\S]*?<\/script><\/body><\/html>$/, '<script src="/admin-fix.js"></script></body></html>');
    }
    if (this.req?.path === '/' && typeof body === 'string' && body.includes('Global Passport')) {
      body = body.replace('</body>', '<script src="/rewards-prototype.js"></script><script src="/stamp-style-v2.js"></script></body>');
    }
  } catch {}
  return originalSend.call(this, body);
};

await import('./server.js');
