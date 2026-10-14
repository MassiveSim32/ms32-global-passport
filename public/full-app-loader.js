(()=>{
  // Keep every app shell on the same enhancement bundle. Some responses (notably
  // the admin account's root page) already have parts of the bundle injected by
  // the server wrapper, so skip individual files that are already present rather
  // than aborting the whole loader.
  const files=[
    '/journey-status-sanitizer.js?v=20261014-1',
    '/rewards-prototype.js?v=20261014-rc6',
    '/dual-clock.js?v=20261014-4',
    '/stamp-style-v2.js?v=20261014-4',
    '/bush-location-fix.js?v=20261014-4',
    '/airliner-location-fix.js?v=20261014-4',
    '/flying-now.js?v=20261014-4',
    '/dynamic-home-flight-hero.js?v=20261014-1',
    '/app-header-brand.js?v=20261014-2',
    '/home-feature-tiles.js?v=20261014-6',
    '/ybrm-airfield-weather.js?v=20261014-1',
    '/event-sponsors.js?v=20261014-3',
    '/nza-sponsor.js?v=20261014-1',
    '/hangar713-sponsor.js?v=20261014-1',
    '/taogs-sponsor.js?v=20261015-1',
    '/taogs-replacement-logo.js?v=20261015-1',
    '/fss-sponsor.js?v=20261015-1',
    '/asobo-event-sponsor.js?v=20261015-1',
    '/a2a-new-logo.js?v=20261015-2',
    '/balanced-sponsor-grid.js?v=20261015-1',
    '/passport-pages.js?v=20261014-7',
    '/passport-history.js?v=20261014-2',
    '/globe-coming-soon.js?v=20261014-1',
    '/home-quick-colors.js?v=20261014-4',
    '/home-stat-links.js?v=20261014-4',
    '/release-v1.js?v=1.0.0'
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