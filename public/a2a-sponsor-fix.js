(()=>{
  const src='/images/sponsors/a2a.png?v=20261014-2';
  const fix=()=>{
    const img=[...document.querySelectorAll('#major-sponsors img')].find(el=>el.alt==='A2A Simulations');
    if(!img)return;
    if(img.getAttribute('src')!==src) img.setAttribute('src',src);
  };
  fix();
  const observer=new MutationObserver(fix);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(fix,250);
  setTimeout(fix,1000);
})();
