(()=>{
  const src='https://cdn.orbxdirect.com/companies/a2a-simulations-0bf694998e-overlay.png';
  const fix=()=>{
    const img=[...document.querySelectorAll('#major-sponsors img')].find(el=>el.alt==='A2A Simulations');
    if(!img)return;
    if(img.getAttribute('src')!==src) img.setAttribute('src',src);
    img.style.filter='invert(1) hue-rotate(180deg) drop-shadow(0 5px 14px #0007)';
    img.style.maxHeight='92px';
    img.style.objectFit='contain';
  };
  fix();
  const observer=new MutationObserver(fix);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(fix,250);
  setTimeout(fix,1000);
})();
