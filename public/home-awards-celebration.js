(()=>{
  const home=document.getElementById('home');
  if(!home||document.getElementById('ms32AwardWinners'))return;
  const style=document.createElement('style');
  style.textContent=`
    #ms32AwardWinners{margin:15px 0 18px;padding:20px 16px;border:1px solid #d4b66a;border-radius:20px;background:radial-gradient(circle at top right,#49371f,#192437 54%,#0b1a29);box-shadow:0 10px 26px #0004,inset 0 0 0 1px #d4b66a25;color:#fff;overflow:hidden}
    #ms32AwardWinners .awards-eyebrow{font-size:10px;font-weight:900;letter-spacing:.16em;color:#f8d990;text-transform:uppercase}
    #ms32AwardWinners h2{margin:7px 0 6px;font-size:24px;line-height:1.15;color:#fff4d5}
    #ms32AwardWinners .awards-intro{font-size:12px;line-height:1.5;color:#d8e3ef;margin:0 0 15px}
    #ms32AwardWinners .awards-list{display:grid;gap:10px}
    #ms32AwardWinners .award{border:1px solid #947c4d70;border-radius:13px;padding:12px;background:#081b2ab8}
    #ms32AwardWinners .award-label{font-size:10px;letter-spacing:.09em;font-weight:900;text-transform:uppercase;color:#f4cd79;margin-bottom:5px}
    #ms32AwardWinners .award-names{font-size:16px;line-height:1.4;font-weight:850;color:#fff;overflow-wrap:anywhere}
    #ms32AwardWinners .awards-outro{font-size:12px;color:#f7dc9d;margin:15px 0 0;line-height:1.5;font-weight:700}
    @media(min-width:700px){#ms32AwardWinners{padding:24px}#ms32AwardWinners .awards-list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
  const card=document.createElement('section');
  card.id='ms32AwardWinners';
  card.setAttribute('aria-label','MS32 latest award winners');
  card.innerHTML=`
    <div class="awards-eyebrow">🏆 MS32 Community Honours</div>
    <h2>Celebrating Our Award Winners</h2>
    <p class="awards-intro">Please join us in congratulating the latest members recognised for their contribution to Massive Simulations 32.</p>
    <div class="awards-list">
      <div class="award"><div class="award-label">🏆 Ultimate Clubmen 2027</div><div class="award-names">ABF (Andrew) &amp; Bill</div></div>
      <div class="award"><div class="award-label">⭐ Hall of Fame Inductees</div><div class="award-names">Kevin, Bill &amp; Triton</div></div>
      <div class="award"><div class="award-label">🎖️ Life Membership</div><div class="award-names">Mick</div></div>
      <div class="award"><div class="award-label">🥛 Milo Award</div><div class="award-names">Trevor</div></div>
    </div>
    <p class="awards-outro">Congratulations and thank you for everything you bring to our MS32 community!</p>`;
  const nextFlight=document.getElementById('nextFlight');
  if(nextFlight&&nextFlight.parentElement===home)home.insertBefore(card,nextFlight);
  else home.appendChild(card);
})();