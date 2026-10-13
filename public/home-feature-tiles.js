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
    .major-event-tile{min-height:190px;border:1px solid #8b6a2e;border-radius:20px;padding:14px;background:radial-gradient(circle at top right,#6e4c17,#242015 52%,#0b1725);position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-shadow:inset 0 0 26px #ffb33a12}
    .major-event-tile:after{content:'★';position:absolute;right:-4px;top:-22px;font-size:88px;color:#ffffff0a;transform:rotate(10deg);pointer-events:none}
    .major-event-kicker{font-size:9px;font-weight:900;letter-spacing:.11em;color:#ffd27a;text-transform:uppercase;position:relative;z-index:1}
    .major-event-title{font-size:18px;line-height:1.08;font-weight:1000;margin:8px 0 5px;position:relative;z-index:1}
    .major-event-date{font-size:10px;font-weight:900;color:#ffbd66;letter-spacing:.05em;text-transform:uppercase;position:relative;z-index:1}
    .major-event-copy{font-size:9px;color:#c7b79b;line-height:1.4;margin-top:8px;position:relative;z-index:1}
    .major-event-action{width:100%;margin-top:12px;border:1px solid #a97b2c;background:linear-gradient(135deg,#ffc15c,#ff9f2f);color:#17202a;border-radius:13px;padding:11px;font-weight:900;cursor:pointer;position:relative;z-index:1}
    .major-event-action:active{transform:translateY(1px)}
    @media(max-width:360px){.home-feature-tiles{grid-template-columns:1fr}.home-feature-tiles .flying-now-card,.major-event-tile{min-height:auto}}
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
      <div class="major-event-kicker">Major Event</div>
      <div class="major-event-title">Massive Fly In Broome</div>
      <div class="major-event-date">14th November 2026</div>
      <div class="major-event-copy">Featured MS32 community event. Full flight details will appear in Upcoming Flights as they are published.</div>
    </div>
    <button class="major-event-action" type="button">VIEW FLIGHTS</button>`;
  major.querySelector('button')?.addEventListener('click',()=>{if(typeof showPage==='function')showPage('flights')});
  wrap.appendChild(major);
})();