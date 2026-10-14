import express from 'express';
import { Pool } from 'pg';

const nativeSet = Map.prototype.set;
const nativeGet = Map.prototype.get;
const nativeValues = Map.prototype.values;
const nativeDelete = Map.prototype.delete;

const EVENT_WINDOW_MS = 3 * 60 * 60 * 1000;
const db = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 })
  : null;

let persistedRows = [];
let registrationsMap = null;
let voiceStartsMap = null;
let voiceChannelsMap = null;
let hydrated = false;
let registrationRouteDepth = 0;
let syncTimer = null;
let syncing = false;

function key(userId, eventId) {
  return `${userId}:${eventId}`;
}

function isSnowflake(value) {
  return /^\d{16,20}$/.test(String(value || ''));
}

function isFlyingNow(recordOrId) {
  const id = typeof recordOrId === 'object' ? recordOrId?.eventId : recordOrId;
  return String(id || '').startsWith('flying-now:');
}

function rowToRecord(row) {
  return {
    userId: String(row.user_id),
    username: row.username || `Discord ${row.user_id}`,
    eventId: String(row.event_id),
    eventName: row.event_name || 'MS32 Event',
    start: row.event_start ? new Date(row.event_start).toISOString() : null,
    end: null,
    channelId: row.channel_id || null,
    attendanceMs: Number(row.attendance_ms || 0),
    verified: !!row.verified,
    claimed: !!row.claimed,
    active: !!row.active
  };
}

function restorePersistedKey(map, mapKey) {
  if (!map || typeof mapKey !== 'string' || nativeGet.call(map, mapKey) !== undefined) return;
  const row = persistedRows.find(r => key(r.user_id, r.event_id) === mapKey);
  if (!row) return;
  nativeSet.call(map, mapKey, rowToRecord(row));
}

function eventWindow(record) {
  const start = new Date(record?.start || 0).getTime();
  if (!Number.isFinite(start) || start <= 0) return null;
  return { start, end: start + EVENT_WINDOW_MS };
}

function activeElapsed(record, at = Date.now()) {
  if (!voiceStartsMap || !record) return 0;
  const started = nativeGet.call(voiceStartsMap, key(record.userId, record.eventId));
  if (!started) return 0;
  const window = eventWindow(record);
  if (!window) return Math.max(0, at - Number(started));
  const from = Math.max(Number(started), window.start);
  const to = Math.min(at, window.end);
  return Math.max(0, to - from);
}

function durableAttendance(record) {
  return Math.max(0, Number(record?.attendanceMs || 0) + activeElapsed(record));
}

function resumableRecord(record, now = Date.now()) {
  if (isFlyingNow(record)) return false;
  if (!record?.active || !record.channelId || !voiceChannelsMap) return false;
  if (nativeGet.call(voiceChannelsMap, String(record.userId)) !== record.channelId) return false;
  const window = eventWindow(record);
  if (window && now >= window.end) return false;
  return true;
}

function resumeActiveVoiceRecords() {
  if (!registrationsMap || !voiceStartsMap || !voiceChannelsMap) return;

  const now = Date.now();
  const groups = new Map();

  for (const record of nativeValues.call(registrationsMap)) {
    if (!resumableRecord(record, now)) continue;
    const groupKey = `${record.userId}:${record.channelId}`;
    const list = groups.get(groupKey) || [];
    list.push(record);
    groups.set(groupKey, list);
  }

  for (const records of groups.values()) {
    const unclaimed = records.filter(r => !r.claimed);
    const pool = unclaimed.length ? unclaimed : records;
    pool.sort((a, b) => {
      const aStart = new Date(a.start || 0).getTime();
      const bStart = new Date(b.start || 0).getTime();
      if (unclaimed.length) return Math.abs(aStart - now) - Math.abs(bStart - now);
      return bStart - aStart;
    });

    const record = pool[0];
    if (!record) continue;
    const k = key(record.userId, record.eventId);
    if (nativeGet.call(voiceStartsMap, k)) continue;
    const window = eventWindow(record);
    nativeSet.call(voiceStartsMap, k, window ? Math.max(now, window.start) : now);
  }
}

async function loadRows() {
  if (!db) {
    console.warn('DATABASE_URL is missing; Global Passport progress is not persistent.');
    return;
  }
  try {
    const result = await db.query(`
      SELECT user_id,event_id,username,event_name,event_start,channel_id,
             attendance_ms,verified,claimed,active
      FROM passport_registrations
      WHERE active = TRUE OR claimed = TRUE OR event_id LIKE 'flying-now:%'
      ORDER BY event_start NULLS LAST
    `);
    persistedRows = result.rows;
    console.log(`Loaded ${persistedRows.length} persistent Passport registration(s) and claimed stamp(s) from Neon`);
  } catch (error) {
    console.error('Could not load persistent Passport data from Neon:', error.message);
  }
}

function hydrate(map) {
  if (hydrated) return;
  registrationsMap = map;
  for (const row of persistedRows) {
    const record = rowToRecord(row);
    nativeSet.call(map, key(record.userId, record.eventId), record);
  }
  hydrated = true;
  resumeActiveVoiceRecords();
}

