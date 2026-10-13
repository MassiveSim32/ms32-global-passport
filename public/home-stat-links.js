(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .stat.stat-link{cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;background:linear-gradient(145deg,#0d2030,#091725)}
    .stat.stat-link:hover,.stat.stat-link:focus-visible{transform:translateY(-2px);border-color:#3a6686;box-shadow:0 8px 22px #0005;outline:none}
    .stat.stat-link:active{transform:translateY(0)}
    .stat.stat-link:after{content:'TAP TO VIEW';display:block;margin-top:7px;font-size:8px;font-weight:900;letter-spacing:.1em;color:#6f8da3}
    .event.ms32-registered-focus{border-color:#45d18e!important;box-shadow:0 0 0 1px #45d18e55,0 8px 24px #0005}
  `;
  document.head.appendChild(style);

  function activate(el,fn){
    if(!el)return;
    const card=el.closest('.stat');
    if(!card||card.dataset.statLinked==='1')return;
    card.dataset.statLinked='1';
    card.classList.add('stat-link');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.addEventListener('click',fn);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}});
  }

  function showRegisteredFlights(){
    if(typeof showPage==='function')showPage('flights');
    setTimeout(()=>{
      document.querySelectorAll('.event.ms32-registered-focus').forEach(x=>x.classList.remove('ms32-registered-focus'));
      let first=null;
      try{
        for(const e of (Array.isArray(allEvents)?allEvents:[])){
          if(!statuses?.[e.id]?.registered)continue;
          const card=document.getElementById(`e-${e.id}`);
          if(card){card.classList.add('ms32-registered-focus');if(!first)first=card}
        }
      }catch{}
      (first||document.getElementById('events'))?.scrollIntoView({behavior:'smooth',block:'start'});
    },80);
  }

  function showPassport(){
    if(typeof showPage==='function')showPage('passport');
    setTimeout(()=>document.getElementById('stampBook')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  activate(document.getElementById('upcomingCount'),showRegisteredFlights);
  activate(document.getElementById('stampCount'),showPassport);
})();
