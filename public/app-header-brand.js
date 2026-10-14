(()=>{
  const brand=document.querySelector('.top .brand');
  if(!brand)return;
  const title=brand.querySelector('b');
  const sub=brand.querySelector('small');
  if(!title||!sub)return;

  title.innerHTML='<span class="ms32-brand-main">MASSIVE SIMULATIONS</span> <span class="ms32-brand-32">32</span>';
  sub.textContent='COMPANION APP';
  brand.classList.add('ms32-brand-lockup');

  const style=document.createElement('style');
  style.textContent=`
    .top .ms32-brand-lockup{gap:10px;align-items:center}
    .top .ms32-brand-lockup>div:last-child{display:flex;flex-direction:column;justify-content:center;min-width:0}
    .top .ms32-brand-lockup b{display:block;margin:0;font-size:12px;line-height:1.05;font-weight:800;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;background:linear-gradient(180deg,#fff2bd 0%,#ffd27a 28%,#f5b041 62%,#c8871e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 14px #ffb13c18;filter:drop-shadow(0 1px 0 #4a2c06)}
    .top .ms32-brand-lockup .ms32-brand-main{font-weight:750}
    .top .ms32-brand-lockup .ms32-brand-32{font-size:15px;font-weight:1000;letter-spacing:.04em;background:linear-gradient(180deg,#fff4c7,#ffc760 45%,#ff9f2f 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 12px #ff9f2f33}
    .top .ms32-brand-lockup small{display:block;margin-top:4px;color:#e7c47b;font-size:8px;font-weight:900;line-height:1;letter-spacing:.28em;text-transform:uppercase;white-space:nowrap;text-shadow:0 0 10px #ffb13c12}
    @media(max-width:380px){
      .top .ms32-brand-lockup b{font-size:10px;letter-spacing:.09em}
      .top .ms32-brand-lockup .ms32-brand-32{font-size:13px}
      .top .ms32-brand-lockup small{font-size:7px;letter-spacing:.22em}
    }
  `;
  document.head.appendChild(style);
})();
