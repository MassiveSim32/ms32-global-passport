(()=>{
  // Admin responses already receive the enhancement bundle from the server wrapper.
  // Normal beta pilots receive index.html through express.static(), so load the same
  // bundle here only when it has not already been injected.
  if(document.querySelector('script[src*="/flying-now.js"]')) return;

  const files=[
    '/rewards-prototype.js?v=20261013-15',
    '/dual-clock.js?v=20261013-15',
    '/stamp-style-v2.js?v=20261013-15',
    '/bush-location-fix.js?v=20261013-15',
    '/airliner-location-fix.js?v=20261013-15',
    '/flying-now.js?v=20261013-15',
    '/passport-pages.js?v=20261013-15'
  ];

  const load=(src)=>new Promise((resolve)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=resolve;
    document.body.appendChild(s);
  });

  (async()=>{
    for(const src of files) await load(src);
  })();
})();
