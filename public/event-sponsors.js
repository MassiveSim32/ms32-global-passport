(()=>{
  const host=document.getElementById('major-sponsors');
  if(!host)return;

  const style=document.createElement('style');
  style.textContent=`
    #major-sponsors{overflow:hidden}
    #major-sponsors .sponsor-intro{margin:0 0 12px;color:var(--muted);font-size:10px;line-height:1.45}
    .event-sponsor-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .event-sponsor-tile{min-height:126px;border:1px solid #29445a;border-radius:17px;background:radial-gradient(circle at top right,#142536,#081521 64%,#07111a);display:flex;align-items:center;justify-content:center;padding:18px;position:relative;overflow:hidden;box-shadow:inset 0 0 22px #ffffff05}
    .event-sponsor-tile:after{content:'';position:absolute;inset:0;background:linear-gradient(145deg,#ffffff06,transparent 38%);pointer-events:none}
    .event-sponsor-tile img{display:block;width:100%;max-width:230px;max-height:82px;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 5px 14px #0007)}
    .event-sponsor-tile.orbx{border-color:#6c5521;background:radial-gradient(circle at top right,#2e2617,#111a21 58%,#07111a)}
    .event-sponsor-tile.fss{border-color:#5a2630;background:radial-gradient(circle at top right,#36151c,#111a21 58%,#07111a)}
    .event-sponsor-tile.a2a,.event-sponsor-tile.hangar{background:#f4f4f4;border-color:#8796a3}
    .event-sponsor-tile.a2a img,.event-sponsor-tile.hangar img{filter:none;max-height:88px}
    .event-sponsor-label{position:absolute;left:10px;bottom:8px;color:#8ea7bb;font-size:7px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;z-index:2}
    .event-sponsor-tile.a2a .event-sponsor-label,.event-sponsor-tile.hangar .event-sponsor-label{color:#66727b}
    @media(max-width:360px){.event-sponsor-grid{grid-template-columns:1fr}.event-sponsor-tile{min-height:116px}}
  `;
  document.head.appendChild(style);

  host.innerHTML=`
    <div class="eyebrow">Sponsors</div>
    <h3>Massive Fly In Broome Sponsors</h3>
    <p class="sponsor-intro">Proudly supported by our event partners.</p>
    <div class="event-sponsor-grid" aria-label="Event sponsors">
      <div class="event-sponsor-tile orbx"><img src="/images/orbx.svg?v=20261014-1" alt="ORBX"><div class="event-sponsor-label">Event Sponsor</div></div>
      <div class="event-sponsor-tile fss"><img src="/images/sponsors/fss.svg?v=20261014-1" alt="FSS"><div class="event-sponsor-label">Event Sponsor</div></div>
      <div class="event-sponsor-tile a2a"><img src="/images/sponsors/a2a.svg?v=20261014-1" alt="A2A Simulations"><div class="event-sponsor-label">Event Sponsor</div></div>
      <div class="event-sponsor-tile hangar"><img src="/images/sponsors/hangar713.svg?v=20261014-1" alt="Hangar 713 Studios"><div class="event-sponsor-label">Event Sponsor</div></div>
    </div>`;
})();
