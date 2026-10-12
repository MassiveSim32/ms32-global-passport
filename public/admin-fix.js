const content = document.getElementById('content');
let current = 'overview';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (d) => d ? new Date(d).toLocaleString([], {dateStyle:'medium', timeStyle:'short'}) : 'TBA';

async function api(url, opt) {
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({error:'Unexpected response'}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
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
  content.innerHTML = '<input id="pilotSearch" class="search" placeholder="Search pilot or event…"><div id="pilotRows"></div>';
  const box = document.getElementById('pilotRows');
  const search = document.getElementById('pilotSearch');
  const render = () => {
    const q = search.value.toLowerCase();
    const filtered = rows.filter((r) => `${r.username} ${r.userId} ${r.eventName}`.toLowerCase().includes(q));
    box.innerHTML = filtered.length ? filtered.map((r) => `
      <div class="card item">
        <h3>${esc(r.username)}</h3>
        <p>${esc(r.eventName)}</p>
        <div class="row"><span>Attendance</span><strong>${r.attendanceMinutes}/${r.thresholdMinutes} min</strong></div>
        <div class="row"><span>Voice</span><strong class="${r.inVoice ? 'ok' : ''}">${r.inVoice ? 'IN VOICE ✓' : 'Not in voice'}</strong></div>
        <div class="row"><span>Passport</span><strong class="${r.claimed ? 'ok' : r.verified ? 'warn' : ''}">${r.claimed ? 'STAMPED ✓' : r.verified ? 'STAMP READY' : 'Tracking'}</strong></div>
        <div class="actions">
          <button data-adjust data-user="${esc(r.userId)}" data-event="${esc(r.eventId)}">Adjust time</button>
          <button data-stamp data-user="${esc(r.userId)}" data-event="${esc(r.eventId)}" data-action="${r.claimed ? 'revoke' : 'award'}" class="${r.claimed ? 'revoke' : 'award'}">${r.claimed ? 'Revoke stamp' : 'Award stamp'}</button>
        </div>
      </div>`).join('') : '<div class="empty">No matching registrations.</div>';

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
