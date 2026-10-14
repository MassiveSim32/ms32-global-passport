(()=>{
  const brand=document.querySelector('.top .brand');
  if(!brand)return;
  const title=brand.querySelector('b');
  const sub=brand.querySelector('small');
  if(!title||!sub)return;

  title.innerHTML='<span class="ms32-brand-main">MASSIVE SIMULATIONS</span><span class="ms32-brand-32">32</span>';
  sub.textContent='COMPANION APP';
  brand.classList.add('ms32-brand-lockup');

  const style=document.createElement('style');
  style.textContent=`
    .top .ms32-brand-lockup{gap:10px;align-items:center}
    .top .ms32-brand-lockup>div:last-child{display:flex;flex-direction:column;justify-content:center;min-width:0}
    .top .ms32-brand-lockup b{display:flex;align-items:flex-end;gap:7px;margin:0;line-height:1;text-transform:uppercase;white-space:nowrap}
    .top .ms32-brand-lockup .ms32-brand-main{position:relative;padding-bottom:3px;color:#f4f6f8;font-size:11px;font-weight:500;letter-spacing:.24em;text-shadow:0 1px 10px #0009}
    .top .ms32-brand-lockup .ms32-brand-main:after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,#f4f6f8cc,#f4f6f822)}
    .top .ms32-brand-lockup .ms32-brand-32{font-size:24px;font-weight:300;line-height:.8;letter-spacing:-.04em;color:#ffad3d;text-shadow:0 0 14px #ff9f2f33,0 1px 1px #000}
    .top .ms32-brand-lockup small{display:block;margin-top:6px;color:#d9e1e8;font-size:7px;font-weight:500;line-height:1;letter-spacing:.34em;text-transform:uppercase;white-space:nowrap;text-shadow:0 1px 8px #000a}
    @media(max-width:380px){
      .top .ms32-brand-lockup b{gap:5px}
      .top .ms32-brand-lockup .ms32-brand-main{font-size:9px;letter-spacing:.18em}
      .top .ms32-brand-lockup .ms32-brand-32{font-size:21px}
      .top .ms32-brand-lockup small{font-size:6px;letter-spacing:.28em}
    }
  `;
  document.head.appendChild(style);
})();
