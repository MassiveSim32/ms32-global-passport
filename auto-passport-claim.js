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