async function saveRecord(record) {
  if (!db || !record?.userId || !record?.eventId || isFlyingNow(record)) return;
  const attendanceMs = durableAttendance(record);
  const verified = !!record.verified || attendanceMs >= 30 * 60 * 1000;
  const active = record.active !== false;
  await db.query(`
    INSERT INTO passport_registrations
      (user_id,event_id,username,event_name,event_start,channel_id,attendance_ms,verified,claimed,active,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    ON CONFLICT (user_id,event_id) DO UPDATE SET
      username=EXCLUDED.username,
      event_name=EXCLUDED.event_name,
      event_start=EXCLUDED.event_start,
      channel_id=EXCLUDED.channel_id,
      attendance_ms=GREATEST(passport_registrations.attendance_ms,EXCLUDED.attendance_ms),
      verified=(passport_registrations.verified OR EXCLUDED.verified),
      claimed=(passport_registrations.claimed OR EXCLUDED.claimed),
      active=EXCLUDED.active,
      updated_at=NOW()
  `, [
    String(record.userId), String(record.eventId), record.username || null,
    record.eventName || null, record.start || null, record.channelId || null,
    attendanceMs, verified, !!record.claimed, active
  ]);
}

function scheduleSync(delay = 250) {
  if (!db || !registrationsMap) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncAll, delay);
}

async function syncAll() {
  syncTimer = null;
  if (!db || !registrationsMap || syncing) return;
  syncing = true;
  try {
    await Promise.all([...nativeValues.call(registrationsMap)].map(saveRecord));
  } catch (error) {
    console.error('Passport persistence sync failed:', error.message);
  } finally {
    syncing = false;
  }
}

Map.prototype.get = function persistentGet(mapKey) {
  if (registrationRouteDepth > 0 && typeof mapKey === 'string' && mapKey.includes(':')) {
    if (!registrationsMap) {
      hydrate(this);
    } else if (this === registrationsMap) {
      restorePersistedKey(this, mapKey);
    } else if (!voiceStartsMap) {
      voiceStartsMap = this;
      resumeActiveVoiceRecords();
      const record = nativeGet.call(registrationsMap, mapKey);
      if (resumableRecord(record) && !nativeGet.call(this, mapKey)) {
        const window = eventWindow(record);
        nativeSet.call(this, mapKey, window ? Math.max(Date.now(), window.start) : Date.now());
      }
    }
  }
  return nativeGet.call(this, mapKey);
};

Map.prototype.values = function persistentValues() {
  if (registrationRouteDepth > 0 && !registrationsMap) hydrate(this);
  return nativeValues.call(this);
};

Map.prototype.set = function persistentSet(mapKey, value) {
  if (typeof mapKey === 'string' && mapKey.includes(':') && value && typeof value === 'object' && 'userId' in value && 'eventId' in value) {
    registrationsMap = this;
    hydrated = true;
    if (!('active' in value)) value.active = true;
    const result = nativeSet.call(this, mapKey, value);
    resumeActiveVoiceRecords();
    scheduleSync();
    return result;
  }
  if (typeof mapKey === 'string' && mapKey.includes(':') && typeof value === 'number') {
    voiceStartsMap = this;
    const result = nativeSet.call(this, mapKey, value);
    return result;
  }
  if (isSnowflake(mapKey) && isSnowflake(value)) {
    voiceChannelsMap = this;
    const result = nativeSet.call(this, mapKey, value);
    resumeActiveVoiceRecords();
    return result;
  }
  return nativeSet.call(this, mapKey, value);
};

Map.prototype.delete = function persistentDelete(mapKey) {
  if (this === registrationsMap && typeof mapKey === 'string' && mapKey.includes(':') && db) {
    const record = nativeGet.call(this, mapKey);
    if (record && !record.claimed && !isFlyingNow(record)) {
      record.active = false;
      db.query('UPDATE passport_registrations SET active=FALSE,updated_at=NOW() WHERE user_id=$1 AND event_id=$2', [String(record.userId), String(record.eventId)])
        .catch(error => console.error('Passport persistence cancel update failed:', error.message));
    }
  }
  const result = nativeDelete.call(this, mapKey);
  scheduleSync();
  return result;
};

function wrapRegistrationHandler(handler) {
  return function persistentRegistrationHandler(req, res, next) {
    registrationRouteDepth++;
    try {
      return handler(req, res, next);
    } finally {
      registrationRouteDepth--;
      scheduleSync();
    }
  };
}

const getPaths = new Set([
  '/api/events/:id/status',
  '/api/admin/overview',
  '/api/admin/events',
  '/api/admin/pilots'
]);
const postPaths = new Set([
  '/api/events/:id/join',
  '/api/events/:id/cancel',
  '/api/events/:id/claim',
  '/api/admin/attendance',
  '/api/admin/stamp'
]);

const originalGet = express.application.get;
express.application.get = function persistentGetRoute(path, ...handlers) {
  if (getPaths.has(path) && handlers.length) {
    const i = handlers.length - 1;
    handlers[i] = wrapRegistrationHandler(handlers[i]);
  }
  return originalGet.call(this, path, ...handlers);
};

const originalPost = express.application.post;
express.application.post = function persistentPostRoute(path, ...handlers) {
  if (postPaths.has(path) && handlers.length) {
    const i = handlers.length - 1;
    handlers[i] = wrapRegistrationHandler(handlers[i]);
  }
  return originalPost.call(this, path, ...handlers);
};

await loadRows();
setInterval(() => scheduleSync(0), 5000).unref();
