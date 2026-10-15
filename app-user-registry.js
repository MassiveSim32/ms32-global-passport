import crypto from 'node:crypto';
import express from 'express';
import { Pool } from 'pg';

const originalGet = express.application.get;
const originalSend = express.response.send;
const installedApps = new WeakSet();
let pool = null;
let schemaReady = false;

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
  const sessionUser = req.session?.user;
  if (sessionUser?.id && sessionUser?.member) {
    return {id:String(sessionUser.id), username:String(sessionUser.username || ''), avatar:sessionUser.avatar || null};
  }
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
    return {id:String(user.id), username:String(user.username || ''), avatar:user.avatar || null};
  } catch { return null; }
}

function isAdmin(user) {
  return !!(user?.id && process.env.ADMIN_DISCORD_ID && String(user.id) === String(process.env.ADMIN_DISCORD_ID));
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:2});
  if (!schemaReady) {
    await pool.query(`CREATE TABLE IF NOT EXISTS app_users (
      user_id text PRIMARY KEY,
      username text,
      avatar text,
      first_seen_at timestamptz NOT NULL DEFAULT NOW(),
      last_seen_at timestamptz NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`INSERT INTO app_users (user_id,username,first_seen_at,last_seen_at)
      SELECT user_id,MAX(username),MIN(created_at),MAX(updated_at)
      FROM passport_registrations
      GROUP BY user_id
      ON CONFLICT (user_id) DO UPDATE SET
        username=COALESCE(EXCLUDED.username,app_users.username),
        first_seen_at=LEAST(app_users.first_seen_at,EXCLUDED.first_seen_at),
        last_seen_at=GREATEST(app_users.last_seen_at,EXCLUDED.last_seen_at)`);
    schemaReady = true;
  }
  return pool;
}

async function trackUser(req) {
  const user = authUser(req);
  if (!user) return;
  const db = await getPool();
  if (!db) return;
  await db.query(`INSERT INTO app_users (user_id,username,avatar,first_seen_at,last_seen_at)
    VALUES ($1,$2,$3,NOW(),NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      username=EXCLUDED.username,
      avatar=COALESCE(EXCLUDED.avatar,app_users.avatar),
      last_seen_at=NOW()`, [user.id,user.username || null,user.avatar || null]);
}

function installRoutes(app) {
  if (installedApps.has(app)) return;
  installedApps.add(app);
  originalGet.call(app, '/api/journey-leaderboard', async (req,res) => {
    const user = authUser(req);
    if (!user) return res.status(401).json({error:'Sign in to view the leaderboard'});
    res.set('Cache-Control','no-store');
    try {
      const db = await getPool();
      if (!db) return res.status(503).json({error:'Leaderboard unavailable'});
      const q = await db.query(`WITH scores AS (
        SELECT p.user_id,
          MAX(COALESCE(u.username,p.username,'MS32 Pilot')) AS username,
          SUM(CASE WHEN p.claimed=true AND p.verified=true
            AND (p.event_start IS NULL OR p.event_start<=NOW())
            AND COALESCE(p.attendance_ms,0)>=1800000
            THEN CASE WHEN p.attendance_ms>=7200000 THEN 300
                      WHEN p.attendance_ms>=3600000 THEN 200 ELSE 100 END
            ELSE 0 END)::int AS points
        FROM passport_registrations p
        LEFT JOIN app_users u ON u.user_id=p.user_id
        GROUP BY p.user_id
      ), ranked AS (
        SELECT user_id,username,points,
          RANK() OVER (ORDER BY points DESC)::int AS rank
        FROM scores WHERE points>0
      )
      SELECT user_id AS "userId",username,points,rank
      FROM ranked WHERE rank<=20 OR user_id=$1
      ORDER BY rank,LOWER(username),user_id LIMIT 100`,[user.id]);
      res.json({leaders:q.rows.filter(x=>x.rank<=20),me:q.rows.find(x=>x.userId===user.id)||null});
    } catch(e) {
      console.error('Journey leaderboard failed:',e?.message||e);
      res.status(500).json({error:'Could not load leaderboard'});
    }
  });

  originalGet.call(app, '/api/admin/app-users', async (req,res) => {
    const user = authUser(req);
    if (!user) return res.status(401).json({error:'Not signed in'});
    if (!isAdmin(user)) return res.status(403).json({error:'Admin access denied'});
    try {
      const db = await getPool();
      if (!db) return res.json([]);
      const q = await db.query(`SELECT
          u.user_id AS "userId",
          u.username,
          u.first_seen_at AS "firstSeenAt",
          u.last_seen_at AS "lastSeenAt",
          COUNT(DISTINCT p.event_id)::int AS "flightRegistrations",
          COUNT(*) FILTER (WHERE p.claimed=true AND p.verified=true)::int AS stamps
        FROM app_users u
        LEFT JOIN passport_registrations p ON p.user_id=u.user_id
        GROUP BY u.user_id,u.username,u.first_seen_at,u.last_seen_at
        ORDER BY LOWER(COALESCE(u.username,'')),u.user_id`);
      res.set('Cache-Control','no-store');
      res.json(q.rows);
    } catch (e) {
      console.error('App user registry load failed:', e?.message || e);
      res.status(500).json({error:'Could not load registered pilots'});
    }
  });

  originalGet.call(app, '/api/admin/pilot-history', async (req,res) => {
    const user = authUser(req);
    if (!user) return res.status(401).json({error:'Not signed in'});
    if (!isAdmin(user)) return res.status(403).json({error:'Admin access denied'});
    try {
      const db = await getPool();
      if (!db) return res.json([]);
      const q = await db.query(`SELECT
          user_id AS "userId",
          username,
          event_id AS "eventId",
          event_name AS "eventName",
          event_start AS start,
          channel_id AS "channelId",
          FLOOR(COALESCE(attendance_ms,0)/60000.0)::int AS "attendanceMinutes",
          30::int AS "thresholdMinutes",
          verified,
          claimed,
          active,
          false AS "inVoice"
        FROM passport_registrations
        ORDER BY LOWER(COALESCE(username,'')), event_start NULLS LAST`);
      res.set('Cache-Control','no-store');
      res.json(q.rows);
    } catch (e) {
      console.error('Persistent pilot history load failed:', e?.message || e);
      res.status(500).json({error:'Could not load pilot history'});
    }
  });
}

express.application.get = function appUserRegistryGet(path, ...handlers) {
  installRoutes(this);
  if (path === '/api/me' && handlers.length) {
    const i = handlers.length - 1;
    const handler = handlers[i];
    handlers[i] = async function trackedMe(req,res,next) {
      try { await trackUser(req); } catch (e) { console.error('App user tracking failed:', e?.message || e); }
      return handler(req,res,next);
    };
  }
  return originalGet.call(this, path, ...handlers);
};

express.response.send = function appUserAdminSend(body) {
  if (this.req?.path === '/admin' && typeof body === 'string' && body.includes('</body>') && !body.includes('/admin-app-users.js')) {
    body = body.replace('</body>', '<script src="/admin-app-users.js?v=20261014-1"></script><script src="/admin-persistent-history-fix.js?v=20261014-1"></script></body>');
  }
  return originalSend.call(this, body);
};

getPool().catch(e => console.error('App user registry init failed:', e?.message || e));
