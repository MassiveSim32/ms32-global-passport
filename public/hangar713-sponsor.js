(()=>{
  const grid=document.querySelector('#major-sponsors .event-sponsor-grid');
  if(!grid || grid.querySelector('[data-sponsor="hangar713"]')) return;

  const style=document.createElement('style');
  style.textContent=`
    .event-sponsor-tile.hangar713{background:#080808;border-color:#5f4a2a}
    .event-sponsor-tile.hangar713 img{filter:none;max-width:240px;max-height:90px;object-fit:contain}
  `;
  document.head.appendChild(style);

  const tile=document.createElement('div');
  tile.className='event-sponsor-tile hangar713';
  tile.dataset.sponsor='hangar713';
  tile.innerHTML=`
    <img src="/images/sponsors/hangar713.png?v=20261014-1" alt="Hangar Studios 713">
    <div class="event-sponsor-label">Event Sponsor</div>`;

  const placeholder=grid.querySelector('.event-sponsor-tile.placeholder');
  grid.insertBefore(tile,placeholder||null);
})();
