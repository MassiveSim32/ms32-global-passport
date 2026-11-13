import { Pool } from 'pg';

const THRESHOLD_MS = 30 * 60 * 1000;
const SWEEP_MS = 15 * 1000;
let pool = null;
let running = false;

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (pool) return pool;
  pool = new Pool({ connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:2 });
  return pool;
}

async function autoClaimSweep() {
  if (running) return;
  running = true;
  try {
    const db = await getPool();
    if (!db) return;
    const result = await db.query(`
      UPDATE passport_registrations
      SET verified=true,
          claimed=true
      WHERE attendance_ms >= $1
        AND (verified=false OR claimed=false)
      RETURNING user_id,event_id,event_name,attendance_ms
    `,[THRESHOLD_MS]);
    // Persist one commemorative award per pilot, independent of the source flight.
    // Scheduled event descriptions are not stored in passport_registrations, so
    // resolve them against the Discord scheduled-event API metadata separately.
    const broome = await db.query(`
      INSERT INTO passport_registrations
        (user_id,event_id,username,event_name,event_start,channel_id,attendance_ms,verified,claimed,active,updated_at)
      SELECT DISTINCT ON (user_id)
        user_id,'ms32-broome-flyin-2026',username,
        'MASSIVE FLY IN BROOME! You made it!',
        '2026-11-14T09:00:00Z'::timestamptz,
        channel_id,$1,true,true,false,NOW()
      FROM passport_registrations
      WHERE event_id <> 'ms32-broome-flyin-2026'
        AND event_start >= '2026-11-14T00:00:00Z'::timestamptz
        AND event_start <= '2026-11-14T11:30:00Z'::timestamptz
        AND event_name ILIKE '%YBRM%'
        AND attendance_ms >= $1
        AND verified=true AND claimed=true
      ORDER BY user_id,event_start ASC
      ON CONFLICT (user_id,event_id) DO NOTHING
      RETURNING user_id
    `,[THRESHOLD_MS]);
    if(broome.rowCount)console.log(`Issued ${broome.rowCount} permanent Broome commemorative stamps`);
    if (result.rowCount) {
      console.log(`Auto-claimed ${result.rowCount} Passport stamp${result.rowCount===1?'':'s'} at 30-minute attendance threshold`);
    }
  } catch (e) {
    console.error('Passport auto-claim sweep failed:', e?.message || e);
  } finally {
    running = false;
  }
}

setTimeout(autoClaimSweep, 3000);
setInterval(autoClaimSweep, SWEEP_MS);
