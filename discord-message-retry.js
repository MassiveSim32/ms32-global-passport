import crypto from 'node:crypto';

const originalFetch = globalThis.fetch.bind(globalThis);
let pool = null;
let flushing = false;

function isDiscordMessagePost(url, options={}) {
  return options?.method === 'POST' && /^https:\/\/discord\.com\/api\/v10\/channels\/\d+\/messages$/.test(String(url));
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (pool) return pool;
  const { Pool } = await import('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`CREATE TABLE IF NOT EXISTS discord_outbox (
    id text PRIMARY KEY,
    url text NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
    attempts integer NOT NULL DEFAULT 0
  )`);
  return pool;
}

function queueId(url, body) {
  return crypto.createHash('sha256').update(`${url}\n${body}`).digest('hex');
}

async function enqueue(url, options) {
  const p = await getPool();
  if (!p) return false;
  const body = String(options?.body || '');
  const id = queueId(url, body);
  await p.query(`INSERT INTO discord_outbox (id,url,body,next_attempt_at,attempts)
    VALUES ($1,$2,$3,NOW() + INTERVAL '60 seconds',0)
    ON CONFLICT (id) DO NOTHING`, [id, String(url), body]);
  console.log('Flying Now Discord post queued for later delivery');
  return true;
}

function getWebhookUrl() {
  let webhook = String(process.env.FLYING_NOW_WEBHOOK_URL || '').trim();
  if ((webhook.startsWith('"') && webhook.endsWith('"')) || (webhook.startsWith("'") && webhook.endsWith("'"))) webhook = webhook.slice(1,-1).trim();
  return webhook;
}

function validWebhookUrl(webhook) {
  return /^https:\/\/(?:canary\.|ptb\.)?(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+(?:\?.*)?$/.test(webhook);
}

async function tryWebhook(options) {
  const webhook = getWebhookUrl();
  if (!webhook) {
    console.log('Flying Now webhook is not configured');
    return null;
  }
  if (!validWebhookUrl(webhook)) {
    console.log('Flying Now webhook is configured but its URL format is invalid');
    return null;
  }
  try {
    const response = await originalFetch(webhook, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:String(options?.body || '')
    });
    if (response.ok) console.log('Flying Now Discord post delivered through champagne-chat webhook');
    else console.log(`Flying Now champagne-chat webhook delivery failed with status ${response.status}`);
    return response;
  } catch (e) {
    console.log(`Flying Now champagne-chat webhook request failed: ${e?.name || 'network error'}`);
    return null;
  }
}

async function trySend(url, options) {
  let response = await originalFetch(url, options);
  for (let attempt = 0; attempt < 2 && !response.ok; attempt++) {
    await sleep(attempt === 0 ? 2500 : 5000);
    response = await originalFetch(url, options);
  }
  return response;
}

async function flushOutbox() {
  if (flushing || !process.env.DISCORD_BOT_TOKEN) return;
  flushing = true;
  try {
    const p = await getPool();
    if (!p) return;
    const q = await p.query(`SELECT id,url,body,attempts FROM discord_outbox
      WHERE next_attempt_at <= NOW() ORDER BY created_at ASC LIMIT 5`);
    for (const row of q.rows) {
      try {
        let response = await tryWebhook({body:row.body});
        if (!response?.ok) {
          response = await originalFetch(row.url, {
            method:'POST',
            headers:{authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`,'content-type':'application/json'},
            body:row.body
          });
        }
        if (response.ok) {
          await p.query('DELETE FROM discord_outbox WHERE id=$1', [row.id]);
          console.log('Queued Flying Now Discord post delivered');
        } else {
          const attempts = Number(row.attempts || 0) + 1;
          const delayMinutes = Math.min(30, Math.max(2, attempts * 3));
          await p.query(`UPDATE discord_outbox SET attempts=$2,next_attempt_at=NOW()+($3 || ' minutes')::interval WHERE id=$1`, [row.id, attempts, String(delayMinutes)]);
        }
      } catch {
        const attempts = Number(row.attempts || 0) + 1;
        const delayMinutes = Math.min(30, Math.max(2, attempts * 3));
        await p.query(`UPDATE discord_outbox SET attempts=$2,next_attempt_at=NOW()+($3 || ' minutes')::interval WHERE id=$1`, [row.id, attempts, String(delayMinutes)]).catch(()=>{});
      }
    }
  } catch (e) {
    console.error('Discord outbox flush failed:', e?.message || e);
  } finally {
    flushing = false;
  }
}

globalThis.fetch = async function ms32Fetch(url, options={}) {
  if (!isDiscordMessagePost(url, options)) return originalFetch(url, options);

  const webhookResponse = await tryWebhook(options);
  if (webhookResponse?.ok) return webhookResponse;

  let response;
  try {
    response = await trySend(url, options);
  } catch {
    response = null;
  }

  if (response?.ok) return response;

  try {
    const queued = await enqueue(url, options);
    if (queued) {
      setTimeout(flushOutbox, 1000);
      return new Response(JSON.stringify({queued:true,message:'Discord delivery is pending'}), {
        status:503,
        headers:{'content-type':'application/json','x-ms32-discord-queued':'1'}
      });
    }
  } catch (e) {
    console.error('Could not queue Flying Now Discord post:', e?.message || e);
  }

  return response || new Response(JSON.stringify({message:'Discord delivery unavailable'}), {status:503, headers:{'content-type':'application/json'}});
};

const webhookAtBoot = getWebhookUrl();
console.log(`Flying Now webhook configuration: ${webhookAtBoot ? (validWebhookUrl(webhookAtBoot) ? 'present and valid' : 'present but invalid format') : 'missing'}`);
setInterval(flushOutbox, 60_000).unref?.();
setTimeout(flushOutbox, 5000);

await import('./server-fixed-wrapper.js');
