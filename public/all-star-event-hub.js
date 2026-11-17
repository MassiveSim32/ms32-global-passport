(()=>{
  const home=document.getElementById('home');
  const app=document.getElementById('app');
  if(!home||!app||document.getElementById('majorEvent'))return;
  const sponsorStyle=document.createElement('style');
  sponsorStyle.textContent='#major-sponsors .event-sponsor-grid{display:grid;grid-template-columns:minmax(0,280px);gap:12px;margin:16px 0}#major-sponsors .event-sponsor-tile{min-height:145px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;border:1px solid #b49354;border-radius:15px;background:#102234;padding:18px}#major-sponsors .event-sponsor-tile img{display:block;max-width:100%;max-height:90px;object-fit:contain}#major-sponsors .event-sponsor-label{font-size:10px;letter-spacing:.1em;color:#d8c18a;text-transform:uppercase}';
  document.head.appendChild(sponsorStyle);
  const tile=document.createElement('section');
  tile.className='major-event-tile';
  tile.setAttribute('aria-label','All Star Event 18 December 2026');
  tile.innerHTML='<div><div class="major-event-kicker">★ MAJOR EVENT HUB</div><div class="major-event-next">UPCOMING EVENT</div><div class="major-event-title">MS32 All Star Event</div><div class="major-event-date">Friday 18 December 2026</div><div class="major-event-copy">A special community event celebrating our MS32 pilots. More details coming soon.</div></div><button class="major-event-action" type="button">OPEN MAJOR EVENT HUB</button>';
  const flightTiles=document.getElementById('homeFeatureTiles');
  if(flightTiles)flightTiles.appendChild(tile);
  else home.appendChild(tile);
  const page=document.createElement('div');
  page.id='majorEvent';
  page.className='page major-event-page';
  page.innerHTML='<button class="major-event-back" type="button">← BACK TO HOME</button><div class="event-hub-head"><div class="eyebrow">★ Major Event Hub</div><h1>MS32 All Star Event</h1><div class="event-hub-date">Friday 18 December 2026</div><p class="sub">Celebrating the stars of the MS32 community.</p></div><div class="major-event-menu"><button type="button" data-major-section="events"><span>✈</span>EVENTS<small>Programme to be announced</small></button><button type="button" data-major-section="times"><span>◷</span>TIMES<small>Schedule to be confirmed</small></button><button type="button" data-major-section="sponsors"><span>★</span>SPONSORS &amp; PRIZES<small>Details coming soon</small></button></div><div id="major-events" class="card major-event-info active"><div class="eyebrow">All Star Event</div><h3>Event Programme</h3><p class="sub">Event activities and registrations will be announced here.</p></div><div id="major-times" class="card major-event-info"><div class="eyebrow">Schedule</div><h3>Friday 18 December 2026</h3><p class="sub">Start time and programme to be confirmed.</p></div><div id="major-sponsors" class="card major-event-info"><div class="eyebrow">Sponsors &amp; Prizes</div><h3>All Star Event Sponsor</h3><p class="sub">FlightFX</p><div class="event-sponsor-grid" aria-label="All Star Event sponsors"></div><p class="sub">Prize details to be confirmed.</p></div>';
  const nav=app.querySelector('.nav');
  if(nav)app.insertBefore(page,nav);else app.appendChild(page);
  const go=(id)=>{if(typeof showPage==='function')showPage(id)};
  tile.querySelector('button').addEventListener('click',()=>go('majorEvent'));
  page.querySelector('.major-event-back').addEventListener('click',()=>go('home'));
  page.querySelectorAll('[data-major-section]').forEach(btn=>btn.addEventListener('click',()=>{
    page.querySelectorAll('.major-event-info').forEach(section=>section.classList.remove('active'));
    page.querySelector('#major-'+btn.dataset.majorSection)?.classList.add('active');
  }));
})();