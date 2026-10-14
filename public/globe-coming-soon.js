(()=>{
  const page=document.getElementById('globe');
  if(!page)return;
  const title=page.querySelector('h1');
  const sub=page.querySelector('.sub');
  if(title)title.textContent='Globe · Coming Soon';
  if(sub)sub.textContent='Your interactive world journey is coming soon. Completed Passport flights will build your global route here.';
  const card=page.querySelector('.card');
  if(card){
    card.innerHTML='<div class="check"><span>Feature status</span><strong style="color:var(--orange)">COMING SOON</strong></div><div class="check"><span>Future source</span><strong>GLOBAL PASSPORT</strong></div>';
  }
})();
