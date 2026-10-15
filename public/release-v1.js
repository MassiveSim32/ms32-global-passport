(()=>{
  const VERSION='v1.0.1';

  function applyReleaseBranding(){
    const subtitle=document.querySelector('.top .brand small');
    const desired=`COMPANION APP · ${VERSION.toUpperCase()}`;
    if(subtitle&&subtitle.textContent!==desired) subtitle.textContent=desired;

    document.querySelectorAll('.prototype-pill').forEach((pill)=>{
      if(pill.textContent!=='V1') pill.textContent='V1';
    });

    document.querySelectorAll('.beta-pill').forEach((pill)=>{
      if(pill.textContent!=='V1') pill.textContent='V1';
    });
  }

  applyReleaseBranding();

  const observer=new MutationObserver(()=>applyReleaseBranding());
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
