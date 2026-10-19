(()=>{
  // Keep every app shell on the same enhancement bundle. Scripts are appended
  // together with async=false so the browser can download them in parallel while
  // still executing them in the existing order. The old loader waited for every
  // file to finish before even requesting the next one, which made the base shell
  // visible for several seconds before the current UI finished applying.
  const files=[
    '/journey-status-sanitizer.js?v=20261014-1',
    '/rewards-prototype.js?v=20261015-v1fix',
    '/journey-leaderboard.js?v=20261016-sources1',
    '/dual-clock.js?v=20261014-4',
    '/stamp-style-v2.js?v=20261018-icao-country1',
    '/canada-stamp-fix.js?v=20261017-4',
    '/spain-stamp-fix.js?v=20261018-2',
    '/bush-location-fix.js?v=20261014-4',
    '/airliner-location-fix.js?v=20261015-cartagena3',
    '/local-flight-stamp-fix.js?v=20261016-1',
    '/flying-now.js?v=20261018-adaptive1',
    '/live-community-flights.js?v=20261019-shared-count1',
    '/dynamic-home-flight-hero.js?v=20261014-1',
    '/home-active-community-flight.js?v=20261018-flighttype1',
    '/app-header-brand.js?v=20261014-2',
    '/home-feature-tiles.js?v=20261014-6',
    '/risk-for-reward.js?v=20261019-copy3',
    '/ybrm-airfield-weather.js?v=20261014-1',
    '/event-sponsors.js?v=20261014-3',
    '/nza-sponsor.js?v=20261014-1',
    '/hangar713-sponsor.js?v=20261014-1',
    '/hangar713-replacement-logo.js?v=20261015-1',
    '/flightfx-sponsor.js?v=20261015-2',
    '/taogs-sponsor.js?v=20261015-1',
    '/taogs-replacement-logo.js?v=20261015-1',
    '/fss-sponsor.js?v=20261015-3',
    '/asobo-event-sponsor.js?v=20261015-1',
    '/a2a-new-logo.js?v=20261015-2',
    '/balanced-sponsor-grid.js?v=20261015-1',
    '/passport-pages.js?v=20261017-canada-refresh4',
    '/passport-history.js?v=20261017-live-metadata1',
    '/globe-coming-soon.js?v=20261014-1',
    '/home-quick-colors.js?v=20261014-4',
    '/home-stat-links.js?v=20261014-4',
    '/home-quick-counts.js?v=20261019-live-total1',
    '/release-v1.js?v=1.0.1'
  ];

  const pathname=src=>String(src).split('?')[0];
  const alreadyLoaded=src=>{
    const p=pathname(src);
    return [...document.scripts].some(s=>pathname(s.getAttribute('src')||'')===p);
  };

  const pending=[];
  for(const src of files){
    if(alreadyLoaded(src)) continue;
    pending.push(new Promise(resolve=>{
      const s=document.createElement('script');
      s.src=src;
      s.async=false;
      s.onload=resolve;
      s.onerror=resolve;
      document.body.appendChild(s);
    }));
  }

  Promise.all(pending).finally(()=>{
    document.documentElement.classList.add('ms32-ready');
    window.dispatchEvent(new Event('ms32:ready'));
  });
})();