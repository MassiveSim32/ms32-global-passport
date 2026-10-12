(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .rewards-compact{position:relative;overflow:hidden;border:1px solid #6a5530;background:linear-gradient(145deg,#10283c,#091725);border-radius:18px;padding:12px 14px;margin:0 0 14px}
    .rewards-compact:after{content:'✈';position:absolute;right:-5px;top:-17px;font-size:70px;color:#ffffff07;transform:rotate(-18deg);pointer-events:none}
    .rewards-compact-head{display:flex;justify-content:space-between;align-items:center;gap:10px;position:relative;z-index:1}
    .rewards-compact-title{font-size:9px;color:#ffbd66;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .rewards-compact-tier{font-size:14px;font-weight:900;color:#fff;margin-top:2px}
    .rewards-compact-points{text-align:right;font-size:13px;font-weight:900;color:var(--orange)}
    .rewards-track{height:9px;background:#142536;border-radius:99px;overflow:hidden;margin:9px 0 5px;border:1px solid #2b4355;position:relative;z-index:1}
    .rewards-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9f2f,#ffd27a);border-radius:99px;transition:width .45s ease}
    .rewards-compact-foot{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:9px;position:relative;z-index:1}
    .rewards-compact-foot strong{color:#fff}
    .rewards-profile{position:relative;overflow:hidden;border:1px solid #6a5530;background:radial-gradient(circle at top right,#5b421c55,#10283c 42%,#091725);border-radius:22px;padding:16px;margin:14px 0;box-shadow:inset 0 0 28px #ff9f2f0b}
    .rewards-profile:after{content:'✈';position:absolute;right:-8px;top:-18px;font-size:86px;color:#ffffff08;transform:rotate(-18deg);pointer-events:none}
    .rewards-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;position:relative;z-index:1}
    .rewards-title{font-size:10px;color:#ffbd66;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .rewards-tier{font-size:22px;font-weight:1000;margin-top:3px;letter-spacing:.02em}
    .rewards-points{text-align:right}.rewards-points b{display:block;font-size:22px;color:var(--orange)}.rewards-points span{font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
    .rewards-next{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:10px}
    .rewards-next strong{color:#fff}
    .rewards-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .rewards-mini{background:#081521;border:1px solid #19364b;border-radius:13px;padding:10px}.rewards-mini b{display:block;font-size:15px}.rewards-mini span{display:block;color:var(--muted);font-size:8px;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
    .share-achievement{margin-top:12px;background:#5865f2;color:#fff}
    .prototype-pill{display:inline-block;margin-left:6px;padding:3px 6px;border-radius:999px;background:#2a1f10;color:#ffd391;border:1px solid #5b4722;font-size:8px;font-weight:900;vertical-align:1px}
    .share-toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:#102439;color:#fff;border:1px solid #31536d;padding:10px 13px;border-radius:12px;font-size:11px;z-index:200;box-shadow:0 12px 30px #0008}
  `;
  document.head.appendChild(style);

  const tiers=[
    {name:'Explorer',min:0},
    {name:'Aviator',min:500},
    {name:'Navigator',min:1500},
    {name:'Captain',min:3000},
    {name:'Global Elite',min:5000}
  ];

  function pointsForStatus(s){
    if(!s?.registered) return 0;
    const m=Number(s.attendanceMinutes||0);
    const threshold=Number(s.thresholdMinutes||30);
    if(m<threshold) return 0;
    if(m>=120) return 300;
    if(m>=60) return 200;
    return 100;
  }

  function totals(){
    const rows=Object.values(typeof statuses==='object'&&statuses?statuses:{}).filter(Boolean);
    const points=rows.reduce((n,s)=>n+pointsForStatus(s),0);
    const minutes=rows.reduce((n,s)=>n+(s.registered?Number(s.attendanceMinutes||0):0),0);
    const flights=rows.filter(s=>s.registered&&(s.verified||s.claimed||Number(s.attendanceMinutes||0)>=Number(s.thresholdMinutes||30))).length;
    return {points,minutes,flights};
  }

  function tierFor(points){
    let current=tiers[0],next=tiers[1]||null;
    for(let i=0;i<tiers.length;i++) if(points>=tiers[i].min){current=tiers[i];next=tiers[i+1]||null}
    const base=current.min;
    const cap=next?next.min:Math.max(points,tiers[tiers.length-1].min);
    const pct=next?Math.max(0,Math.min(100,((points-base)/(cap-base))*100)):100;
    return {current,next,pct};
  }

  function fmtMinutes(m){
    const h=Math.floor(m/60),min=m%60;
    if(!h)return `${min}m`;
    return min?`${h}h ${min}m`:`${h}h`;
  }

  function ensureCards(){
    const home=document.getElementById('home');
    if(home&&!document.getElementById('rewardsHome')){
      const anchor=home.querySelector('.beta-banner')||home.firstElementChild;
      const card=document.createElement('div');
      card.id='rewardsHome';card.className='rewards-compact';
      anchor?.insertAdjacentElement('afterend',card);
    }
    const profile=document.getElementById('profile');
    if(profile&&!document.getElementById('rewardsProfile')){
      const stats=profile.querySelector('.stats');
      const card=document.createElement('div');
      card.id='rewardsProfile';card.className='rewards-profile';
      if(stats)stats.insertAdjacentElement('afterend',card);else profile.appendChild(card);
    }
  }

  function render(){
    ensureCards();
    const t=totals(),tier=tierFor(t.points);
    const remaining=tier.next?Math.max(0,tier.next.min-t.points):0;
    const home=document.getElementById('rewardsHome');
    if(home)home.innerHTML=`
      <div class="rewards-compact-head">
        <div><div class="rewards-compact-title">Frequent Flyer</div><div class="rewards-compact-tier">${tier.current.name}</div></div>
        <div class="rewards-compact-points">${t.points.toLocaleString()} pts</div>
      </div>
      <div class="rewards-track"><i style="width:${tier.pct}%"></i></div>
      <div class="rewards-compact-foot"><span>${tier.next?`Next: <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} pts to go`:'MAX STATUS'}</span></div>
    `;
    const profile=document.getElementById('rewardsProfile');
    if(profile)profile.innerHTML=`
      <div class="rewards-top">
        <div><div class="rewards-title">Frequent Flyer Rewards <span class="prototype-pill">PROTOTYPE</span></div><div class="rewards-tier">${tier.current.name}</div></div>
        <div class="rewards-points"><b>${t.points.toLocaleString()}</b><span>Passport Points</span></div>
      </div>
      <div class="rewards-track"><i style="width:${tier.pct}%"></i></div>
      <div class="rewards-next"><span>${tier.next?`Progress to <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} pts to go`:'MAX STATUS'}</span></div>
      <div class="rewards-stats"><div class="rewards-mini"><b>${t.flights}</b><span>Verified flights</span></div><div class="rewards-mini"><b>${fmtMinutes(t.minutes)}</b><span>Verified comms</span></div></div>
      <button class="btn share-achievement" onclick="shareRewardsAchievement()">SHARE MY PROGRESS</button>
    `;
  }

  function toast(message){
    const old=document.querySelector('.share-toast');if(old)old.remove();
    const n=document.createElement('div');n.className='share-toast';n.textContent=message;document.body.appendChild(n);setTimeout(()=>n.remove(),2200);
  }

  window.shareRewardsAchievement=async function(){
    const t=totals(),tier=tierFor(t.points);
    const name=(typeof currentUser==='object'&&currentUser?.username)?currentUser.username:'A Massive Sim 32 pilot';
    const text=`✈️ MS32 GLOBAL PASSPORT ACHIEVEMENT\n${name} · ${tier.current.name.toUpperCase()} STATUS\n🏆 ${t.points.toLocaleString()} Passport Points\n✈️ ${t.flights} Verified Community Flight${t.flights===1?'':'s'}\n🎙️ ${fmtMinutes(t.minutes)} Verified Comms\n\nMassive Simulations 32 Global Passport`;
    try{
      if(navigator.share){await navigator.share({title:'MS32 Global Passport Achievement',text});return}
      await navigator.clipboard.writeText(text);toast('Achievement copied — paste it into Discord');
    }catch(e){if(e?.name!=='AbortError')toast('Could not open sharing on this device')}
  };

  const oldUpdate=typeof updateDashboard==='function'?updateDashboard:null;
  if(oldUpdate){updateDashboard=function(){const r=oldUpdate.apply(this,arguments);setTimeout(render,0);return r};}
  render();
  setInterval(render,5000);
})();
