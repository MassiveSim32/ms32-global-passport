(()=>{
 const home=document.getElementById('home');
 if(!home||document.getElementById('ms32RiskForReward'))return;
 const css=document.createElement('style');
 css.textContent=`
 #ms32RiskForReward{margin:12px 0;padding:13px;border:1px solid #a57935;border-radius:17px;background:linear-gradient(115deg,#352718,#102335);color:#fff}
 #ms32RiskForReward .rr-heading{font-size:15px;font-weight:900}
 #ms32RiskForReward .rr-sub{font-size:11px;color:#d1bd9b;margin:5px 0 11px;line-height:1.5}
 #ms32RiskForReward button{background:#dc9d3b;color:#171615;font-weight:900;border:0;border-radius:10px;padding:11px 13px;cursor:pointer;width:100%;font-size:12px}
 #ms32RiskForReward button:disabled{opacity:.55;cursor:default}
 #ms32RiskForReward .rr-stats{font-size:10px;color:#a9baca;margin-top:9px}
 #ms32RiskOverlay{position:fixed;inset:0;background:#030913ef;z-index:10020;display:flex;align-items:center;justify-content:center;padding:15px}
 #ms32RiskOverlay .rr-dialog{width:min(100%,470px);background:#0b1d2e;border:1px solid #b8863e;border-radius:20px;color:#f5f8fa;padding:20px;box-shadow:0 24px 80px #000a}
 #ms32RiskOverlay .rr-top{display:flex;justify-content:space-between;align-items:center;gap:9px}
 #ms32RiskOverlay .rr-top h2{font-size:19px;margin:0}
 #ms32RiskOverlay .rr-close{background:#243c50;border:1px solid #476079;color:#fff;padding:5px 10px;border-radius:9px;cursor:pointer}
 #ms32RiskOverlay .rr-note{font-size:12px;color:#b6c8d7;line-height:1.55;margin:12px 0}
 #ms32RiskOverlay .rr-danger{color:#ff9c91;font-weight:800}
 #ms32RiskOverlay .rr-go{background:#dba24a;border:0;border-radius:11px;color:#171717;padding:12px;width:100%;font-weight:900;cursor:pointer}
 #ms32RiskOverlay .rr-choices{display:grid;gap:8px;margin:14px 0}
 #ms32RiskOverlay .rr-choices button{padding:12px;text-align:left;background:#102e46;border:1px solid #385d7a;color:#fff;border-radius:11px;font-weight:700;font-size:12px;cursor:pointer}
 #ms32RiskOverlay .rr-choices button:disabled{opacity:.6}
 #ms32RiskOverlay .rr-clock{font-size:17px;font-weight:900;color:#ffcf86}
 `;
 document.head.appendChild(css);
 const box=document.createElement('section');
 box.id='ms32RiskForReward';
 box.innerHTML='<div class="rr-heading">🎯 Risk for Reward · Daily Aviation Trivia</div><div class="rr-sub">10 seconds · 1 attempt per day · Win +200 JP or risk losing 200 JP</div><button type="button" id="ms32RiskOpen">CHECK TODAY’S CHALLENGE</button><div class="rr-stats" id="ms32RiskStats">Yesterday’s anonymous results loading…</div>';
 const quick=home.querySelector('.quick');
 if(quick)quick.insertAdjacentElement('afterend',box);else home.appendChild(box);
 const button=box.querySelector('#ms32RiskOpen'),stats=box.querySelector('#ms32RiskStats');
 let current=null,interval=null,requesting=false;
 const call=async(path,body)=>{
  const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Service unavailable');return d;
 };
 async function sync(){
  try{
   const d=await call('/api/trivia/today');current=d;
   const p=d.previous||{};
   stats.textContent='Yesterday: '+(p.attempts||0)+' pilots attempted · '+(p.correct||0)+' correct';
   button.textContent=d.attempt?.completed?'TODAY’S CHALLENGE COMPLETED':d.attempt?'RETURN TO YOUR CHALLENGE':'PLAY TODAY’S CHALLENGE';
  }catch(e){stats.textContent=e.message;button.textContent='CHALLENGE UNAVAILABLE'}
 }
 function close(){clearInterval(interval);interval=null;document.getElementById('ms32RiskOverlay')?.remove();sync()}
 function overlay(){
  document.getElementById('ms32RiskOverlay')?.remove();
  const root=document.createElement('div');root.id='ms32RiskOverlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  const panel=document.createElement('div');panel.className='rr-dialog';root.appendChild(panel);document.body.appendChild(root);
  const top=document.createElement('div');top.className='rr-top';
  const title=document.createElement('h2');title.textContent='🎯 Risk for Reward';
  const exit=document.createElement('button');exit.type='button';exit.className='rr-close';exit.textContent='Close';exit.onclick=close;
  top.append(title,exit);panel.append(top);
  return panel;
 }
 function message(panel,msg){const p=document.createElement('p');p.className='rr-note';p.textContent=msg;panel.appendChild(p);return p}
 function completed(panel,attempt){
  message(panel,attempt.correct?'✅ Correct! +200 JP earned.':'Challenge complete. '+(Number(attempt.reward||0)<0?'You lost '+Math.abs(attempt.reward)+' JP.':'No JP deducted.'));
  message(panel,'Come back after 00:00 UTC for a new question.');
 }
 async function show(){
  if(requesting)return;requesting=true;
  try{
   const d=await call('/api/trivia/today');current=d;
   const panel=overlay();
   if(d.attempt?.completed){completed(panel,d.attempt);return}
   if(d.attempt){question(panel,d.question,d.day,d.attempt.expiresAt);return}
   message(panel,'One difficult aviation question. Four choices. Only 10 seconds to answer after you press Start.');
   const risk=message(panel,'Correct: +200 JP. Incorrect or timeout: risk losing 200 JP. One attempt per UTC day.');
   risk.classList.add('rr-danger');
   const start=document.createElement('button');start.type='button';start.className='rr-go';start.textContent='I ACCEPT THE RISK — START';
   panel.appendChild(start);
   start.onclick=async()=>{
    start.disabled=true;
    try{const x=await call('/api/trivia/start',{});panel.querySelectorAll(':scope > :not(.rr-top)').forEach(n=>n.remove());question(panel,x.question,x.day,x.expiresAt)}
    catch(e){message(panel,e.message);start.disabled=false;sync()}
   };
  }catch(e){const panel=overlay();message(panel,e.message)}
  finally{requesting=false}
 }
 function question(panel,q,day,expiresAt){
  clearInterval(interval);interval=null;
  if(!q){message(panel,'Refreshing your challenge…');sync().then(()=>{if(document.getElementById('ms32RiskOverlay'))show()});return}
  const deadline=Date.parse(expiresAt);
  const clock=document.createElement('div');clock.className='rr-clock';panel.appendChild(clock);
  message(panel,q.text);
  const choices=document.createElement('div');choices.className='rr-choices';panel.appendChild(choices);
  let locked=false;
  async function submit(choice){
    if(locked)return;locked=true;clearInterval(interval);interval=null;
    choices.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      const result=choice===null?await call('/api/trivia/today'):await call('/api/trivia/answer',{day,choice});
      const final=choice===null?result.attempt:result;
      if(!final?.completed){message(panel,'Finalising your challenge…');setTimeout(()=>{if(document.getElementById('ms32RiskOverlay')){close();show()}},1000);return}
      clock.remove();choices.remove();panel.querySelectorAll('.rr-note').forEach(x=>x.remove());
      completed(panel,final);sync();
    }catch(e){message(panel,e.message+' Check your challenge status before trying again.');sync()}
  }
  q.options.forEach((label,i)=>{
    const b=document.createElement('button');b.type='button';b.textContent=String.fromCharCode(65+i)+'. '+label;
    b.onclick=()=>submit(i);choices.appendChild(b);
  });
  function tick(){
    const left=Math.max(0,deadline-Date.now());
    clock.textContent='⏱ '+(left/1000).toFixed(1)+' seconds remaining';
    if(left===0){clearInterval(interval);interval=null;submit(null)}
  }
  tick();if(interval===null&&!locked)interval=setInterval(tick,100);
 }
 button.onclick=show;
 sync();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 setInterval(()=>{if(!document.hidden&&!document.getElementById('ms32RiskOverlay'))sync()},60000);
})();
