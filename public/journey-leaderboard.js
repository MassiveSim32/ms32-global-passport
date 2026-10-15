(()=>{
  const css=document.createElement('style');
  css.textContent=`
    #ms32LeaderboardBtn{display:block;width:100%;margin:5px 0 11px;padding:11px 14px;border:1px solid #b67b2e;border-radius:13px;background:linear-gradient(100deg,#2c2418,#122638);color:#ffcb7b;font-size:12px;font-weight:900;letter-spacing:.04em;cursor:pointer}
    #ms32LeaderboardOverlay{position:fixed;inset:0;z-index:9999;background:#030a12ef;display:flex;align-items:center;justify-content:center;padding:16px}
    #ms32LeaderboardOverlay .board{width:min(100%,500px);max-height:87vh;overflow:auto;background:#091b2b;border:1px solid #a77736;border-radius:20px;padding:18px;color:#f4f8ff;box-shadow:0 24px 80px #000b}
    #ms32LeaderboardOverlay .board-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    #ms32LeaderboardOverlay h2{margin:0;color:#ffc16b;font-size:21px}
    #ms32LeaderboardOverlay .close{background:#1c3448;color:#fff;border:1px solid #466075;border-radius:9px;padding:7px 12px;cursor:pointer}
    #ms32LeaderboardOverlay .board-sub{font-size:11px;color:#9db6c9;margin:7px 0 12px}
    #ms32LeaderboardOverlay .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 13px}
    #ms32LeaderboardOverlay .tab{padding:9px 5px;border-radius:10px;border:1px solid #315066;background:#0c2334;color:#aac1d3;font-size:10px;font-weight:900;cursor:pointer}
    #ms32LeaderboardOverlay .tab.active{border-color:#d99b41;background:#3c2d19;color:#ffd28b}
    #ms32LeaderboardOverlay .entry{display:grid;grid-template-columns:35px 1fr auto;gap:10px;align-items:center;padding:11px 7px;border-bottom:1px solid #244055;font-size:12px}
    #ms32LeaderboardOverlay .entry strong{color:#ffc16b}
    #ms32LeaderboardOverlay .mine{border:1px solid #d99b41;border-radius:10px;background:#4d361d55}
    #ms32LeaderboardOverlay .split{display:block;color:#8fa9bc;font-size:9px;margin-top:3px}
  `;
  document.head.appendChild(css);
  function install(){
    const card=document.getElementById('rewardsHome');
    if(!card||document.getElementById('ms32LeaderboardBtn'))return;
    const btn=document.createElement('button');
    btn.id='ms32LeaderboardBtn';btn.type='button';btn.textContent='🏆 VIEW LEADERBOARDS';
    btn.addEventListener('click',open);
    card.insertAdjacentElement('afterend',btn);
  }
  function tier(points){return points>=5000?'Global Elite':points>=3000?'Captain':points>=1500?'Navigator':points>=500?'Aviator':'Explorer'}
  function entry(p,mine,mode){
    const div=document.createElement('div');div.className='entry'+(mine?' mine':'');
    const rank=document.createElement('strong');rank.textContent='#'+p.rank;
    const name=document.createElement('span');
    name.textContent=p.username+(mine?' (You)':'')+(mode==='overall'?' · '+tier(p.points):'');
    if(mode==='overall'){
      const split=document.createElement('small');split.className='split';split.textContent=`Community ${Number(p.communityPoints||0).toLocaleString()} · Spontaneous ${Number(p.spontaneousPoints||0).toLocaleString()}`;name.appendChild(split);
    }
    const points=document.createElement('strong');points.textContent=Number(p.points).toLocaleString()+' JP';
    div.append(rank,name,points);return div;
  }
  async function open(){
    document.getElementById('ms32LeaderboardOverlay')?.remove();
    const overlay=document.createElement('div');overlay.id='ms32LeaderboardOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const board=document.createElement('div');board.className='board';
    const head=document.createElement('div');head.className='board-head';
    const title=document.createElement('h2');title.textContent='🏆 Journey Points';
    const close=document.createElement('button');close.className='close';close.textContent='✕ Close';close.onclick=()=>overlay.remove();head.append(title,close);
    const sub=document.createElement('p');sub.className='board-sub';sub.textContent='All-time Journey Points rankings';
    const tabs=document.createElement('div');tabs.className='tabs';
    const modes=[['overall','Overall'],['community','Community Flights'],['spontaneous','Spontaneous']];
    for(const [id,label] of modes){const b=document.createElement('button');b.className='tab'+(id==='overall'?' active':'');b.dataset.mode=id;b.textContent=label;tabs.appendChild(b)}
    const body=document.createElement('div');body.textContent='Loading pilot rankings…';
    board.append(head,sub,tabs,body);overlay.appendChild(board);document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
    try{
      const response=await fetch('/api/journey-points-sources',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json(); if(!response.ok)throw Error(data.error||'Leaderboard unavailable');
      let mode='overall';
      const render=()=>{
        tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
        sub.textContent=mode==='overall'?'All Journey Points · Community + Spontaneous':mode==='community'?'Scheduled MS32 community flights':'Flying Now · spontaneous flights';
        body.replaceChildren();
        const rows=Array.isArray(data.boards?.[mode])?data.boards[mode]:[];
        if(!rows.length){body.textContent='No qualifying Journey Points in this category yet.';return}
        for(const pilot of rows)body.appendChild(entry(pilot,data.me?.userId===pilot.userId,mode));
        const rankKey=mode+'Rank',pointsKey=mode==='overall'?'overallPoints':mode+'Points';
        if(data.me&&!rows.some(p=>p.userId===data.me.userId)&&data.me[rankKey]){
          const own=document.createElement('p');own.className='board-sub';own.textContent='Your ranking';body.appendChild(own);
          body.appendChild(entry({userId:data.me.userId,username:data.me.username,rank:data.me[rankKey],points:data.me[pointsKey],communityPoints:data.me.communityPoints,spontaneousPoints:data.me.spontaneousPoints},true,mode));
        }
      };
      tabs.addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;mode=b.dataset.mode;render()});
      render();
    }catch(err){body.textContent=err.message||'Unable to load rankings.'}
  }
  install();
  const timer=setInterval(()=>{install();if(document.getElementById('ms32LeaderboardBtn'))clearInterval(timer)},500);
})();