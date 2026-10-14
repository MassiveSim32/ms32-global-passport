(()=>{
  const baseApi=typeof api==='function'?api:null;
  if(!baseApi)return;

  function normalize(rows){
    if(!Array.isArray(rows))return[];
    return rows.map(r=>({...r,claimed:!!(r?.claimed&&r?.verified),legacyClaimed:!!(r?.claimed&&!r?.verified)}));
  }

  function merge(live,persisted){
    const byKey=new Map();
    for(const r of [...normalize(persisted),...normalize(live)]){
      if(!r?.userId||!r?.eventId)continue;
      const k=`${r.userId}:${r.eventId}`;
      const p=byKey.get(k)||{};
      const verified=!!(p.verified||r.verified);
      byKey.set(k,{
        ...p,...r,
        attendanceMinutes:Math.max(Number(p.attendanceMinutes||0),Number(r.attendanceMinutes||0)),
        verified,
        claimed:!!((p.claimed||r.claimed)&&verified),
        inVoice:!!(p.inVoice||r.inVoice)
      });
    }
    return [...byKey.values()].sort((a,b)=>String(a.username||'').localeCompare(String(b.username||''))||new Date(a.start||0)-new Date(b.start||0));
  }

  api=async function persistentAdminApi(url,opt){
    if(url==='/api/admin/pilots'){
      const live=await baseApi(url,opt);
      let persisted=[];
      try{persisted=await baseApi('/api/admin/pilot-history')}catch{}
      return merge(live,persisted);
    }
    return baseApi(url,opt);
  };

  setTimeout(()=>{try{if(typeof load==='function')load()}catch{}},0);
})();
