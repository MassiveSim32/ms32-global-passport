(()=>{
  const tiers=[
    {name:'Explorer',min:0},
    {name:'Aviator',min:500},
    {name:'Navigator',min:1500},
    {name:'Captain',min:3000},
    {name:'Global Elite',min:5000}
  ];

  const pilotKey=()=>{
    const passport=(document.getElementById('profileNo')?.textContent||document.getElementById('passportNo')?.textContent||'').trim();
    const name=(document.getElementById('profileName')?.textContent||'pilot').trim();
    return `ms32:journey-points:${passport||name}`;
  };

  let applying=false;

  function parsePoints(text){
    const n=Number(String(text||'').replace(/[^0-9]/g,''));
    return Number.isFinite(n)?n:0;
  }

  function tierFor(points){
    let current=tiers[0],next=tiers[1]||null;
    for(let i=0;i<tiers.length;i++) if(points>=tiers[i].min){current=tiers[i];next=tiers[i+1]||null}
    const pct=next?Math.max(0,Math.min(100,(points/next.min)*100)):100;
    return {current,next,pct};
  }

  function savedMax(){
    try{return Math.max(0,Number(localStorage.getItem(pilotKey())||0)||0)}catch{return 0}
  }

  function saveMax(points){
    try{localStorage.setItem(pilotKey(),String(points))}catch{}
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
      if(pb)pb.style.width=`${tier.pct}%`;
      if(next)next.innerHTML=`<span>${tier.next?`Progress to <strong>${tier.next.name}</strong>`:'Top tier achieved'}</span><span>${tier.next?`${remaining.toLocaleString()} points to go`:'MAX STATUS'}</span>`;
    }
  }

  function stabilize(){
    if(applying)return;
    const card=document.getElementById('rewardsHome');
    const pointsEl=card?.querySelector('.rewards-compact-points');
    if(!card||!pointsEl)return;

    const current=parsePoints(pointsEl.textContent);
    const max=Math.max(current,savedMax());
    if(max!==savedMax())saveMax(max);
    if(current<max){
      applying=true;
      paint(card,max);
      requestAnimationFrame(()=>{applying=false});
    }
  }

  const observer=new MutationObserver(stabilize);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
  setInterval(stabilize,1000);
  setTimeout(stabilize,0);
})();
