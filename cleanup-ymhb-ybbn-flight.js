import 'dotenv/config';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.warn('Skipping one-time flight cleanup: DATABASE_URL is missing');
} else {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
  try {
    const result = await db.query(
      `DELETE FROM passport_registrations
       WHERE user_id=$1 AND event_id=$2
       RETURNING event_name`,
      ['734587761545183352', 'flying-now:2026-10-16:mvadyy2w:a66d59']
    );
    if (result.rowCount) console.log('Removed incorrect spontaneous flight record:', result.rows[0]?.event_name || 'YMHB to YBBN');
    else console.log('One-time spontaneous flight cleanup already complete');
  } finally {
    await db.end();
  }
}
