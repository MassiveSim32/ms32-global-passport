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
  const prizePacks={"orbx":["2 Copies of Jurassic World Archipelago","2 Copies of YPPH Perth International Airport for MSFS2024"],"a2a":["1 Copy of the Comanche","1 Copy of the Aerostar"],"nza":["2 Copies of Mt Cook Region Scenery for MSFS2024"],"hangar713":["Six (6) Hangar Studios 713 Digital Gift Cards valued at $25 USD each"],"flightfx":["2 Copies of the Citation X","2 Copies of the Piaggio","2 Copies of the H-Jet","2 Copies of the Hawker 800XP"],"taogs":["1 Copy of the AS365 Dauphin"],"fss":["2 Copies of each product in their current MSFS2024 product line"],"asobo":["2 Copies of any MSFS2024 Marketplace item"]};
  const sponsorNames={"orbx":"ORBX","a2a":"A2A Simulations","nza":"NZA Simulations","hangar713":"Hangar Studios 713","flightfx":"Flight FX","taogs":"TAOGS Hangar","fss":"FSS","asobo":"ASOBO"};
  const prizeStyle=document.createElement('style');
  prizeStyle.textContent=`
    #major-sponsors .event-sponsor-tile[data-prize-sponsor]{cursor:pointer}
    #major-sponsors .event-sponsor-tile[data-prize-sponsor]:focus-visible{outline:2px solid #e8c47a;outline-offset:3px}
    #major-sponsors .event-sponsor-tile[data-prize-sponsor][aria-expanded="true"]{border-color:#d6ae57!important;box-shadow:0 0 0 2px #d6ae5733!important}
    #major-sponsors .sponsor-prize-panel{grid-column:1/-1;border:1px solid #ad8745;border-radius:14px;background:linear-gradient(140deg,#3b3020,#17241f);padding:14px;color:#fff}
    #major-sponsors .sponsor-prize-panel[hidden]{display:none!important}
    #major-sponsors .sponsor-prize-panel h4{margin:0 0 9px;color:#ffe0a0;font-size:13px}
    #major-sponsors .sponsor-prize-panel ul{margin:0;padding-left:20px;font-size:12px;line-height:1.7}
  `;
  document.head.appendChild(prizeStyle);
  const sponsorGrid=document.querySelector('#major-sponsors .event-sponsor-grid');
  if(sponsorGrid){
    const sponsorTiles=[...sponsorGrid.querySelectorAll('.event-sponsor-tile:not(.placeholder)')];
    sponsorTiles.forEach(tile=>{
      const key=Object.keys(prizePacks).find(name=>tile.classList.contains(name)||tile.id.toLowerCase().includes(name));
      if(!key)return;
      tile.dataset.prizeSponsor=key;
      tile.setAttribute('role','button');
      tile.setAttribute('tabindex','0');
      tile.setAttribute('aria-label',sponsorNames[key]+' — view prize pack');
      const panel=document.createElement('div');
      panel.className='sponsor-prize-panel';
      panel.id='major-prizes-'+key;
      panel.hidden=true;
      const heading=document.createElement('h4');
      heading.textContent=sponsorNames[key]+' Prize Pack';
      panel.appendChild(heading);
      const list=document.createElement('ul');
      prizePacks[key].forEach(prize=>{
        const item=document.createElement('li');
        item.textContent=prize;
        list.appendChild(item);
      });
      panel.appendChild(list);
      tile.setAttribute('aria-controls',panel.id);
      tile.setAttribute('aria-expanded','false');
      tile.insertAdjacentElement('afterend',panel);
      const toggle=()=>{
        panel.hidden=!panel.hidden;
        tile.setAttribute('aria-expanded',String(!panel.hidden));
      };
      tile.addEventListener('click',toggle);
      tile.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}
      });
    });
  }

  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML='<filter id="ms32BalancedWhiteAlpha" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"/></filter>';
  document.body.appendChild(svg);
})();