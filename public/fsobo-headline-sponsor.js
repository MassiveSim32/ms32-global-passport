(()=>{
  const host=document.getElementById('major-sponsors');
  if(!host||document.getElementById('fsoboHeadlineSponsor'))return;

  const style=document.createElement('style');
  style.textContent=`
    .headline-sponsor{margin:12px 0 18px;border:1px solid #d2b35e;border-radius:22px;padding:18px;background:radial-gradient(circle at top,#4b3a12,#221b0d 58%,#0b1725);box-shadow:0 14px 34px #0007,inset 0 0 34px #ffd76b16;text-align:center;position:relative;overflow:hidden}
    .headline-sponsor:before{content:'MAJOR HEADLINE SPONSOR';display:inline-block;font-size:9px;font-weight:1000;letter-spacing:.16em;color:#f0d57f;border:1px solid #8f783d;border-radius:999px;padding:6px 9px;margin-bottom:13px;background:#1b160c}
    .headline-sponsor img{display:block;width:min(100%,340px);height:auto;max-height:132px;object-fit:contain;margin:0 auto}
    .headline-sponsor strong{display:block;margin-top:12px;font-size:12px;letter-spacing:.08em;color:#fff;text-transform:uppercase}
    .headline-sponsor small{display:block;color:#bcb6a4;margin-top:4px;font-size:9px;letter-spacing:.06em;text-transform:uppercase}
    .headline-sponsor-error{font-size:10px;color:#d8caa1;padding:18px 0}
  `;
  document.head.appendChild(style);

  const card=document.createElement('div');
  card.id='fsoboHeadlineSponsor';
  card.className='headline-sponsor';
  card.innerHTML='<div class="headline-sponsor-error">Loading headline sponsor…</div><strong>ASOBO Studio</strong><small>Major Headline Sponsor · Massive Fly In “Broome”</small>';
  host.prepend(card);

  const parts=Array.from({length:8},(_,i)=>`/fsobo-logo.part${String(i+1).padStart(2,'0')}.b64`);
  const expectedHash='4ba1a719a284214df962214d7101e9d773107aa24f7a8767c312e2524a3f62a9';
  Promise.all(parts.map(src=>fetch(src,{cache:'force-cache'}).then(r=>{
    if(!r.ok)throw new Error(`Sponsor logo part failed: ${src}`);
    return r.text();
  }))).then(async chunks=>{
    const base64=chunks.join('').replace(/\s+/g,'');
    if(base64.length!==74568)throw new Error(`Sponsor logo length mismatch: ${base64.length}`);
    const binary=atob(base64);
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==expectedHash)throw new Error(`Sponsor logo checksum mismatch: ${hash}`);
    const img=document.createElement('img');
    img.src=`data:image/png;base64,${base64}`;
    img.alt='ASOBO Studio';
    img.decoding='async';
    const loading=card.querySelector('.headline-sponsor-error');
    if(loading)loading.replaceWith(img);else card.prepend(img);
  }).catch(err=>{
    console.error('ASOBO headline sponsor logo failed to load',err);
    const loading=card.querySelector('.headline-sponsor-error');
    if(loading)loading.textContent='ASOBO Studio';
  });
})();