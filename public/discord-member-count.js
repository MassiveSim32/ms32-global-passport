(()=>{
  const home=document.getElementById('home');
  const banner=home?.querySelector('.beta-banner');
  if(!banner||document.getElementById('ms32DiscordMemberCount'))return;
  const style=document.createElement('style');
  style.textContent=`
    #home .beta-banner{flex-wrap:wrap;row-gap:7px}
    #ms32DiscordMemberCount{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid #526f8b;border-radius:999px;background:#10283c;color:#d4eaff;font-size:10px;font-weight:800;text-decoration:none;white-space:nowrap}
    #ms32DiscordMemberCount:hover{border-color:#8cb8e3;color:#fff}
    #ms32DiscordMemberCount .ms32-member-number{color:#fff;font-variant-numeric:tabular-nums}
    @media(max-width:480px){#home .beta-banner{gap:6px}#ms32DiscordMemberCount{font-size:9px;padding:5px 7px}}
  `;
  document.head.appendChild(style);
  const link=document.createElement('a');
  link.id='ms32DiscordMemberCount';
  link.href='https://discord.com/channels/838642528315506728';
  link.target='_blank';link.rel='noopener noreferrer';
  link.title='Open the MS32 Discord community';
  link.innerHTML='👥 DISCORD <span class="ms32-member-number">— members</span>';
  const version=banner.querySelector('strong');
  if(version)version.insertAdjacentElement('afterend',link);else banner.appendChild(link);
  async function refresh(){
    try{
      const r=await fetch('/api/discord-member-count',{cache:'no-store'});
      if(!r.ok)throw Error('Count unavailable');
      const data=await r.json();
      if(!Number.isSafeInteger(data.count)||data.count<0)throw Error('Invalid count');
      link.querySelector('.ms32-member-number').textContent=data.count.toLocaleString()+' members';
      link.title='MS32 Discord members · '+(data.stale?'last available count':'updated automatically')+' · Open Discord';
    }catch{
      if(link.querySelector('.ms32-member-number').textContent==='— members')link.title='Discord member count currently unavailable · Open Discord';
    }
  }
  refresh();setInterval(()=>{if(!document.hidden)refresh()},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();