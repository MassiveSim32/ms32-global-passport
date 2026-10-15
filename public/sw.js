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
  })());
});
