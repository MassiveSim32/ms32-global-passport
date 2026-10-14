(()=>{
  const tiers=[
    {name:'Explorer',min:0},
    {name:'Aviator',min:500},
    {name:'Navigator',min:1500},
    {name:'Captain',min:3000},
    {name:'Global Elite',min:5000}
  ];

  // Keep earned rewards stable within the current session, but never persist a
  // guessed/high-water total in localStorage. The previous implementation did
  // that and could permanently pin an incorrect value such as 200 points.
  const bankedEarned=new Map();
  let applying=false;

  function isJourneyEvent(id){
    return !!id && !String(id).startsWith('flying-now:');
  }

  function pointsFor(status){
    // Journey Points are earned by completed Passport flights only. A future
    // registration, manually seeded attendance or Flying Now bonus stamp must
    // not award Journey Points.
    if(!status?.registered || !status.claimed || !status.verified) return 0;
    const m=Number(status.attendanceMinutes||0);
    const threshold=Number(status.thresholdMinutes||30);
    if(m<threshold) return 0;
    if(m>=120) return 300;
    if(m>=60) return 200;
    return 100;
  }

  function authoritativePoints(){
    const source=(typeof statuses==='object'&&statuses)?statuses:{};
    const seen=new Set();

    for(const [id,s] of Object.entries(source)){
      if(!isJourneyEvent(id)||!s)continue;
      seen.add(id);
      const earned=pointsFor(s);
      if(earned>0) bankedEarned.set(id,Math.max(Number(bankedEarned.get(id)||0),earned));
    }

    let total=0;
    for(const value of bankedEarned.values()) total+=Number(value||0);
    return total;
  }

  function tierFor(points){
    let current=tiers[0],next=tiers[1]||null;
    for(let i=0;i<tiers.length;i++) if(points>=tiers[i].min){current=tiers[i];next=tiers[i+1]||null}
    const pct=next?Math.max(0,Math.min(100,(points/next.min)*100)):100;
    return {current,next,pct};
  }

  function paint(card,points){
    const tier=tierFor(points);
    const remaining=tier.next?Math.max(0,tier.next.min-points):0;
    const pointsEl=card.querySelector('.rewards-compact-points');
    const tierEl=card.querySelector('.rewards-compact-tier');
    const bar=card.querySelector('.rewards-track i');
    const foot=card.querySelector('.rewards-compact-foot');
    if(pointsEl)pointsEl.textContent=`${points.toLocaleString()} points`;
    if(tierEl)tierEl.textContent=tier.current.name;
    if(bar)bar.style.width=`${points<=0?0:tier.pct}%`;
    if(foot)foot.innerHTML=`<span>${tier.next?`Next: <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} points to go`:'MAX STATUS'}</span>`;

    const profile=document.getElementById('rewardsProfile');
    if(profile){
      const p=profile.querySelector('.rewards-points b');
      const pt=profile.querySelector('.rewards-tier');
      const pb=profile.querySelector('.rewards-track i');
      const next=profile.querySelector('.rewards-next');
      if(p)p.textContent=points.toLocaleString();
      if(pt)pt.textContent=tier.current.name;
      if(pb)pb.style.width=`${points<=0?0:tier.pct}%`;
      if(next)next.innerHTML=`<span>${tier.next?`Progress to <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} points to go`:'MAX STATUS'}</span>`;
    }
  }

  function clearLegacyCache(){
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const key=localStorage.key(i);
        if(key&&key.startsWith('ms32:journey-points:')) localStorage.removeItem(key);
      }
    }catch{}
  }

  function stabilize(){
    if(applying)return;
    const card=document.getElementById('rewardsHome');
    if(!card)return;
    const points=authoritativePoints();
    applying=true;
    paint(card,points);
    requestAnimationFrame(()=>{applying=false});
  }

  clearLegacyCache();
  const observer=new MutationObserver(stabilize);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
  setInterval(stabilize,1000);
  setTimeout(stabilize,0);
})();
