(()=>{
  const host=document.getElementById('major-sponsors');
  if(!host)return;

  const style=document.createElement('style');
  style.textContent=`
    #major-sponsors{overflow:hidden}
    #major-sponsors .sponsor-intro{margin:0 0 12px;color:var(--muted);font-size:10px;line-height:1.45}
    .event-sponsor-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .event-sponsor-tile{min-height:112px;border:1px solid #29445a;border-radius:17px;background:radial-gradient(circle at top right,#142536,#081521 64%,#07111a);display:flex;align-items:center;justify-content:center;padding:18px;position:relative;overflow:hidden;box-shadow:inset 0 0 22px #ffffff05}
    .event-sponsor-tile:after{content:'';position:absolute;inset:0;background:linear-gradient(145deg,#ffffff06,transparent 38%);pointer-events:none}
    .event-sponsor-tile img{display:block;width:100%;max-width:230px;max-height:74px;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 5px 14px #0007)}
    .event-sponsor-tile.orbx{border-color:#6c5521;background:radial-gradient(circle at top right,#2e2617,#111a21 58%,#07111a)}
    .event-sponsor-tile.placeholder{border-style:dashed;color:#687f91;text-align:center;font-size:9px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;line-height:1.5}
    .event-sponsor-label{position:absolute;left:10px;bottom:8px;color:#8ea7bb;font-size:7px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;z-index:2}
    @media(max-width:360px){.event-sponsor-grid{grid-template-columns:1fr}.event-sponsor-tile{min-height:104px}}
  `;
  document.head.appendChild(style);

  host.innerHTML=`
    <div class="eyebrow">Sponsors</div>
    <h3>Massive Fly In Broome Sponsors</h3>
    <p class="sponsor-intro">Proudly supported by our event partners. Sponsor logos will appear here together as they are confirmed.</p>
    <div class="event-sponsor-grid" aria-label="Event sponsors">
      <div class="event-sponsor-tile orbx">
        <img src="/images/orbx.svg?v=20261014-1" alt="ORBX">
        <div class="event-sponsor-label">Event Sponsor</div>
      </div>
      <div class="event-sponsor-tile placeholder">More event partners<br>to be announced</div>
    </div>`;
})();
