(()=>{
  const style=document.createElement('style');
  style.textContent=`
    #nextFlight{position:relative;overflow:hidden;isolation:isolate;transition:background .35s ease,border-color .35s ease,box-shadow .35s ease}
    #nextFlight>*{position:relative;z-index:2}
    #nextFlight::before{content:'';position:absolute;inset:0;z-index:0;background-size:cover;background-position:center 58%;opacity:0;transform:scale(1.015);transition:opacity .45s ease,transform .6s ease;pointer-events:none}
    #nextFlight::after{content:'';position:absolute;inset:0;z-index:1;opacity:0;transition:opacity .4s ease;pointer-events:none;background:linear-gradient(90deg,rgba(5,13,21,.9) 0%,rgba(5,13,21,.72) 44%,rgba(5,13,21,.5) 100%),linear-gradient(180deg,rgba(7,17,27,.16),rgba(7,17,27,.76))}
    #nextFlight.home-wing-scheduled::before{background-image:url('/images/wingview-scheduled.svg?v=20261014-1');opacity:.68;transform:scale(1)}
    #nextFlight.home-wing-flying-now::before{background-image:url('/images/wingview-flying-now.svg?v=20261014-1');opacity:.78;transform:scale(1)}
    #nextFlight.home-wing-scheduled::after,#nextFlight.home-wing-flying-now::after{opacity:1}
    #nextFlight.home-wing-scheduled,#nextFlight.home-wing-flying-now{background:#091725!important;border-color:#7d6337!important;box-shadow:0 0 0 1px #ffb24f22,0 14px 34px #0007!important;min-height:170px}
    #nextFlight.home-wing-flying-now{border-color:#b16e2f!important;box-shadow:0 0 0 1px #ff9f2f33,0 14px 34px #0008!important}
    #nextFlight.home-wing-scheduled .eyebrow,#nextFlight.home-wing-flying-now .eyebrow{color:#ffd08a!important;text-shadow:0 1px 10px #000}
    #nextFlight.home-wing-scheduled h2,#nextFlight.home-wing-flying-now h2,#nextFlight.home-wing-scheduled .route,#nextFlight.home-wing-flying-now .route,#nextFlight.home-wing-scheduled .sub,#nextFlight.home-wing-flying-now .sub{color:#fff!important;text-shadow:0 2px 12px #000,0 1px 2px #000}
    #nextFlight.home-wing-scheduled .pilot-home-live,#nextFlight.home-wing-flying-now .pilot-home-live{background:#08131ecc!important;border-color:#d89a49!important;color:#ffd18e!important;backdrop-filter:blur(6px)}
    #nextFlight.home-wing-scheduled .btn,#nextFlight.home-wing-flying-now .btn{backdrop-filter:blur(7px)}
    @media(max-width:520px){#nextFlight.home-wing-scheduled,#nextFlight.home-wing-flying-now{min-height:158px}#nextFlight::before{background-position:center 55%}}
  `;
  document.head.appendChild(style);

  const host=document.getElementById('nextFlight');
  if(!host)return;

  function classify(){
    const active=host.classList.contains('pilot-flight-active');
    const title=String(host.querySelector('h2')?.textContent||'').trim().toLowerCase();
    const live=String(host.querySelector('.pilot-home-live')?.textContent||'').toLowerCase();
    const flyingNow=active&&(title==='flying now'||live.includes('champagne voice'));
    const scheduled=active&&!flyingNow;
    host.classList.toggle('home-wing-flying-now',flyingNow);
    host.classList.toggle('home-wing-scheduled',scheduled);
  }

  const observer=new MutationObserver(classify);
  observer.observe(host,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  classify();
  setInterval(classify,3000);
})();
