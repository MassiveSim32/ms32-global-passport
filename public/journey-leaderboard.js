(()=>{
  const css=document.createElement('style');
  css.textContent=`
    #ms32LeaderboardBtn{display:block;width:100%;margin:5px 0 11px;padding:11px 14px;border:1px solid #b67b2e;border-radius:13px;background:linear-gradient(100deg,#2c2418,#122638);color:#ffcb7b;font-size:12px;font-weight:900;letter-spacing:.04em;cursor:pointer}
    #ms32LeaderboardOverlay{position:fixed;inset:0;z-index:9999;background:#030a12eF;display:flex;align-items:center;justify-content:center;padding:16px}
    #ms32LeaderboardOverlay .board{width:min(100%,480px);max-height:85vh;overflow:auto;background:#091b2b;border:1px solid #a77736;border-radius:20px;padding:18px;color:#f4f8ff;box-shadow:0 24px 80px #000b}
    #ms32LeaderboardOverlay .board-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    #ms32LeaderboardOverlay h2{margin:0;color:#ffc16b;font-size:21px}
    #ms32LeaderboardOverlay .close{background:#1c3448;color:#fff;border:1px solid #466075;border-radius:9px;padding:7px 12px;cursor:pointer}
    #ms32LeaderboardOverlay .board-sub{font-size:11px;color:#9db6c9;margin:7px 0 14px}
    #ms32LeaderboardOverlay .entry{display:grid;grid-template-columns:35px 1fr auto;gap:10px;align-items:center;padding:11px 7px;border-bottom:1px solid #244055;font-size:12px}
    #ms32LeaderboardOverlay .entry strong{color:#ffc16b}
    #ms32LeaderboardOverlay .mine{border:1px solid #d99b41;border-radius:10px;background:#4d361d55}
  `;
  document.head.appendChild(css);
  function install(){
    const card=document.getElementById('rewardsHome');
    if(!card||document.getElementById('ms32LeaderboardBtn'))return;
    const btn=document.createElement('button');
    btn.id='ms32LeaderboardBtn';btn.type='button';btn.textContent='🏆 VIEW LEADERBOARD';
    btn.addEventListener('click',open);
    card.insertAdjacentElement('afterend',btn);
  }
  function tier(points){return points>=5000?'Global Elite':points>=3000?'Captain':points>=1500?'Navigator':points>=500?'Aviator':'Explorer'}
  function entry(p,mine){
    const div=document.createElement('div');div.className='entry'+(mine?' mine':'');
    const rank=document.createElement('strong');rank.textContent='#'+p.rank;
    const name=document.createElement('span');name.textContent=p.username+(mine?' (You)':'')+' · '+tier(p.points);
    const points=document.createElement('strong');points.textContent=Number(p.points).toLocaleString()+' JP';
    div.append(rank,name,points);return div;
  }
  async function open(){
    document.getElementById('ms32LeaderboardOverlay')?.remove();
    const overlay=document.createElement('div');overlay.id='ms32LeaderboardOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const board=document.createElement('div');board.className='board';
    const head=document.createElement('div');head.className='board-head';
    const title=document.createElement('h2');title.textContent='🏆 Journey Points';
    const close=document.createElement('button');close.className='close';close.textContent='✕ Close';close.onclick=()=>overlay.remove();
    head.append(title,close);
    const sub=document.createElement('p');sub.className='board-sub';sub.textContent='Verified community flights · All-time leaderboard';
    const body=document.createElement('div');body.textContent='Loading pilot rankings…';
    board.append(head,sub,body);overlay.appendChild(board);document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
    try{
      const response=await fetch('/api/journey-leaderboard',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Leaderboard unavailable');
      body.replaceChildren();
      if(!data.leaders?.length){body.textContent='No verified Journey Points yet.';return}
      for(const pilot of data.leaders)body.appendChild(entry(pilot,data.me?.userId===pilot.userId));
      if(data.me&&!data.leaders.some(p=>p.userId===data.me.userId)){
        const own=document.createElement('p');own.className='board-sub';own.textContent='Your ranking';body.appendChild(own);body.appendChild(entry(data.me,true));
      }
      if(!data.me){const own=document.createElement('p');own.className='board-sub';own.textContent='You will appear after your first verified qualifying flight.';body.appendChild(own)}
    }catch(err){body.textContent=err.message||'Unable to load rankings.'}
  }
  install();
  const timer=setInterval(()=>{install();if(document.getElementById('ms32LeaderboardBtn'))clearInterval(timer)},500);
})();