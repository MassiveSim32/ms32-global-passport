import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

  originalGet.call(app, '/assets/sponsors/a2a.png', async (req, res) => {
    try {
      const source = await fs.readFile(path.join(__dirname,'public','event-sponsors.js'),'utf8');
      const match = source.match(/const a2aLogo='data:image\/png;base64,([^']+)'/);
      if (!match) return res.sendStatus(404);
      const png = Buffer.from(match[1], 'base64');
      res.set('Content-Type','image/png');
      res.set('Cache-Control','public, max-age=31536000, immutable');
      res.send(png);
    } catch (e) {
      console.error('A2A sponsor image load failed:', e?.message || e);
      res.sendStatus(500);
    }
  });

  originalGet.call(app, '/api/passport/history', async (req, res) => {
    const user = authUser(req);
    if (!user) return res.status(401).json({error:'Please sign in with Discord first'});
    try {
      const db = await getPool();
      if (!db) return res.json({history:[]});
      const q = await db.query(`
        SELECT p.event_id,p.event_name,p.event_start,p.channel_id,p.attendance_ms,p.verified,p.claimed,p.active
        FROM passport_registrations p
        WHERE p.user_id=$1
          AND (p.claimed=true OR p.verified=true OR p.attendance_ms > 0)
          AND NOT (
            p.event_id ~ '^flying-now:[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            AND EXISTS (
              SELECT 1
              FROM passport_registrations newer
              WHERE newer.user_id=p.user_id
                AND newer.event_id LIKE p.event_id || ':%'
            )
          )
        ORDER BY p.event_start ASC NULLS LAST
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
      res.set('Cache-Control','no-store');
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
