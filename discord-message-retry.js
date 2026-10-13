import crypto from 'node:crypto';

const originalFetch = globalThis.fetch.bind(globalThis);
let pool = null;
let flushing = false;

function isDiscordMessagePost(url, options={}) {
  return options?.method === 'POST' && /^https:\/\/discord\.com\/api\/v10\/channels\/\d+\/messages$/.test(String(url));
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

function getWebhookUrl() {
  let webhook = String(process.env.FLYING_NOW_WEBHOOK_URL || '').trim();
  if ((webhook.startsWith('"') && webhook.endsWith('"')) || (webhook.startsWith("'") && webhook.endsWith("'"))) webhook = webhook.slice(1,-1).trim();
  return webhook;
}

function validWebhookUrl(webhook) {
  return /^https:\/\/(?:canary\.|ptb\.)?(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+(?:\?.*)?$/.test(webhook);
}

async function retryDelayMs(response, fallbackMs = 60_000) {
  try {
    const h = Number(response?.headers?.get?.('retry-after'));
    if (Number.isFinite(h) && h > 0) return Math.max(1000, Math.min(15 * 60_000, h * 1000));
  } catch {}
  try {
    const clone = response.clone();
    const body = await clone.json();
    const seconds = Number(body?.retry_after);
    if (Number.isFinite(seconds) && seconds > 0) return Math.max(1000, Math.min(15 * 60_000, seconds * 1000));
  } catch {}
  return fallbackMs;
}

async function enqueue(url, options, delayMs = 60_000) {
  const p = await getPool();
  if (!p) return false;
  const body = String(options?.body || '');
  const id = queueId(url, body);
  const delaySeconds = Math.max(5, Math.ceil(Number(delayMs || 60_000) / 1000));
  await p.query(`INSERT INTO discord_outbox (id,url,body,next_attempt_at,attempts)
    VALUES ($1,$2,$3,NOW()+($4 || ' seconds')::interval,0)
    ON CONFLICT (id) DO UPDATE SET next_attempt_at=GREATEST(discord_outbox.next_attempt_at, EXCLUDED.next_attempt_at)`,
    [id, String(url), body, String(delaySeconds)]);
  console.log('Flying Now Discord post queued for automatic delivery');
  return true;
}

async function tryWebhook(options) {
  const webhook = getWebhookUrl();
  if (!webhook || !validWebhookUrl(webhook)) return null;
  try {
    return await originalFetch(webhook, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:String(options?.body || '')
    });
  } catch {
    return null;
  }
}

async function scheduleRetry(row, response) {
  const p = await getPool();
  if (!p) return;
  const attempts = Number(row.attempts || 0) + 1;
  const fallback = Math.min(30 * 60_000, Math.max(60_000, attempts * 2 * 60_000));
  const delayMs = response ? await retryDelayMs(response, fallback) : fallback;
  const delaySeconds = Math.max(5, Math.ceil(delayMs / 1000));
  await p.query(`UPDATE discord_outbox SET attempts=$2,next_attempt_at=NOW()+($3 || ' seconds')::interval WHERE id=$1`,
    [row.id, attempts, String(delaySeconds)]);
}

async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    const p = await getPool();
    if (!p) return;
    const q = await p.query(`SELECT id,url,body,attempts FROM discord_outbox
      WHERE next_attempt_at <= NOW() ORDER BY created_at ASC LIMIT 1`);
    for (const row of q.rows) {
      const webhook = getWebhookUrl();
      let response = null;
      if (webhook && validWebhookUrl(webhook)) {
        response = await tryWebhook({body:row.body});
      } else if (process.env.DISCORD_BOT_TOKEN) {
        try {
          response = await originalFetch(row.url, {
            method:'POST',
            headers:{authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`,'content-type':'application/json'},
            body:row.body
          });
        } catch {}
      }

      if (response?.ok) {
        await p.query('DELETE FROM discord_outbox WHERE id=$1', [row.id]);
        console.log('Queued Flying Now Discord post delivered');
      } else {
        await scheduleRetry(row, response);
        console.log('Queued Flying Now Discord post deferred for automatic retry');
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

  const webhook = getWebhookUrl();
  if (webhook && validWebhookUrl(webhook)) {
    const response = await tryWebhook(options);
    if (response?.ok) {
      console.log('Flying Now Discord post delivered through champagne-chat webhook');
      return response;
    }

    const delayMs = response ? await retryDelayMs(response, 60_000) : 60_000;
    const queued = await enqueue(url, options, delayMs).catch(()=>false);
    if (queued) {
      return new Response(JSON.stringify({queued:true,message:'Flight saved and queued for automatic Discord delivery'}), {
        status:503,
        headers:{'content-type':'application/json','x-ms32-discord-queued':'1'}
      });
    }
    return response || new Response(JSON.stringify({message:'Discord delivery unavailable'}), {status:503, headers:{'content-type':'application/json'}});
  }

  let response = null;
  try {
    response = await originalFetch(url, options);
  } catch {}
  if (response?.ok) return response;

  const delayMs = response ? await retryDelayMs(response, 60_000) : 60_000;
  const queued = await enqueue(url, options, delayMs).catch(()=>false);
  if (queued) {
    return new Response(JSON.stringify({queued:true,message:'Flight saved and queued for automatic Discord delivery'}), {
      status:503,
      headers:{'content-type':'application/json','x-ms32-discord-queued':'1'}
    });
  }
  return response || new Response(JSON.stringify({message:'Discord delivery unavailable'}), {status:503, headers:{'content-type':'application/json'}});
};

const webhookAtBoot = getWebhookUrl();
console.log(`Flying Now webhook configuration: ${webhookAtBoot ? (validWebhookUrl(webhookAtBoot) ? 'present and valid' : 'present but invalid format') : 'missing'}`);
setInterval(flushOutbox, 60_000).unref?.();
setTimeout(flushOutbox, 15_000);

await import('./server-fixed-wrapper.js');
