(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .beta-banner{display:none!important}

    /* Compact layout pass: about 10–15% less vertical space without shrinking Passport stamps. */
    .top{padding:16px 18px 7px}
    .logo{width:48px;height:48px}
    .screen{padding:8px 16px 104px}
    h1{font-size:27px;margin:5px 0}
    .sub{line-height:1.4}
    .card{padding:14px;margin:11px 0;border-radius:20px}
    .hero{padding:15px;border-radius:21px}
    .hero h2{font-size:21px;margin:4px 0}
    .hero .route{font-size:26px;margin:6px 0}
    .btn{padding:13px;margin-top:10px}
    .stats{gap:8px;margin:11px 0}
    .stat{padding:12px;border-radius:16px}
    .stat b{font-size:20px}
    .quick{gap:8px}
    .quick button{padding:14px;border-radius:16px}
    .quick .ico{margin-bottom:6px}
    .event{padding:12px;margin:8px 0;border-radius:16px}
    .event-times{gap:4px;margin-top:6px;padding:7px 9px}
    .checks{margin-top:10px;padding-top:7px}
    .check{padding:4px 0}
    .profile-row{gap:12px}
    .avatar{width:56px;height:56px;font-size:22px}

    .utc-clock{padding:8px 11px;gap:8px;border-radius:13px;margin:0 0 10px}
    .utc-clock span{font-size:9px}
    .utc-clock strong{font-size:20px}
    .utc-clock small{font-size:8px}

    .rewards-compact{position:relative;overflow:hidden;border:1px solid #6a5530;background:linear-gradient(145deg,#10283c,#091725);border-radius:17px;padding:9px 12px 30px;margin:0 0 10px;height:78px;min-height:78px;max-height:78px}
    .rewards-compact:after{content:'✈';position:absolute;right:-5px;top:-17px;font-size:70px;color:#ffffff07;transform:rotate(-18deg);pointer-events:none}
    .rewards-compact-head{display:flex;justify-content:space-between;align-items:center;gap:10px;position:relative;z-index:1;height:30px}
    .rewards-compact-title{font-size:9px;color:#ffbd66;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .rewards-compact-tier{font-size:14px;font-weight:900;color:#fff;margin-top:1px}
    .rewards-compact-points{text-align:right;font-size:13px;font-weight:900;color:var(--orange)}
    .rewards-compact .rewards-track{position:absolute;left:12px;right:12px;bottom:20px;height:8px;margin:0;background:#142536;border-radius:99px;overflow:hidden;border:1px solid #2b4355;z-index:1}
    .rewards-compact .rewards-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9f2f,#ffd27a);border-radius:99px;transition:none!important}
    .rewards-compact-foot{position:absolute;left:12px;right:12px;bottom:6px;display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:9px;z-index:1;white-space:nowrap}
    .rewards-compact-foot strong{color:#fff}

    .rewards-profile{position:relative;overflow:hidden;border:1px solid #6a5530;background:radial-gradient(circle at top right,#5b421c55,#10283c 42%,#091725);border-radius:20px;padding:14px;margin:11px 0;box-shadow:inset 0 0 28px #ff9f2f0b}
    .rewards-profile:after{content:'✈';position:absolute;right:-8px;top:-18px;font-size:86px;color:#ffffff08;transform:rotate(-18deg);pointer-events:none}
    .rewards-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;position:relative;z-index:1}
    .rewards-title{font-size:10px;color:#ffbd66;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .rewards-tier{font-size:21px;font-weight:1000;margin-top:2px;letter-spacing:.02em}
    .rewards-points{text-align:right}.rewards-points b{display:block;font-size:21px;color:var(--orange)}.rewards-points span{font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
    .rewards-track{height:8px;background:#142536;border-radius:99px;overflow:hidden;margin:7px 0 4px;border:1px solid #2b4355;position:relative;z-index:1}
    .rewards-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9f2f,#ffd27a);border-radius:99px;transition:width .45s ease}
    .rewards-next{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:10px}
    .rewards-next strong{color:#fff}
    .rewards-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .rewards-mini{background:#081521;border:1px solid #19364b;border-radius:12px;padding:9px}.rewards-mini b{display:block;font-size:15px}.rewards-mini span{display:block;color:var(--muted);font-size:8px;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
    .share-achievement{margin-top:10px;background:#5865f2;color:#fff}
    .prototype-pill{display:inline-block;margin-left:6px;padding:3px 6px;border-radius:999px;background:#2a1f10;color:#ffd391;border:1px solid #5b4722;font-size:8px;font-weight:900;vertical-align:1px}
    .share-toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:#102439;color:#fff;border:1px solid #31536d;padding:10px 13px;border-radius:12px;font-size:11px;z-index:200;box-shadow:0 12px 30px #0008}

    @media(max-width:520px){
      .top{padding-top:max(16px,env(safe-area-inset-top))}
      .screen{padding-bottom:calc(104px + env(safe-area-inset-bottom))}
    }
  `;
  document.head.appendChild(style);

  const tiers=[
    {name:'Explorer',min:0},
    {name:'Aviator',min:500},
    {name:'Navigator',min:1500},
    {name:'Captain',min:3000},
    {name:'Global Elite',min:5000}
  ];

  let lastHomeSignature='';
  let lastProfileSignature='';
  const bankedRewards=new Map();

  function eventFor(id){
    try{
      const events=[...(Array.isArray(allEvents)?allEvents:[]),...(Array.isArray(window.passportHistoryEvents)?window.passportHistoryEvents:[])];
      return events.find(e=>String(e?.id||'')===String(id))||null;
    }catch{return null}
  }

  function isEligibleNow(id){
    if(String(id||'').startsWith('flying-now:'))return true;
    const event=eventFor(id);
    if(!event?.start)return true;
    const start=new Date(event.start).getTime();
    return !Number.isFinite(start)||start<=Date.now();
  }

  function pointsForStatus(id,s){
    if(!s?.registered||!isEligibleNow(id)) return 0;
    const m=Number(s.attendanceMinutes||0);
    const threshold=Number(s.thresholdMinutes||30);
    if(m<threshold) return 0;
    if(m>=120) return 300;
    if(m>=60) return 200;
    return 100;
  }

  function stableRows(){
    const source=(typeof statuses==='object'&&statuses)?statuses:{};
    const rows=[];
    const seen=new Set();

    for(const [id,s] of Object.entries(source)){
      if(!s)continue;
      seen.add(id);
      const current={...s,eventId:id,attendanceMinutes:Number(s.attendanceMinutes||0)};
      const banked=bankedRewards.get(id);

      if(current.claimed&&isEligibleNow(id)){
        const next={
          ...banked,
          ...current,
          eventId:id,
          registered:true,
          claimed:true,
          verified:!!(current.verified||banked?.verified),
          attendanceMinutes:Math.max(Number(banked?.attendanceMinutes||0),current.attendanceMinutes),
          thresholdMinutes:Number(current.thresholdMinutes||banked?.thresholdMinutes||30)
        };
        bankedRewards.set(id,next);
      }

      if(banked){
        rows.push({
          ...current,
          eventId:id,
          registered:true,
          claimed:true,
          verified:!!(current.verified||banked.verified),
          attendanceMinutes:Math.max(Number(current.attendanceMinutes||0),Number(banked.attendanceMinutes||0)),
          thresholdMinutes:Number(current.thresholdMinutes||banked.thresholdMinutes||30)
        });
      }else{
        rows.push(current);
      }
    }

    for(const [id,s] of bankedRewards){
      if(!seen.has(id))rows.push({...s,eventId:id});
    }
    return rows;
  }

  function totals(){
    const rows=stableRows();
    const eligible=rows.filter(s=>isEligibleNow(s.eventId));
    const points=eligible.reduce((n,s)=>n+pointsForStatus(s.eventId,s),0);
    const minutes=eligible.reduce((n,s)=>n+(s.registered?Number(s.attendanceMinutes||0):0),0);
    const flights=eligible.filter(s=>s.registered&&(s.verified||s.claimed||Number(s.attendanceMinutes||0)>=Number(s.thresholdMinutes||30))).length;
    return {points,minutes,flights};
  }

  function tierFor(points){
    let current=tiers[0],next=tiers[1]||null;
    for(let i=0;i<tiers.length;i++) if(points>=tiers[i].min){current=tiers[i];next=tiers[i+1]||null}
    const pct=next?Math.max(0,Math.min(100,(points/next.min)*100)):100;
    return {current,next,pct};
  }

  function fmtMinutes(m){
    const h=Math.floor(m/60),min=m%60;
    if(!h)return `${min}m`;
    return min?`${h}h ${min}m`:`${h}h`;
  }

  function ensureHeaderBuildLabel(){
    const subtitle=document.querySelector('.top .brand small');
    if(subtitle) subtitle.textContent='Companion App · RC v1.0.0-rc.1';
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
    ensureHeaderBuildLabel();
    ensureCards();
    const t=totals(),tier=tierFor(t.points);
    const remaining=tier.next?Math.max(0,tier.next.min-t.points):0;
    const homeSignature=[t.points,tier.current.name,tier.next?.name||'',Math.round(tier.pct*1000),remaining].join('|');
    const profileSignature=[homeSignature,t.flights,t.minutes].join('|');
    const home=document.getElementById('rewardsHome');
    if(home&&homeSignature!==lastHomeSignature){
      home.innerHTML=`
        <div class="rewards-compact-head">
          <div><div class="rewards-compact-title">Journey Points</div><div class="rewards-compact-tier">${tier.current.name}</div></div>
          <div class="rewards-compact-points">${t.points.toLocaleString()} points</div>
        </div>
        <div class="rewards-track"><i style="width:${t.points<=0?0:tier.pct}%"></i></div>
        <div class="rewards-compact-foot"><span>${tier.next?`Next: <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} points to go`:'MAX STATUS'}</span></div>
      `;
      lastHomeSignature=homeSignature;
    }
    const profile=document.getElementById('rewardsProfile');
    if(profile&&profileSignature!==lastProfileSignature){
      profile.innerHTML=`
        <div class="rewards-top">
          <div><div class="rewards-title">Journey Points <span class="prototype-pill">RC</span></div><div class="rewards-tier">${tier.current.name}</div></div>
          <div class="rewards-points"><b>${t.points.toLocaleString()}</b><span>Journey Points</span></div>
        </div>
        <div class="rewards-track"><i style="width:${tier.pct}%"></i></div>
        <div class="rewards-next"><span>${tier.next?`Progress to <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} points to go`:'MAX STATUS'}</span></div>
        <div class="rewards-stats"><div class="rewards-mini"><b>${t.flights}</b><span>Verified flights</span></div><div class="rewards-mini"><b>${fmtMinutes(t.minutes)}</b><span>Verified comms</span></div></div>
        <button class="btn share-achievement" onclick="shareRewardsAchievement()">SHARE MY PROGRESS</button>
      `;
      lastProfileSignature=profileSignature;
    }
  }

  function toast(message){
    const old=document.querySelector('.share-toast');if(old)old.remove();
    const n=document.createElement('div');n.className='share-toast';n.textContent=message;document.body.appendChild(n);setTimeout(()=>n.remove(),2200);
  }

  window.shareRewardsAchievement=async function(){
    const t=totals(),tier=tierFor(t.points);
    const name=(typeof currentUser==='object'&&currentUser?.username)?currentUser.username:'A Massive Sim 32 pilot';
    const text=`✈️ MS32 COMPANION APP ACHIEVEMENT\n${name} · ${tier.current.name.toUpperCase()} STATUS\n🏆 ${t.points.toLocaleString()} Journey Points\n✈️ ${t.flights} Verified Community Flight${t.flights===1?'':'s'}\n🎙️ ${fmtMinutes(t.minutes)} Verified Comms\n\nMassive Simulations 32 Companion App`;
    try{
      if(navigator.share){await navigator.share({title:'MS32 Companion App Achievement',text});return}
      await navigator.clipboard.writeText(text);toast('Achievement copied — paste it into Discord');
    }catch(e){if(e?.name!=='AbortError')toast('Could not open sharing on this device')}
  };

  const oldUpdate=typeof updateDashboard==='function'?updateDashboard:null;
  if(oldUpdate){updateDashboard=function(){const r=oldUpdate.apply(this,arguments);setTimeout(render,0);return r};}
  render();
  setInterval(render,5000);
})();
