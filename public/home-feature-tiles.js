(()=>{
  const home=document.getElementById('home');
  const flying=document.querySelector('.flying-now-card');
  if(!home||!flying||document.getElementById('homeFeatureTiles'))return;

  const style=document.createElement('style');
  style.textContent=`
    .home-feature-tiles{display:grid;grid-template-columns:1fr;gap:10px;margin:11px 0}
    #home>.major-event-tile{min-height:0;margin:0 0 14px;padding:18px;border-color:#a28cf0;box-shadow:inset 0 0 28px #8f7cff18,0 8px 24px #1e174033}
    /* Soft rotating violet/gold light tracing the event card border. */
    #home>.major-event-tile{isolation:isolate}
    #home>.major-event-tile:before{content:'';position:absolute;inset:0;border-radius:inherit;padding:3px;background:linear-gradient(115deg,#9c80ff,#4b367a,#d8b96d,#fff0bd,#7d66da,#9c80ff);background-size:300% 300%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude;pointer-events:none;z-index:2;animation:ms32-event-border-spin 7s ease-in-out infinite}
    #home>.major-event-tile{animation:ms32-event-border-glow 3.5s ease-in-out infinite alternate}
    @keyframes ms32-event-border-spin{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    @keyframes ms32-event-border-glow{from{box-shadow:0 0 10px #8f7cff35,0 8px 24px #1e174033}to{box-shadow:0 0 24px #b79bff65,0 0 9px #d8b96d55,0 8px 24px #1e174033}}
    @media(prefers-reduced-motion:reduce){#home>.major-event-tile,#home>.major-event-tile:before{animation:none!important}}
    #home>.major-event-tile .major-event-title{font-size:23px}
    #home>.major-event-tile .major-event-action{font-size:13px}
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
    .major-event-roster{margin-top:12px;border:1px solid #385c78;background:#0b1d2d;border-radius:14px;padding:14px}
    .major-event-roster h4{margin:0 0 10px;font-size:13px;color:#fff}
    .major-event-roster{margin:0 0 5px;border-color:#2d756b;background:linear-gradient(145deg,#12332f,#0b201f);box-shadow:inset 0 0 0 1px #3c987022}
    .major-event-roster[hidden]{display:none}
    .major-event-roster h4{color:#b8f5d4}
    .major-event-roster ul{margin:0;padding:0;list-style:none;display:grid;gap:6px}
    .major-event-roster li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 10px;border:1px solid #2d756b;border-radius:9px;background:#09251e;color:#f0fff7;font-size:12px}
    .major-event-odds{flex-shrink:0;font-weight:900;color:#c4ffb4;border:1px solid #468e5b;border-radius:7px;padding:3px 7px;background:#183c27}
    .major-event-roster li.major-event-favourite{border-color:#c6a34e;background:linear-gradient(105deg,#59461f 0%,#3e371f 38%,#09251e 100%);box-shadow:inset 3px 0 0 #e6c66a,0 0 12px #c69b2d22}
    .major-event-favourite .major-event-odds{color:#ffe8a0;border-color:#c6a34e;background:linear-gradient(135deg,#79571e,#3a2c14)}
    .major-event-favourite-label{font-size:9px;font-weight:900;color:#ffe29a;letter-spacing:.05em;margin-left:7px}
    .major-event-odds-note{margin:0 0 10px;color:#a9d9c3;font-size:10px}
    .event-registration-grid button[aria-expanded="true"]{border-color:#48a77c;background:linear-gradient(145deg,#174f49,#102f31)}

    .major-sponsor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .major-sponsor-item{min-width:0}
    .major-sponsor-button{width:100%;min-height:84px;border:1px solid #96733c;border-radius:14px;background:radial-gradient(circle at top right,#4b3a22,#201c19 62%,#111b24);color:#f7e4bb;cursor:pointer;padding:12px 8px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;line-height:1.25;font-weight:900;letter-spacing:.02em;overflow-wrap:anywhere}
    .major-sponsor-button[aria-expanded="true"]{border-color:#e1b85b;background:linear-gradient(145deg,#58401f,#29251c)}
    .major-sponsor-prizes{margin-top:6px;border:1px solid #9b7941;background:linear-gradient(145deg,#342b1d,#151e23);border-radius:12px;padding:12px;color:#fff}
    .major-sponsor-prizes[hidden]{display:none}
    .major-sponsor-prizes h4{margin:0 0 8px;color:#f5d58c;font-size:12px}
    .major-sponsor-prizes ul{margin:0;padding-left:17px;font-size:11px;line-height:1.6}
    @media(max-width:440px){.major-sponsor-grid{grid-template-columns:1fr}}
    .major-event-schedule{display:grid;gap:10px;margin-top:13px}
    .major-event-schedule-row{display:grid;grid-template-columns:82px 1fr;gap:12px;align-items:center;border:1px solid #2d756b;background:linear-gradient(145deg,#12332f,#0b201f);border-radius:14px;padding:13px 14px}
    .major-event-schedule-row strong{font-size:13px;color:#73e1c5;letter-spacing:.05em}
    .major-event-schedule-row span{font-size:11px;font-weight:800;color:#fff;line-height:1.35}
    .major-event-schedule-date{font-size:9px;font-weight:900;letter-spacing:.12em;color:#9bb8c8;text-transform:uppercase;margin-top:2px}
    .major-event-back{margin:0 0 10px;background:#102439;color:#fff;border:1px solid #2b4a64;border-radius:13px;padding:10px 12px;font-weight:900;cursor:pointer}
    @media(max-width:360px){.home-feature-tiles,.major-event-menu{grid-template-columns:1fr}.home-feature-tiles .flying-now-card,.major-event-tile{min-height:auto}.major-event-schedule-row{grid-template-columns:1fr}}
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
  // Make the significant Broome Fly-In the first feature on the Home page.
  home.insertBefore(major,home.firstElementChild);

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
        <button type="button" data-major-section="sponsors"><span>★</span>SPONSORS AND PRIZES<small>Explore sponsor prize packs</small></button>
        <button type="button" data-major-section="events"><span>✈</span>EVENTS<small>Choose an event and manage registration</small></button>
        <button type="button" data-major-section="times"><span>◷</span>TIMES<small>Event schedule and operating times</small></button>
        <button type="button" data-major-section="airfield"><span>◎</span>YBRM AIRFIELD INFO<small>Broome airport information for pilots</small></button>
      </div>
      <div id="major-sponsors" class="card major-event-info"></div>
      <div id="major-events" class="card major-event-info"><div class="eyebrow">Events &amp; Registrations</div><h3>Choose an Event</h3><p class="sub">Select an event below to continue to its registration area.</p><div class="event-registration-grid"><button type="button" data-major-registration="helicopter-precision">HELICOPTER PRECISION · 0945 UTC</button><button type="button" data-major-registration="landing-challenge">LANDING CHALLENGE · 1015 UTC</button><button type="button" data-major-registration="jetson-super-cup">JETSON SUPER CUP · 1045 UTC</button><button type="button" data-major-registration="stol-comp">STOL COMP. · 1115 UTC</button><button type="button" data-major-registration="drag-racing">DRAG RACING · 1145 UTC</button></div><div id="major-drag-racing-roster" class="major-event-roster" hidden><h4>Drag Racing · 1145 UTC</h4><ul><li>Treetops Trev</li><li>Bryan</li><li>ABF</li><li>Zed</li><li>Srinoob</li><li>Hookalaya James</li><li>Horus</li><li>Kevin</li></ul></div><div id="major-landing-challenge-roster" class="major-event-roster" hidden><h4>Landing Challenge</h4><ul><li>Treetops Trev</li><li>Bryan</li><li>Zed</li><li>Srinoob</li><li>Runman Mick</li><li>Kevin</li><li>TunaCat Ryan</li></ul></div><div id="major-helicopter-precision-roster" class="major-event-roster" hidden><h4>Helicopter Precision</h4><ul><li>Treetops Trev</li><li>Zed</li><li>Srinoob</li><li>Runman Mick</li><li>Fetter</li></ul></div><div id="major-jetson-super-cup-roster" class="major-event-roster" hidden><h4>Jetson Super Cup</h4><h4>Heat 1</h4><ul><li>Treetops Trev</li><li>Bryan</li><li>ABF</li><li>Zed</li></ul><h4 style="margin-top:14px">Heat 2</h4><ul><li>Srinoob</li><li>Horus</li><li>Kevin</li><li>Fetter</li></ul></div><div id="major-stol-comp-roster" class="major-event-roster" hidden><h4>STOL COMP. — Participants</h4><ul><li>Treetops Trev</li><li>Bryan</li><li>ABF</li><li>Zed</li><li>Runman Mick</li><li>Srinoob</li><li>Hookalaya James</li><li>Larry</li><li>Kevin</li><li>TunaCat Ryan</li></ul></div></div>
      <div id="major-times" class="card major-event-info"><div class="eyebrow">Times</div><h3>Saturday 14th November 2026</h3><div class="major-event-schedule"><div class="major-event-schedule-row"><strong>Now–0830 UTC</strong><span>Pilots fly into Broome (YBRM)</span></div><div class="major-event-schedule-row"><strong>0900 UTC</strong><span>Pilots to be mustered and parked</span></div><div class="major-event-schedule-row"><strong>0910 UTC</strong><span>F111 Fly Past</span></div><div class="major-event-schedule-row"><strong>0920 UTC</strong><span>Fly In Intro and Awards</span></div><div class="major-event-schedule-row"><strong>0930 UTC</strong><span>Pilots Briefing</span></div><div class="major-event-schedule-row"><strong>0945 UTC</strong><span>Competitions Commence</span></div></div></div>
      <div id="major-airfield" class="card major-event-info"><div class="eyebrow">YBRM</div><h3>Broome Airfield Information</h3><p class="sub">Dedicated YBRM pilot information, arrival notes and useful airfield details will be added here for the event.</p></div>`;
    if(nav)app.insertBefore(page,nav);else app.appendChild(page);

    page.querySelector('.major-event-back')?.addEventListener('click',()=>{if(typeof showPage==='function')showPage('home')});
    // Keep each roster directly beneath its own event button.
    page.querySelectorAll('[data-major-registration]').forEach((button,eventIndex)=>{
      const roster=page.querySelector('#major-'+button.dataset.majorRegistration+'-roster');
      if(!roster)return;
      button.insertAdjacentElement('afterend',roster);
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-controls',roster.id);
      const note=document.createElement('p');
      note.className='major-event-odds-note';
      note.textContent='Just-for-fun fictional odds — no real betting.';
      roster.querySelector('h4')?.insertAdjacentElement('afterend',note);
      let favourite=null;
      let lowestOdds=Infinity;
      roster.querySelectorAll('li').forEach((li,pilotIndex)=>{
        const value=2+((eventIndex*13+pilotIndex*7+3)%29)/4;
        const odds=document.createElement('span');
        odds.className='major-event-odds';
        odds.textContent=value.toFixed(2)+'×';
        odds.setAttribute('aria-label','Fictional odds '+odds.textContent);
        li.appendChild(odds);
        if(value<lowestOdds){lowestOdds=value;favourite=li;}
      });
      if(favourite){
        favourite.classList.add('major-event-favourite');
        const label=document.createElement('span');
        label.className='major-event-favourite-label';
        label.textContent='★ FAVOURITE';
        favourite.insertBefore(label,favourite.querySelector('.major-event-odds'));
      }
      button.addEventListener('click',()=>button.setAttribute('aria-expanded',String(!roster.hidden)));
    });
    page.querySelector('[data-major-registration="stol-comp"]')?.addEventListener('click',()=>{
      const roster=page.querySelector('#major-stol-comp-roster');
      if(roster)roster.hidden=!roster.hidden;
    });
    page.querySelector('[data-major-registration="jetson-super-cup"]')?.addEventListener('click',()=>{
      const roster=page.querySelector('#major-jetson-super-cup-roster');
      if(roster)roster.hidden=!roster.hidden;
    });
    page.querySelector('[data-major-registration="helicopter-precision"]')?.addEventListener('click',()=>{
      const roster=page.querySelector('#major-helicopter-precision-roster');
      if(roster)roster.hidden=!roster.hidden;
    });
    page.querySelector('[data-major-registration="landing-challenge"]')?.addEventListener('click',()=>{
      const roster=page.querySelector('#major-landing-challenge-roster');
      if(roster)roster.hidden=!roster.hidden;
    });
    page.querySelector('[data-major-registration="drag-racing"]')?.addEventListener('click',()=>{
      const roster=page.querySelector('#major-drag-racing-roster');
      if(roster)roster.hidden=!roster.hidden;
    });
    page.querySelectorAll('[data-major-section]').forEach(btn=>btn.addEventListener('click',()=>{
      page.querySelectorAll('.major-event-info').forEach(x=>x.classList.remove('active'));
      document.getElementById(`major-${btn.dataset.majorSection}`)?.classList.add('active');
    }));
  }

  major.querySelector('button')?.addEventListener('click',()=>{if(typeof showPage==='function')showPage('majorEvent')});
})();