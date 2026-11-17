self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('ms32-passport-')).map(k=>caches.delete(k)));
    }catch{}
    // Take control without unregistering or navigating open windows. The previous
    // worker unregistered itself and then forced every client to reload, so each
    // visit could briefly show the old shell before the latest enhancement bundle
    // finished loading.
    try{await self.clients.claim();}catch{}
    // Refresh installed Android PWA windows when a new worker takes over.
    // A version marker prevents repeat navigation for this release.
    try{
      const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      for(const client of windows){
        const url=new URL(client.url);
        if(url.origin!==self.location.origin||url.searchParams.get('ms32app')==='20261117-memberheader2')continue;
        url.searchParams.set('ms32app','20261117-memberheader2');
        await client.navigate(url.href);
      }
    }catch{}
  })());
});
