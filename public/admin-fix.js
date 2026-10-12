const content = document.getElementById('content');
let current = 'overview';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (d) => d ? new Date(d).toLocaleString([], {dateStyle:'medium', timeStyle:'short'}) : 'TBA';

const tiers = [
  {name:'Explorer', min:0},
  {name:'Aviator', min:500},
  {name:'Navigator', min:1500},
  {name:'Captain', min:3000},
  {name:'Global Elite', min:5000}
];

async function api(url, opt) {
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({error:'Unexpected response'}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

function pointsFor(r) {
  const m = Number(r.attendanceMinutes || 0);
  const threshold = Number(r.thresholdMinutes || 30);
  if (m < threshold) return 0;
  if (m >= 120) return 300;
  if (m >= 60) return 200;
  return 100;
}

function tierFor(points) {
  let currentTier = tiers[0], next = tiers[1] || null;
  for (let i = 0; i < tiers.length; i++) {
    if (points >= tiers[i].min) {
      currentTier = tiers[i];
      next = tiers[i + 1] || null;
    }
  }
  const pct = next ? Math.max(0, Math.min(100, ((points - currentTier.min) / (next.min - currentTier.min)) * 100)) : 100;
  return {current:currentTier, next, pct};
}

function fmtMinutes(m) {
  m = Math.max(0, Number(m || 0));
  const h = Math.floor(m / 60), min = m % 60;
  if (!h) return `${min}m`;
  return min ? `${h}h ${min}m` : `${h}h`;
}

function groupPilots(rows) {
  const grouped = new Map();
  for (const r of rows) {
    const id = String(r.userId);
    if (!grouped.has(id)) grouped.set(id, {userId:id, username:r.username || `Discord ${id}`, rows:[]});
    grouped.get(id).rows.push(r);
  }
  return [...grouped.values()].map((p) => {
    const points = p.rows.reduce((n, r) => n + pointsFor(r), 0);
    const minutes = p.rows.reduce((n, r) => n + Number(r.attendanceMinutes || 0), 0);
    const verifiedFlights = p.rows.filter((r) => r.verified || r.claimed || Number(r.attendanceMinutes || 0) >= Number(r.thresholdMinutes || 30)).length;
    const stamps = p.rows.filter((r) => r.claimed).length;
    const inVoice = p.rows.some((r) => r.inVoice);
    return {...p, points, minutes, verifiedFlights, stamps, inVoice, tier:tierFor(points)};
  }).sort((a,b) => a.username.localeCompare(b.username));
}

function bindTabs() {
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
      current = b.dataset.tab;
      load();
    });
  });
}

async function load() {
  content.innerHTML = '<div class="empty">Loading…</div>';
  try {
    if (current === 'overview') showOverview(await api('/api/admin/overview'));
    else if (current === 'events') showEvents(await api('/api/admin/events'));
    else if (current === 'pilots') showPilots(await api('/api/admin/pilots'));
    else if (current === 'audit') showAudit(await api('/api/admin/audit'));
  } catch (e) {
    content.innerHTML = '<div class="card bad">' + esc(e.message) + '</div>';
  }
}

function showOverview(o) {
  content.innerHTML = `
    <div class="grid">
      <div class="card metric"><b>${o.upcomingEvents}</b><span>Upcoming events</span></div>
      <div class="card metric"><b>${o.pilots}</b><span>Registered pilots</span></div>
      <div class="card metric"><b>${o.inVoice}</b><span>In verified voice</span></div>
      <div class="card metric"><b>${o.stamps}</b><span>Stamps claimed</span></div>
    </div>
    <div class="card">
      <div class="row"><span>Discord Gateway</span><strong class="${o.botReady ? 'ok' : 'bad'}">${o.botReady ? 'ONLINE ✓' : 'OFFLINE'}</strong></div>
      <div class="row"><span>Guild connection</span><strong class="${o.guildOnline ? 'ok' : 'warn'}">${o.guildOnline ? 'CONNECTED ✓' : 'WAITING'}</strong></div>
      <div class="row"><span>Stamp ready</span><strong>${o.stampReady}</strong></div>
      <div class="row"><span>Attendance threshold</span><strong>${o.thresholdMinutes} min</strong></div>
      <div class="row"><span>Total registrations</span><strong>${o.registrations}</strong></div>
    </div>`;
}

function showEvents(rows) {
  content.innerHTML = rows.length ? rows.map((e) => `
    <div class="card item">
      <div class="eyebrow">Discord Scheduled Event</div>
      <h3>${esc(e.name)}</h3>
      <p>${esc(fmt(e.start))}</p>
      <p>Voice channel: ${esc(e.channelId || 'Not linked')}</p>
      <span class="pill">${e.registrations} registered</span>
      <span class="pill">${e.inVoice} in voice</span>
      <span class="pill">${e.ready} ready</span>
      <span class="pill">${e.stamped} stamped</span>
    </div>`).join('') : '<div class="empty">No upcoming events.</div>';
}

