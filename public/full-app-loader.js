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
    '/stamp-style-v2.js?v=20261115-cairns-route3',
    '/canada-stamp-fix.js?v=20261026-icao-aircraft-fix1',
    '/spain-stamp-fix.js?v=20261018-2',
    '/bush-location-fix.js?v=20261014-4',
    '/airliner-location-fix.js?v=20261112-new-orleans2',
    '/local-flight-stamp-fix.js?v=20261016-1',
    '/flying-now.js?v=20261115-remove-preview1',
    '/live-community-flights.js?v=20261112-join-comms1',
    '/dynamic-home-flight-hero.js?v=20261014-1',
    '/home-active-community-flight.js?v=20261117-gridfix3',
    '/app-header-brand.js?v=20261014-2',
    '/discord-member-count.js?v=20261117-count1',
    '/home-feature-tiles.js?v=20261117-gridfix3',
    '/all-star-event-hub.js?v=20261117-three-tiles1',
    '/weekly-challenge.js?v=20261117-top1',
    '/honor-board.js?v=20261117-menu1',
    '/risk-for-reward.js?v=20261019-timer20s1',
    '/ybrm-airfield-weather.js?v=20261014-1',
    '/flightfx-sponsor.js?v=20261117-flightfx-only1',
    '/passport-pages.js?v=20261115-cairns-route4',
    '/passport-history.js?v=20261017-live-metadata1',
    '/globe-coming-soon.js?v=20261014-1',
    '/home-quick-colors.js?v=20261014-4',
    '/home-stat-links.js?v=20261014-4',
    '/home-quick-counts.js?v=20261019-live-total1',
    '/release-v1.js?v=1.0.2'
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