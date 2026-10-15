(()=>{
  const home=document.getElementById('home');
  const quick=home?.querySelector('.quick');
  const stats=home?.querySelector('.stats');
  const passport=quick?.querySelector('button[onclick*="passport"]');
  const flights=quick?.querySelector('button[onclick*="flights"]');
  if(!home||!quick||!stats||!passport||!flights||document.getElementById('ms32QuickCountsStyle'))return;

  const style=document.createElement('style');
  style.id='ms32QuickCountsStyle';
  style.textContent=`
    #home > .stats{display:none!important}
    #home .quick button .ms32-tile-count{display:block;margin-top:9px;font-size:11px;font-weight:800;line-height:1.55;letter-spacing:.01em;color:#ffd18a}
    #home .quick button[data-ms32-flights] .ms32-tile-count{color:#8bd6ff}
    #home .quick button .ms32-tile-count strong{font-weight:900;color:#fff}
  `;
  document.head.appendChild(style);
  const pCount=document.createElement('span');
  pCount.className='ms32-tile-count';
  passport.appendChild(pCount);
  const fCount=document.createElement('span');
  fCount.className='ms32-tile-count';
  flights.appendChild(fCount);
  flights.dataset.ms32Flights='1';

  const stampNode=document.getElementById('stampCount');
  const upcomingNode=document.getElementById('upcomingCount');
  const liveNode=document.getElementById('ms32LiveCount');
  function countFrom(node){
    const match=String(node?.textContent||'').match(/\d+/);
    return match?Number(match[0]):0;
  }
  function update(){
    const stamps=countFrom(stampNode);
    const upcoming=countFrom(upcomingNode);
    const liveText=String(liveNode?.textContent||'');
    const active=/\d+\s+LIVE/i.test(liveText)?countFrom(liveNode):null;
    pCount.innerHTML='<strong>'+stamps+'</strong> '+(stamps===1?'stamp':'stamps');
    fCount.innerHTML='<strong>'+(active===null?'–':active)+'</strong> active · <strong>'+upcoming+'</strong> upcoming';
  }
  const observer=new MutationObserver(update);
  for(const node of [stampNode,upcomingNode,liveNode])if(node)observer.observe(node,{childList:true,characterData:true,subtree:true});
  update();
})();