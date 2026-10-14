(()=>{
  // Keep sponsor cards consistent with the dark app shell without altering source artwork.
  if(document.getElementById('ms32TransparentSponsorStyle'))return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('width','0');
  svg.setAttribute('height','0');
  svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML='<filter id="ms32WhiteToAlpha" color-interpolation-filters="sRGB" x="-5%" y="-5%" width="110%" height="110%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"/></filter>';
  document.body.appendChild(svg);
  const style=document.createElement('style');
  style.id='ms32TransparentSponsorStyle';
  style.textContent=`
    #major-sponsors .event-sponsor-tile{background:transparent!important;box-shadow:none!important;border-color:#34516a!important}
    #major-sponsors .event-sponsor-tile:after{display:none!important}
    #major-sponsors .event-sponsor-tile.taogs img,
    #major-sponsors .event-sponsor-tile.fss img{filter:url(#ms32WhiteToAlpha)!important;background:transparent!important}
    #major-sponsors .event-sponsor-tile.taogs .event-sponsor-label,
    #major-sponsors .event-sponsor-tile.fss .event-sponsor-label{color:#8ea7bb!important}
  `;
  document.head.appendChild(style);
})();