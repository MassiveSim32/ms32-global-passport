import express from 'express';

const originalJson = express.response.json;

function pointsForMinutes(minutes) {
  const m = Number(minutes || 0);
  if (m < 30) return 0;
  if (m >= 120) return 300;
  if (m >= 60) return 200;
  return 100;
}

function normalizeFlyingNowStatus(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;

  const history = Array.isArray(body.history) ? body.history.map(x => ({...x})) : [];
  const eventId = String(body.eventId || '');
  const match = eventId ? history.find(x => String(x?.eventId || '') === eventId) : null;

  const liveMinutes = Number(body.attendanceMinutes || 0);
  const persistedMinutes = Number(match?.attendanceMinutes || 0);
  const authoritativeMinutes = Math.max(0, liveMinutes, persistedMinutes);

  if (eventId) {
    const verified = authoritativeMinutes >= 30 || !!match?.verified;
    const claimed = verified && (!!match?.claimed || authoritativeMinutes >= 30);
    const normalized = {
      ...(match || {}),
      eventId,
      registered:true,
      attendanceMinutes:authoritativeMinutes,
      thresholdMinutes:30,
      verified,
      claimed,
      inVoice:body.state === 'active'
    };
    const i = history.findIndex(x => String(x?.eventId || '') === eventId);
    if (i >= 0) history[i] = normalized; else history.push(normalized);
  }

  return {
    ...body,
    attendanceMinutes:authoritativeMinutes,
    points:pointsForMinutes(authoritativeMinutes),
    history
  };
}

express.response.json = function flyingNowAuthoritativeJson(body) {
  if (this.req?.path === '/api/flying-now/status') {
    this.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    return originalJson.call(this, normalizeFlyingNowStatus(body));
  }
  return originalJson.call(this, body);
};
