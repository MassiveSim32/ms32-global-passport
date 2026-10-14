(()=>{
  function eventFor(id){
    try{
      const all=[...(Array.isArray(allEvents)?allEvents:[]),...(Array.isArray(window.passportHistoryEvents)?window.passportHistoryEvents:[])];
      return all.find(e=>String(e?.id)===String(id))||null;
    }catch{return null}
  }

  function sanitize(){
    try{
      if(typeof statuses!=='object'||!statuses)return;
      const now=Date.now();
      for(const [id,s] of Object.entries(statuses)){
        if(!s||String(id).startsWith('flying-now:'))continue;
        const e=eventFor(id);
        const start=e?.start?new Date(e.start).getTime():NaN;
        if(Number.isFinite(start)&&start>now){
          s.attendanceMinutes=0;
          s.verified=false;
        }
      }
    }catch{}
  }

  sanitize();
  setInterval(sanitize,1000);
})();
