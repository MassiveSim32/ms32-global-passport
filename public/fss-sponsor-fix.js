(()=>{
  const src='/images/sponsors/fss.png?v=20261014-1';
  const fix=()=>{
    const host=document.getElementById('major-sponsors');
    if(!host)return;
    let img=[...host.querySelectorAll('img')].find(el=>el.alt==='Flight Sim Studios');
    if(!img){
      const grid=host.querySelector('.event-sponsor-grid');
      if(!grid)return;
      const tile=document.createElement('div');
      tile.className='event-sponsor-tile';
      tile.innerHTML=`<img src="${src}" alt="Flight Sim Studios"><div class="event-sponsor-label">Event Sponsor</div>`;
      const placeholder=grid.querySelector('.placeholder');
      if(placeholder) grid.insertBefore(tile,placeholder); else grid.appendChild(tile);
      return;
    }
    if(img.getAttribute('src')!==src) img.setAttribute('src',src);
  };
  fix();
  const observer=new MutationObserver(fix);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(fix,250);
  setTimeout(fix,1000);
})();
