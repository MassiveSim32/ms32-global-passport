import express from 'express';

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
      body = body.replace(/<script>\s*const content=document\.getElementById\('content'\);[\s\S]*?<\/script><\/body><\/html>$/, '<script src="/admin-fix.js?v=20261012-1108"></script><script src="/admin-pilot-lookup.js?v=20261012-lookup1"></script></body></html>');
    }
    if (this.req?.path === '/' && typeof body === 'string' && body.includes('Global Passport')) {
      body = body.replace('</body>', '<script src="/rewards-prototype.js"></script><script src="/stamp-style-v2.js"></script></body>');
    }
  } catch {}
  return originalSend.call(this, body);
};

await import('./server.js');
