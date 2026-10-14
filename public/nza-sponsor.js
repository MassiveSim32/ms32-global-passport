(()=>{
  const grid=document.querySelector('#major-sponsors .event-sponsor-grid');
  if(!grid||document.getElementById('nzaSponsorTile'))return;

  const tile=document.createElement('div');
  tile.id='nzaSponsorTile';
  tile.className='event-sponsor-tile nza';
  tile.innerHTML=`
    <img src="https://www.fsdeveloper.com/forum/attachments/nza-simulations-facebook_video_small-png.67892/" alt="NZA Simulations" referrerpolicy="no-referrer">
    <div class="event-sponsor-label">Event Sponsor</div>`;

  const placeholder=grid.querySelector('.placeholder');
  if(placeholder)grid.insertBefore(tile,placeholder);else grid.appendChild(tile);
})();
