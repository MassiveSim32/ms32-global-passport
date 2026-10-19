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
  pCount.innerHTML='<strong>–</strong> stamps';
  passport.appendChild(pCount);

  const fCount=document.createElement('span');
  fCount.className='ms32-tile-count';
  flights.appendChild(fCount);
  flights.dataset.ms32Flights='1';

  const upcomingNode=document.getElementById('upcomingCount');
  const profileUpcomingNode=document.getElementById('profileFlights');
  let flightActivity=window.ms32FlightActivitySummary||null;
  let authoritativeStampCount=null;
  let authoritativeUpcomingCount=null;

  function countFrom(node){
    const match=String(node?.textContent||'').match(/\d+/);
    return match?Number(match[0]):0;
  }

  function paintPassport(){
    if(authoritativeStampCount===null)return;
    const stamps=authoritativeStampCount;
    pCount.innerHTML='<strong>'+stamps+'</strong> '+(stamps===1?'stamp':'stamps');
  }

  function paintFlights(){
    const upcoming=authoritativeUpcomingCount===null?countFrom(upcomingNode):authoritativeUpcomingCount;
    const community=flightActivity?.communityCount;
    const spontaneous=flightActivity?.spontaneousCount;
    const active=Number.isFinite(community)&&Number.isFinite(spontaneous)?community+spontaneous:null;
    fCount.innerHTML='<strong>'+(active===null?'–':active)+'</strong> active · <strong>'+upcoming+'</strong> upcoming';
  }

  async function refreshPassportCount(){
    try{
      const response=await fetch('/api/passport/history',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      const ids=new Set();
      for(const item of Array.isArray(data?.history)?data.history:[]){
        const id=String(item?.event?.id||'');
        const status=item?.status;
        if(id&&status?.claimed&&status?.verified)ids.add(id);
      }
      authoritativeStampCount=ids.size;
      paintPassport();
    }catch{}
  }

  async function refreshUpcomingCount(){
    try{
      const response=await fetch('/api/events',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      const events=await response.json();
      if(!Array.isArray(events))return;
      authoritativeUpcomingCount=events.length;
      if(upcomingNode)upcomingNode.textContent=String(authoritativeUpcomingCount);
      if(profileUpcomingNode)profileUpcomingNode.textContent=String(authoritativeUpcomingCount);
      paintFlights();
    }catch{}
  }

  const observer=new MutationObserver(()=>{
    if(authoritativeUpcomingCount!==null&&upcomingNode&&countFrom(upcomingNode)!==authoritativeUpcomingCount){
      upcomingNode.textContent=String(authoritativeUpcomingCount);
    }
    paintFlights();
  });
  if(upcomingNode)observer.observe(upcomingNode,{childList:true,characterData:true,subtree:true});
  window.addEventListener('ms32:flight-activity',event=>{
    flightActivity=event.detail||null;
    paintFlights();
  });

  paintFlights();
  refreshPassportCount();
  refreshUpcomingCount();
  setInterval(refreshPassportCount,15000);
  setInterval(refreshUpcomingCount,15000);
})();