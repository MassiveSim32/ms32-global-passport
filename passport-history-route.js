import crypto from 'node:crypto';
import express from 'express';
import { Pool } from 'pg';

const originalGet = express.application.get;
const installedApps = new WeakSet();
let pool = null;

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

function authUser(req) {
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
    if (!user?.id || !user?.member || Number(user.exp || 0) <= Date.now()) return null;
    return { id:String(user.id), username:String(user.username || '') };
  } catch { return null; }
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (pool) return pool;
  pool = new Pool({ connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:2 });
  return pool;
}

function installHistoryRoute(app) {
  if (installedApps.has(app)) return;
  installedApps.add(app);

  originalGet.call(app, '/api/passport/history', async (req, res) => {
    const user = authUser(req);
    if (!user) return res.status(401).json({error:'Please sign in with Discord first'});
    try {
      const db = await getPool();
      if (!db) return res.json({history:[]});
      const q = await db.query(`
        SELECT event_id,event_name,event_start,channel_id,attendance_ms,verified,claimed,active
        FROM passport_registrations
        WHERE user_id=$1
          AND (claimed=true OR verified=true OR attendance_ms > 0)
        ORDER BY event_start ASC NULLS LAST
      `,[user.id]);
      const history = q.rows.map(r => ({
        event:{
          id:String(r.event_id),
          name:r.event_name || 'MS32 Community Flight',
          description:'Historic MS32 community flight',
          start:r.event_start ? new Date(r.event_start).toISOString() : null,
          end:null,
          status:2,
          channelId:r.channel_id || null,
          entityType:2,
          userCount:0,
          image:null
        },
        status:{
          registered:true,
          attendanceMinutes:Math.floor(Number(r.attendance_ms || 0)/60000),
          thresholdMinutes:30,
          verified:!!r.verified,
          claimed:!!r.claimed,
          inVoice:false,
          historical:true,
          active:!!r.active
        }
      }));
      res.json({history});
    } catch (e) {
      console.error('Passport history load failed:', e?.message || e);
      res.status(500).json({error:'Could not load Passport history'});
    }
  });
}

express.application.get = function passportHistoryGet(path, ...handlers) {
  installHistoryRoute(this);
  return originalGet.call(this, path, ...handlers);
};
