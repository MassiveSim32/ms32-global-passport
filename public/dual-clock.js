(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .utc-clock.dual-time{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:0;overflow:hidden}
    .dual-time-block{padding:8px 11px;min-width:0}
    .dual-time-block+ .dual-time-block{border-left:1px solid #2c5674}
    .dual-time-label{display:block;font-size:8px;font-weight:900;letter-spacing:.14em;margin-bottom:2px}
    .dual-time-local .dual-time-label{color:var(--orange)}
    .dual-time-utc .dual-time-label{color:var(--blue)}
    .dual-time-value{display:block;font-size:19px;font-weight:900;letter-spacing:.05em;color:#fff;white-space:nowrap}
    .dual-time-date{display:block;margin-top:2px;color:var(--muted);font-size:7px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:360px){.dual-time-value{font-size:17px}.dual-time-block{padding:8px 8px}}
  `;
  document.head.appendChild(style);

  function pad(v){return String(v).padStart(2,'0')}
  function localTime(n){return `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`}
  function localDate(n){return n.toLocaleDateString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}

  function ensureDualClock(){
    const clock=document.querySelector('.utc-clock');
    if(!clock||clock.classList.contains('dual-time')) return;
    clock.classList.add('dual-time');
    clock.innerHTML=`
      <div class="dual-time-block dual-time-local">
        <span class="dual-time-label">YOUR LOCAL TIME</span>
        <strong class="dual-time-value" id="localClock">--:--:--</strong>
        <small class="dual-time-date" id="localDate">Local Time</small>
      </div>
      <div class="dual-time-block dual-time-utc">
        <span class="dual-time-label">UTC</span>
        <strong class="dual-time-value" id="utcClock">--:--:--</strong>
        <small class="dual-time-date" id="utcDate">Universal Time</small>
      </div>`;
  }

  function updateDualClock(){
    ensureDualClock();
    const n=new Date();
    const localClock=document.getElementById('localClock');
    const localDateEl=document.getElementById('localDate');
    const utcClock=document.getElementById('utcClock');
    const utcDate=document.getElementById('utcDate');
    if(localClock) localClock.textContent=localTime(n);
    if(localDateEl) localDateEl.textContent=localDate(n);
    if(utcClock) utcClock.textContent=`${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())}`;
    if(utcDate) utcDate.textContent=n.toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  }

  updateDualClock();
  setInterval(updateDualClock,1000);
})();