function showPilots(rows) {
  const pilots = groupPilots(rows);
  content.innerHTML = '<input id="pilotSearch" class="search" placeholder="Search pilot, Discord ID or event…"><div id="pilotRows"></div>';
  const box = document.getElementById('pilotRows');
  const search = document.getElementById('pilotSearch');

  const render = () => {
    const q = search.value.toLowerCase();
    const filtered = pilots.filter((p) => `${p.username} ${p.userId} ${p.tier.current.name} ${p.rows.map(r => r.eventName).join(' ')}`.toLowerCase().includes(q));
    box.innerHTML = filtered.length ? filtered.map((p) => {
      const remaining = p.tier.next ? Math.max(0, p.tier.next.min - p.points) : 0;
      const historyId = `history-${p.userId}`;
      return `
      <div class="card item">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><h3 style="margin-bottom:2px">${esc(p.username)}</h3><p style="margin-top:0">Discord ${esc(p.userId)}</p></div>
          <strong class="${p.inVoice ? 'ok' : ''}">${p.inVoice ? 'IN VOICE ✓' : ''}</strong>
        </div>
        <div class="row"><span>Frequent Flyer</span><strong>${esc(p.tier.current.name)} · ${p.points.toLocaleString()} pts</strong></div>
        <div style="height:8px;background:#142536;border:1px solid #2b4355;border-radius:99px;overflow:hidden;margin:8px 0 5px"><i style="display:block;height:100%;width:${p.tier.pct}%;background:linear-gradient(90deg,#ff9f2f,#ffd27a)"></i></div>
        <p>${p.tier.next ? `${remaining.toLocaleString()} pts to ${esc(p.tier.next.name)}` : 'Top tier achieved'}</p>
        <div class="row"><span>Passport stamps</span><strong class="ok">${p.stamps}</strong></div>
        <div class="row"><span>Verified flights</span><strong>${p.verifiedFlights}</strong></div>
        <div class="row"><span>Verified comms</span><strong>${fmtMinutes(p.minutes)}</strong></div>
        <button class="full" data-history="${historyId}" style="margin-top:10px">View flight history</button>
        <div id="${historyId}" style="display:none;margin-top:10px">
          ${p.rows.slice().sort((a,b)=>new Date(b.start||0)-new Date(a.start||0)).map((r) => `
            <div style="border-top:1px solid #193247;padding:10px 0">
              <strong>${esc(r.eventName)}</strong>
              <p>${esc(fmt(r.start))}</p>
              <div class="row"><span>Attendance</span><strong>${r.attendanceMinutes} min</strong></div>
              <div class="row"><span>Points</span><strong>${pointsFor(r)} pts</strong></div>
              <div class="row"><span>Passport</span><strong class="${r.claimed ? 'ok' : r.verified ? 'warn' : ''}">${r.claimed ? 'STAMPED ✓' : r.verified ? 'STAMP READY' : 'Tracking'}</strong></div>
              <div class="actions">
                <button data-adjust data-user="${esc(r.userId)}" data-event="${esc(r.eventId)}">Adjust time</button>
                <button data-stamp data-user="${esc(r.userId)}" data-event="${esc(r.eventId)}" data-action="${r.claimed ? 'revoke' : 'award'}" class="${r.claimed ? 'revoke' : 'award'}">${r.claimed ? 'Revoke stamp' : 'Award stamp'}</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }).join('') : '<div class="empty">No matching pilots.</div>';

    box.querySelectorAll('[data-history]').forEach((b) => b.addEventListener('click', () => {
      const panel = document.getElementById(b.dataset.history);
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      b.textContent = open ? 'View flight history' : 'Hide flight history';
    }));
    box.querySelectorAll('[data-adjust]').forEach((b) => b.addEventListener('click', () => adjust(b.dataset.user, b.dataset.event)));
    box.querySelectorAll('[data-stamp]').forEach((b) => b.addEventListener('click', () => stamp(b.dataset.user, b.dataset.event, b.dataset.action)));
  };
  search.addEventListener('input', render);
  render();
}

async function adjust(userId, eventId) {
  const raw = prompt('Minutes to add or remove. Use a negative number to remove minutes:', '10');
  if (raw === null) return;
  const delta = Number(raw);
  if (!Number.isFinite(delta) || delta === 0) return alert('Enter a non-zero number of minutes.');
  const reason = prompt('Reason for this attendance adjustment:');
  if (!reason) return;
  try {
    await api('/api/admin/attendance', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId, eventId, deltaMinutes:delta, reason})});
    await load();
  } catch (e) { alert(e.message); }
}

async function stamp(userId, eventId, action) {
  const reason = prompt(`Reason for this ${action} action:`);
  if (!reason) return;
  try {
    await api('/api/admin/stamp', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId, eventId, action, reason})});
    await load();
  } catch (e) { alert(e.message); }
}

function showAudit(rows) {
  content.innerHTML = rows.length ? rows.map((a) => `
    <div class="card item">
      <div class="eyebrow">${esc(new Date(a.at).toLocaleString())}</div>
      <h3>${esc(String(a.action || '').replaceAll('_', ' '))}</h3>
      <p>${esc(a.username || a.userId || '')}${a.eventName ? ' · ' + esc(a.eventName) : ''}</p>
      <p>${esc(a.reason || '')}</p>
    </div>`).join('') : '<div class="empty">No admin changes have been recorded in this server session.</div>';
}

bindTabs();
load();
