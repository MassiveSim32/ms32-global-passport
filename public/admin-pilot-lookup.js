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

  api=async function adminConsistentApi(url,opt){
    const data=await baseApi(url,opt);

    if(url==='/api/admin/pilots'){
      return normalizePilotRows(data);
    }

    if(url==='/api/admin/overview'&&data&&typeof data==='object'){
      try{
        const pilots=normalizePilotRows(await baseApi('/api/admin/pilots'))||[];
        const stamps=pilots.filter(r=>r.claimed).length;
        const stampReady=pilots.filter(r=>r.verified&&!r.claimed&&!r.legacyClaimed).length;
        return {...data,stamps,stampReady};
      }catch{return data}
    }

    if(url==='/api/admin/events'&&Array.isArray(data)){
      try{
        const pilots=normalizePilotRows(await baseApi('/api/admin/pilots'))||[];
        return data.map(e=>{
          const eventId=String(e?.id||e?.eventId||'');
          const eventRows=pilots.filter(r=>String(r?.eventId||'')===eventId);
          return {
            ...e,
            stamped:eventRows.filter(r=>r.claimed).length,
            ready:eventRows.filter(r=>r.verified&&!r.claimed&&!r.legacyClaimed).length
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
