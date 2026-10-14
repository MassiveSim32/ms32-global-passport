(()=>{
  // Keep admin reporting aligned with the same rule used by the pilot Passport:
  // a stamp is only considered issued when it is both claimed and verified.
  const baseApi=typeof api==='function'?api:null;
  if(!baseApi)return;

  function normalizePilotRows(rows){
    if(!Array.isArray(rows))return rows;
    return rows.map(r=>{
      const legacyClaimed=!!(r?.claimed&&!r?.verified);
      return {...r,legacyClaimed,claimed:!!(r?.claimed&&r?.verified)};
    });
  }

  async function persistentPilotRows(){
    try{
      const rows=await baseApi('/api/admin/pilot-history');
      return normalizePilotRows(rows)||[];
    }catch{return[]}
  }

  function mergePilotRows(live,persisted){
    const byKey=new Map();
    for(const r of [...(persisted||[]),...(live||[])]){
      const k=`${r?.userId||''}:${r?.eventId||''}`;
      if(!r?.userId||!r?.eventId)continue;
      const prev=byKey.get(k)||{};
      byKey.set(k,{
        ...prev,
        ...r,
        attendanceMinutes:Math.max(Number(prev.attendanceMinutes||0),Number(r.attendanceMinutes||0)),
        verified:!!(prev.verified||r.verified),
        claimed:!!((prev.claimed||r.claimed)&&(prev.verified||r.verified)),
        active:!!(r.active??prev.active),
        inVoice:!!(r.inVoice||prev.inVoice)
      });
    }
    return [...byKey.values()].sort((a,b)=>String(a.username||'').localeCompare(String(b.username||''))||new Date(a.start||0)-new Date(b.start||0));
  }

  api=async function adminConsistentApi(url,opt){
    const data=await baseApi(url,opt);

    if(url==='/api/admin/pilots'){
      const live=normalizePilotRows(data)||[];
      return mergePilotRows(live,await persistentPilotRows());
    }

    if(url==='/api/admin/overview'&&data&&typeof data==='object'){
      try{
        const pilots=await api('/api/admin/pilots')||[];
        const stamps=pilots.filter(r=>r.claimed).length;
        const stampReady=pilots.filter(r=>r.verified&&!r.claimed&&!r.legacyClaimed).length;
        return {...data,stamps,stampReady,registrations:pilots.length,pilots:new Set(pilots.map(r=>r.userId)).size};
      }catch{return data}
    }

    if(url==='/api/admin/events'&&Array.isArray(data)){
      try{
        const pilots=await api('/api/admin/pilots')||[];
        return data.map(e=>{
          const eventId=String(e?.id||e?.eventId||'');
          const eventRows=pilots.filter(r=>String(r?.eventId||'')===eventId);
          return {
            ...e,
            stamped:eventRows.filter(r=>r.claimed).length,
            ready:eventRows.filter(r=>r.verified&&!r.claimed&&!r.legacyClaimed).length,
            registrations:eventRows.length,
            inVoice:eventRows.filter(r=>r.inVoice).length
          };
        });
      }catch{return data}
    }

    return data;
  };

  // The core admin page may have started its first request before this helper
  // loaded. Refresh the active tab once so the corrected values are immediate.
  setTimeout(()=>{try{if(typeof load==='function')load()}catch{}},0);
})();
