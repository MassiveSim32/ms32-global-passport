(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .passport-carousel{position:relative;margin-top:10px}
    .passport-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain}
    .passport-track::-webkit-scrollbar{display:none}
    .passport-sheet{flex:0 0 100%;scroll-snap-align:start;scroll-snap-stop:always;padding:0 1px}
    .passport-sheet .stamp-grid{grid-template-columns:1fr 1fr;gap:9px;padding:12px 0 8px}
    .passport-pagebar{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:7px;min-height:30px}
    .passport-pagebtn{width:30px;height:30px;border-radius:50%;border:1px solid #887f70;background:#f7efd9;color:#514a3e;font-weight:900;display:grid;place-items:center;cursor:pointer;padding:0}
    .passport-pagebtn:disabled{opacity:.28;cursor:default}
    .passport-pageinfo{font:700 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#5f584d;text-transform:uppercase;min-width:72px;text-align:center}
    .passport-dots{display:flex;justify-content:center;gap:6px;margin:5px 0 0}
    .passport-dot{width:6px;height:6px;border-radius:50%;border:0;background:#9a907f;padding:0;opacity:.35;cursor:pointer}
    .passport-dot.active{opacity:1;background:#4f493f;transform:scale(1.18)}
    .passport-swipehint{text-align:center;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#7c7467;margin-top:4px}
    @media(min-width:700px){.passport-swipehint{display:none}}
  `;
  document.head.appendChild(style);

  const PER_PAGE=6;
  let currentPage=0;
  let lastSignature='';
  let scrollTimer=null;

  function claimedEvents(){
    try{
      const history=Array.isArray(window.passportHistoryEvents)?window.passportHistoryEvents:[];
      const live=Array.isArray(allEvents)?allEvents:[];
      const historyIds=new Set(history.filter(Boolean).map(e=>String(e.id||'')));
      const merged=[...history,...live];
      const seen=new Set();
      return merged.filter(e=>{
        const id=String(e?.id||'');
        if(!id||seen.has(id))return false;
        // Flying Now stamps must exist in persistent Passport history. This keeps
        // deleted/superseded ad-hoc records from being resurrected by stale
        // allEvents/statuses data in an already-open browser session.
        const claimed=id.startsWith('flying-now:')
          ? historyIds.has(id)
          : (historyIds.has(id)||!!statuses?.[id]?.claimed);
        if(!claimed)return false;
        seen.add(id);
        return true;
      }).sort((a,b)=>new Date(a.start||0)-new Date(b.start||0));
    }catch{return[]}
  }

  function chunks(items,size){
    const out=[];
    for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));
    return out;
  }

  function controls(total){
    if(total<=1)return '';
    return `<div class="passport-pagebar"><button class="passport-pagebtn" id="passportPrev" aria-label="Previous passport page" onclick="passportPageStep(-1)">‹</button><div class="passport-pageinfo" id="passportPageInfo">Page 1 of ${total}</div><button class="passport-pagebtn" id="passportNext" aria-label="Next passport page" onclick="passportPageStep(1)">›</button></div><div class="passport-dots">${Array.from({length:total},(_,i)=>`<button class="passport-dot${i===0?' active':''}" aria-label="Go to passport page ${i+1}" onclick="passportGoToPage(${i})"></button>`).join('')}</div><div class="passport-swipehint">Swipe to turn pages</div>`;
  }

  function updateControls(total){
    currentPage=Math.max(0,Math.min(currentPage,total-1));
    const info=document.getElementById('passportPageInfo');
    if(info)info.textContent=`Page ${currentPage+1} of ${total}`;
    const prev=document.getElementById('passportPrev');
    const next=document.getElementById('passportNext');
    if(prev)prev.disabled=currentPage===0;
    if(next)next.disabled=currentPage===total-1;
    document.querySelectorAll('.passport-dot').forEach((d,i)=>d.classList.toggle('active',i===currentPage));
  }

  function attachScroll(total){
    const track=document.getElementById('passportTrack');
    if(!track)return;
    track.addEventListener('scroll',()=>{
      clearTimeout(scrollTimer);
      scrollTimer=setTimeout(()=>{
        const w=track.clientWidth||1;
        currentPage=Math.max(0,Math.min(total-1,Math.round(track.scrollLeft/w)));
        updateControls(total);
      },70);
    },{passive:true});
  }

  window.passportGoToPage=function(index){
    const track=document.getElementById('passportTrack');
    const total=document.querySelectorAll('.passport-sheet').length;
    if(!track||!total)return;
    currentPage=Math.max(0,Math.min(total-1,Number(index)||0));
    track.scrollTo({left:currentPage*track.clientWidth,behavior:'smooth'});
    updateControls(total);
  };

  window.passportPageStep=function(delta){passportGoToPage(currentPage+Number(delta||0))};

  window.renderStampBook=function(){
    const host=document.getElementById('stampBook');
    if(!host)return;
    const claimed=claimedEvents();
    const signature=claimed.map(e=>e.id).join('|');
    if(signature===lastSignature&&host.querySelector('.passport-carousel'))return;
    lastSignature=signature;

    if(!claimed.length){
      currentPage=0;
      host.innerHTML='<div class="empty">No stamps yet.<br><br>Join a community flight, meet the attendance requirement and stamp your Passport.</div>';
      return;
    }

    const pages=chunks(claimed,PER_PAGE);
    currentPage=Math.max(0,Math.min(currentPage,pages.length-1));
    host.innerHTML=`<div class="passport-carousel"><div class="passport-track" id="passportTrack">${pages.map((page,i)=>`<section class="passport-sheet" aria-label="Passport page ${i+1} of ${pages.length}"><div class="stamp-grid">${page.map(stampMarkup).join('')}</div></section>`).join('')}</div>${controls(pages.length)}</div>`;
    attachScroll(pages.length);
    updateControls(pages.length);
    requestAnimationFrame(()=>{
      const track=document.getElementById('passportTrack');
      if(track)track.scrollLeft=currentPage*track.clientWidth;
    });
  };

  try{renderStampBook()}catch{}
})();