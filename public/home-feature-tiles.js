(()=>{
  const home=document.getElementById('home');
  const flying=document.querySelector('.flying-now-card');
  if(!home||!flying||document.getElementById('homeFeatureTiles'))return;

  const style=document.createElement('style');
  style.textContent=`
    .home-feature-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:11px 0}
    .home-feature-tiles .flying-now-card{margin:0;min-height:190px;display:flex;flex-direction:column;justify-content:space-between;border-radius:20px}
    .home-feature-tiles .flying-now-card p{font-size:10px;line-height:1.4}
    .home-feature-tiles .flying-now-card .flying-now-meta{font-size:8px;line-height:1.35}
    .home-feature-tiles .flying-now-card #flyingNowOpen{margin-top:10px}
    .major-event-tile{min-height:190px;border:1px solid #6655a8;border-radius:20px;padding:14px;background:radial-gradient(circle at top right,#46367f,#211d35 52%,#0b1725);position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-shadow:inset 0 0 28px #8f7cff18,0 8px 24px #1e174033}
    .major-event-tile:after{content:'★';position:absolute;right:-4px;top:-22px;font-size:88px;color:#cfc8ff10;transform:rotate(10deg);pointer-events:none}
    .major-event-kicker{font-size:9px;font-weight:900;letter-spacing:.11em;color:#bcaeff;text-transform:uppercase;position:relative;z-index:1}
    .major-event-next{font-size:8px;font-weight:900;letter-spacing:.14em;color:#bcaeff;text-transform:uppercase;margin-top:8px;position:relative;z-index:1}
    .major-event-title{font-size:18px;line-height:1.08;font-weight:1000;margin:3px 0 5px;position:relative;z-index:1}
    .major-event-date{font-size:10px;font-weight:900;color:#a99cff;letter-spacing:.05em;text-transform:uppercase;position:relative;z-index:1}
    .major-event-copy{font-size:9px;color:#bbb6cf;line-height:1.4;margin-top:8px;position:relative;z-index:1}
    .major-event-action{width:100%;margin-top:12px;border:1px solid #7462c5;background:linear-gradient(135deg,#8f7cff,#6f5de0);color:#fff;border-radius:13px;padding:11px;font-weight:900;cursor:pointer;position:relative;z-index:1;box-shadow:0 6px 16px #392f7b44}
    .major-event-action:active{transform:translateY(1px)}
    .major-event-page .event-hub-head{border:1px solid #6655a8;background:radial-gradient(circle at top right,#46367f,#211d35 55%,#0b1725);border-radius:22px;padding:16px;margin:8px 0 12px}
    .major-event-page .event-hub-head h1{margin-bottom:6px}
    .major-event-page .event-hub-date{color:#bcaeff;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
    .major-event-menu{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
    .major-event-menu button{min-height:94px;border-radius:18px;border:1px solid #314c66;background:#0d1d2d;color:#fff;padding:14px;text-align:left;cursor:pointer;font-weight:900}
    .major-event-menu button:nth-child(1){border-color:#7a5a2f;background:radial-gradient(circle at top right,#4c351d,#201a15 58%,#0b1725)}
    .major-event-menu button:nth-child(2){border-color:#2e6f9b;background:radial-gradient(circle at top right,#17486d,#112a3e 58%,#0b1725)}
    .major-event-menu button:nth-child(3){border-color:#2d756b;background:radial-gradient(circle at top right,#174f49,#102f31 58%,#0b1725)}
    .major-event-menu button:nth-child(4){border-color:#6655a8;background:radial-gradient(circle at top right,#46367f,#211d35 58%,#0b1725)}
    .major-event-menu button span{display:block;font-size:22px;margin-bottom:7px}
    .major-event-menu button small{display:block;color:#a8b8c6;font-size:9px;font-weight:700;margin-top:5px;line-height:1.35}
    .major-event-info{display:none;margin-top:12px}
    .major-event-info.active{display:block}
    .major-event-info h3{margin:0 0 6px}
    .event-registration-grid{display:grid;grid-template-columns:1fr;gap:9px;margin-top:13px}
    .event-registration-grid button{width:100%;border:1px solid #385c78;background:linear-gradient(145deg,#12304a,#0b1d2d);color:#fff;border-radius:14px;padding:13px 14px;text-align:left;font-size:11px;font-weight:900;letter-spacing:.035em;cursor:pointer}
    .event-registration-grid button:active{transform:translateY(1px)}
    .major-event-back{margin:0 0 10px;background:#102439;color:#fff;border:1px solid #2b4a64;border-radius:13px;padding:10px 12px;font-weight:900;cursor:pointer}
    @media(max-width:360px){.home-feature-tiles,.major-event-menu{grid-template-columns:1fr}.home-feature-tiles .flying-now-card,.major-event-tile{min-height:auto}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('div');
  wrap.id='homeFeatureTiles';
  wrap.className='home-feature-tiles';
  flying.parentNode.insertBefore(wrap,flying);
  wrap.appendChild(flying);

  const major=document.createElement('div');
  major.className='major-event-tile';
  major.innerHTML=`
    <div>
      <div class="major-event-kicker">Major Event Hub</div>
      <div class="major-event-next">NEXT EVENT</div>
      <div class="major-event-title">Massive Fly In “Broome”</div>
      <div class="major-event-date">14th November 2026</div>
      <div class="major-event-copy">Featured MS32 community event with dedicated event information.</div>
    </div>
    <button class="major-event-action" type="button">MAJOR EVENT HUB</button>`;
  wrap.appendChild(major);

  const app=document.getElementById('app');
  const nav=app?.querySelector('.nav');
  if(app&&!document.getElementById('majorEvent')){
    const page=document.createElement('div');
    page.id='majorEvent';
    page.className='page major-event-page';
    page.innerHTML=`
      <button class="major-event-back" type="button">← BACK TO HOME</button>
      <div class="event-hub-head">
        <div class="eyebrow">Major Event Hub</div>
        <h1>Massive Fly In “Broome”</h1>
        <div class="event-hub-date">14th November 2026 · YBRM Broome</div>
      </div>
      <div class="major-event-menu">
        <button type="button" data-major-section="sponsors"><span>★</span>SPONSORS<small>Event supporters and featured partners</small></button>
        <button type="button" data-major-section="events"><span>✈</span>EVENTS AND REGISTRATIONS<small>Choose an event and manage registration</small></button>
        <button type="button" data-major-section="times"><span>◷</span>TIMES<small>Event schedule and operating times</small></button>
        <button type="button" data-major-section="airfield"><span>◎</span>YBRM AIRFIELD INFO<small>Broome airport information for pilots</small></button>
      </div>
      <div id="major-sponsors" class="card major-event-info"><div class="eyebrow">Sponsors</div><h3>Massive Fly In Broome Sponsors</h3><p class="sub">Sponsor information will be added here as event partners are confirmed.</p></div>
      <div id="major-events" class="card major-event-info"><div class="eyebrow">Events &amp; Registrations</div><h3>Choose an Event</h3><p class="sub">Select an event below to continue to its registration area.</p><div class="event-registration-grid"><button type="button" data-major-registration="drag-racing">DRAG RACING</button><button type="button" data-major-registration="landing-challenge">LANDING CHALLENGE</button><button type="button" data-major-registration="helicopter-precision">HELICOPTER PRECISION</button><button type="button" data-major-registration="jetson-super-cup">JETSON SUPER CUP</button><button type="button" data-major-registration="stol-comp">STOL COMP.</button></div></div>
      <div id="major-times" class="card major-event-info"><div class="eyebrow">Times</div><h3>Event Times</h3><p class="sub">Official Fly In timings will be listed here in both local event time and UTC once finalised.</p></div>
      <div id="major-airfield" class="card major-event-info"><div class="eyebrow">YBRM</div><h3>Broome Airfield Information</h3><p class="sub">Dedicated YBRM pilot information, arrival notes and useful airfield details will be added here for the event.</p></div>`;
    if(nav)app.insertBefore(page,nav);else app.appendChild(page);

    page.querySelector('.major-event-back')?.addEventListener('click',()=>{if(typeof showPage==='function')showPage('home')});
    page.querySelectorAll('[data-major-section]').forEach(btn=>btn.addEventListener('click',()=>{
      page.querySelectorAll('.major-event-info').forEach(x=>x.classList.remove('active'));
      document.getElementById(`major-${btn.dataset.majorSection}`)?.classList.add('active');
    }));
  }

  major.querySelector('button')?.addEventListener('click',()=>{if(typeof showPage==='function')showPage('majorEvent')});
})();