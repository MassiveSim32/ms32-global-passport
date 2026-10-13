(()=>{
  // Keep every app shell on the same enhancement bundle. Some responses (notably
  // the admin account's root page) already have parts of the bundle injected by
  // the server wrapper, so skip individual files that are already present rather
  // than aborting the whole loader.
  const files=[
    '/rewards-prototype.js?v=20261014-2',
    '/dual-clock.js?v=20261014-2',
    '/stamp-style-v2.js?v=20261014-2',
    '/bush-location-fix.js?v=20261014-2',
    '/airliner-location-fix.js?v=20261014-2',
    '/flying-now.js?v=20261014-2',
    '/passport-pages.js?v=20261014-2',
    '/home-quick-colors.js?v=20261014-2',
    '/home-stat-links.js?v=20261014-2'
  ];

  const pathname=src=>String(src).split('?')[0];
  const alreadyLoaded=src=>{
    const p=pathname(src);
    return [...document.scripts].some(s=>pathname(s.getAttribute('src')||'')===p);
  };

  const load=(src)=>new Promise((resolve)=>{
    if(alreadyLoaded(src)) return resolve();
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