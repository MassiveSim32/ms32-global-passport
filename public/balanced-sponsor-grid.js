(()=>{
  if(document.getElementById('ms32BalancedSponsorGrid'))return;
  const style=document.createElement('style');
  style.id='ms32BalancedSponsorGrid';
  style.textContent=`
    #major-sponsors .event-sponsor-grid{
      display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:12px!important;align-items:stretch!important;margin-top:14px!important;
    }
    #major-sponsors .event-sponsor-tile{
      box-sizing:border-box!important;width:100%!important;min-width:0!important;
      min-height:152px!important;height:152px!important;
      padding:16px 14px 27px!important;border:1px solid #365169!important;
      border-radius:16px!important;background:#101e2b!important;
      box-shadow:inset 0 1px 0 #ffffff0b!important;
      display:flex!important;align-items:center!important;justify-content:center!important;
      overflow:hidden!important;position:relative!important;
    }
    #major-sponsors .event-sponsor-tile:after{display:none!important}
    #major-sponsors .event-sponsor-tile img{
      display:block!important;width:auto!important;height:auto!important;
      max-width:100%!important;max-height:94px!important;object-fit:contain!important;
      margin:auto!important;position:relative!important;z-index:1!important;
      flex:0 1 auto!important;
    }
    #major-sponsors .event-sponsor-tile .event-sponsor-label{
      position:absolute!important;bottom:10px!important;left:0!important;right:0!important;
      text-align:center!important;color:#9db1c3!important;font-size:8px!important;
      letter-spacing:.13em!important;line-height:1.2!important;
    }
    #major-sponsors .event-sponsor-tile.taogs,
    #major-sponsors .event-sponsor-tile.fss{background:#101e2b!important}
    #major-sponsors .event-sponsor-tile.taogs img,
    #major-sponsors .event-sponsor-tile.fss img,
    #major-sponsors .event-sponsor-tile.a2a img{
      filter:url(#ms32BalancedWhiteAlpha)!important;background:transparent!important;
    }
    #major-sponsors .event-sponsor-tile.placeholder{
      color:#8ca4b8!important;border-style:dashed!important;text-align:center!important;
      font-size:10px!important;letter-spacing:.06em!important;line-height:1.5!important;
    }
    @media(min-width:720px){
      #major-sponsors .event-sponsor-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      #major-sponsors .event-sponsor-tile{height:164px!important;min-height:164px!important}
      #major-sponsors .event-sponsor-tile img{max-height:102px!important}
    }
  `;
  document.head.appendChild(style);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML='<filter id="ms32BalancedWhiteAlpha" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"/></filter>';
  document.body.appendChild(svg);
})();