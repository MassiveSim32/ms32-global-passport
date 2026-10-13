const originalFetch = globalThis.fetch.bind(globalThis);

function isDiscordMessagePost(url, options={}) {
  return options?.method === 'POST' && /^https:\/\/discord\.com\/api\/v10\/channels\/\d+\/messages$/.test(String(url));
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

globalThis.fetch = async function ms32Fetch(url, options={}) {
  if (!isDiscordMessagePost(url, options)) return originalFetch(url, options);

  let response = await originalFetch(url, options);
  for (let attempt = 0; attempt < 3 && response.status === 429; attempt++) {
    let waitMs = 1500;
    try {
      const clone = response.clone();
      const body = await clone.json();
      const retry = Number(body?.retry_after);
      if (Number.isFinite(retry) && retry > 0) waitMs = Math.min(15000, Math.max(500, retry * 1000 + 250));
    } catch {}
    await sleep(waitMs);
    response = await originalFetch(url, options);
  }
  return response;
};

await import('./server-fixed-wrapper.js');
