import 'dotenv/config';

const required = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DISCORD_LINK_CHANNEL_ID: process.env.DISCORD_LINK_CHANNEL_ID,
  SESSION_SECRET: process.env.SESSION_SECRET
};

console.log('=== MS32 Passport startup diagnostics ===');
for (const [name, value] of Object.entries(required)) {
  console.log(`${name}: ${value ? 'configured' : 'MISSING'}`);
}

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function testDiscordRest() {
  console.log('--- Discord connectivity diagnostics ---');

  try {
    const r = await fetchWithTimeout('https://discord.com/api/v10/gateway', {
      headers: { Accept: 'application/json', 'User-Agent': 'MS32-Global-Passport/0.0.5' }
    });
    console.log(`Discord public API reachable: ${r.ok ? 'yes' : 'no'} (HTTP ${r.status})`);
  } catch (e) {
    console.log(`Discord public API reachable: no (${e?.name === 'AbortError' ? 'timeout' : e?.message || 'request failed'})`);
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    console.log('Discord bot token accepted: not tested (token missing)');
    console.log('Discord authenticated gateway endpoint: not tested (token missing)');
    return;
  }

  const headers = {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    Accept: 'application/json',
    'User-Agent': 'MS32-Global-Passport/0.0.5'
  };

  try {
    const r = await fetchWithTimeout('https://discord.com/api/v10/users/@me', { headers });
    console.log(`Discord bot token accepted: ${r.status === 200 ? 'yes' : 'no'} (HTTP ${r.status})`);
  } catch (e) {
    console.log(`Discord bot token accepted: unknown (${e?.name === 'AbortError' ? 'timeout' : e?.message || 'request failed'})`);
  }

  try {
    const r = await fetchWithTimeout('https://discord.com/api/v10/gateway/bot', { headers });
    console.log(`Discord authenticated gateway endpoint: ${r.ok ? 'reachable' : 'blocked/rejected'} (HTTP ${r.status})`);
  } catch (e) {
    console.log(`Discord authenticated gateway endpoint: unreachable (${e?.name === 'AbortError' ? 'timeout' : e?.message || 'request failed'})`);
  }
}

async function testDiscordWebSocket() {
  return await new Promise((resolve) => {
    let settled = false;
    let ws;
    const finish = (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws?.close(); } catch {}
      console.log(message);
      resolve();
    };
    const timer = setTimeout(() => finish('Discord Gateway WebSocket reachable: no (timeout)'), 8000);

    try {
      ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
      ws.addEventListener('open', () => console.log('Discord Gateway WebSocket TCP/TLS open: yes'));
      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (data?.op === 10) finish('Discord Gateway WebSocket reachable: yes (HELLO received)');
          else finish('Discord Gateway WebSocket reachable: yes (message received)');
        } catch {
          finish('Discord Gateway WebSocket reachable: yes (non-JSON message received)');
        }
      });
      ws.addEventListener('error', () => finish('Discord Gateway WebSocket reachable: no (connection error)'));
      ws.addEventListener('close', (event) => {
        if (!settled) finish(`Discord Gateway WebSocket reachable: no (closed ${event.code || 'unknown'})`);
      });
    } catch (e) {
      finish(`Discord Gateway WebSocket reachable: no (${e?.message || 'startup error'})`);
    }
  });
}

await testDiscordRest();
await testDiscordWebSocket();
console.log('Starting application...');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason instanceof Error ? reason.message : String(reason));
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err?.message || String(err));
});

await import('./server.js');
