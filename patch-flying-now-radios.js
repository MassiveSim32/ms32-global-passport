import fs from 'node:fs/promises';

const free={
  '1560271519387615262':'Free Flight Radio 1',
  '1560271563901771836':'Free Flight Radio 2',
  '1560271637796884530':'Free Flight Radio 3'
};
const solo={
  '1560271866122211408':'Solo Flight Radio 1',
  '1560271759792410696':'Solo Flight Radio 2',
  '1560271715261747290':'Solo Flight Radio 3'
};
const all={...free,...solo};
const must=(src,from,to,label)=>{
  if(!src.includes(from)) throw new Error(`Flying Now radio patch target missing: ${label}`);
  return src.replace(from,to);
};

async function patchLifecycle(){
  const file='flying-now-lifecycle.js';
  let src=await fs.readFile(file,'utf8');
  if(src.includes('FLYING_NOW_RADIO_CHANNELS'))return;
  src=must(src,
    "const FLYING_NOW_VOICE_CHANNEL_ID = String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '');",
    `const FLYING_NOW_VOICE_CHANNEL_ID = String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '');\nconst FREE_FLIGHT_RADIOS=new Set(${JSON.stringify(Object.keys(free))});\nconst SOLO_FLIGHT_RADIOS=new Set(${JSON.stringify(Object.keys(solo))});\nconst FLYING_NOW_RADIO_CHANNELS=new Set([...FREE_FLIGHT_RADIOS,...SOLO_FLIGHT_RADIOS]);`,
    'lifecycle constants');
  src=must(src,
    "  const aircraft=clean(body?.aircraft,48);\n  if(!departure||!destination||!aircraft)return null;",
    "  const aircraft=clean(body?.aircraft,48);\n  const joinPolicy=String(body?.joinPolicy||'open').toLowerCase()==='solo'?'solo':'open';\n  const channelId=String(body?.channelId||'');\n  const radioOk=joinPolicy==='solo'?SOLO_FLIGHT_RADIOS.has(channelId):FREE_FLIGHT_RADIOS.has(channelId);\n  if(!departure||!destination||!aircraft||!radioOk)return null;",
    'lifecycle input');
  src=must(src,
    '    userId:user.id,username:user.username,eventId,departure,destination,aircraft,\n    postedAt,state:',
    '    userId:user.id,username:user.username,eventId,departure,destination,aircraft,channelId,joinPolicy,\n    postedAt,state:',
    'lifecycle session fields');
  src=src.replace('FLYING_NOW_VOICE_CHANNEL_ID,total,verified,active]);','s.channelId,total,verified,active]);');
  src=src.replace("  console.log('Flying Now pilot became active in Champagne Voice');","  console.log(`Flying Now pilot became active in selected radio ${s.channelId}`);");
  src=src.replace('  if(currentVoiceChannel(user.id)===FLYING_NOW_VOICE_CHANNEL_ID)activateSession(user.id);','  if(currentVoiceChannel(user.id)===channelId)activateSession(user.id);');
  src=src.replace("  if(!FLYING_NOW_VOICE_CHANNEL_ID||currentVoiceChannel(id)!==FLYING_NOW_VOICE_CHANNEL_ID)return sessions.get(id)||null;","  const currentVoice=currentVoiceChannel(id);\n  if(!FLYING_NOW_RADIO_CHANNELS.has(String(currentVoice||'')))return sessions.get(id)||null;");
  src=src.replace('SELECT user_id,event_id,username,event_name,event_start,attendance_ms,active,updated_at','SELECT user_id,event_id,username,event_name,event_start,channel_id,attendance_ms,active,updated_at');
  src=src.replace("    const parts=parseFlightName(r.event_name);\n    const s={","    const channelId=String(r.channel_id||'');\n    if(!FLYING_NOW_RADIO_CHANNELS.has(channelId)||currentVoice!==channelId)return null;\n    const parts=parseFlightName(r.event_name);\n    const joinPolicy=SOLO_FLIGHT_RADIOS.has(channelId)?'solo':'open';\n    const s={");
  src=src.replace('      departure:parts.departure,destination:parts.destination,aircraft:parts.aircraft,','      departure:parts.departure,destination:parts.destination,aircraft:parts.aircraft,channelId,joinPolicy,');
  src=must(src,
    "    if(old===FLYING_NOW_VOICE_CHANNEL_ID&&value!==FLYING_NOW_VOICE_CHANNEL_ID)finishSession(key,'left_voice');\n    const result=baseMapSet.call(this,key,value);\n    if(value===FLYING_NOW_VOICE_CHANNEL_ID){\n      if(sessions.has(String(key)))activateSession(key);\n      else void recoverSession(key);\n    }",
    "    const session=sessions.get(String(key));\n    if(session?.channelId&&old===session.channelId&&value!==session.channelId)finishSession(key,'left_voice');\n    const result=baseMapSet.call(this,key,value);\n    const current=sessions.get(String(key));\n    if(current?.channelId===value)activateSession(key);\n    else if(!current&&FLYING_NOW_RADIO_CHANNELS.has(value))void recoverSession(key);",
    'lifecycle voice set');
  src=src.replace("    if(old===FLYING_NOW_VOICE_CHANNEL_ID)finishSession(key,'left_voice');","    const session=sessions.get(String(key));\n    if(session?.channelId&&old===session.channelId)finishSession(key,'left_voice');");
  src=src.replace("  if(!s&&voice===FLYING_NOW_VOICE_CHANNEL_ID)s=await recoverSession(id);\n  if(s?.state==='pending'&&voice===FLYING_NOW_VOICE_CHANNEL_ID)s=activateSession(id);\n  if(s?.state==='active'&&voice!==FLYING_NOW_VOICE_CHANNEL_ID)s=finishSession(id,'left_voice');","  if(!s&&FLYING_NOW_RADIO_CHANNELS.has(String(voice||'')))s=await recoverSession(id);\n  if(s?.state==='pending'&&voice===s.channelId)s=activateSession(id);\n  if(s?.state==='active'&&voice!==s.channelId)s=finishSession(id,'left_voice');");
  src=src.replace("return {state:s.state,eventId:s.eventId,departure:s.departure,destination:s.destination,aircraft:s.aircraft,\n    attendanceMinutes","return {state:s.state,eventId:s.eventId,departure:s.departure,destination:s.destination,aircraft:s.aircraft,\n    channelId:s.channelId,joinPolicy:s.joinPolicy,attendanceMinutes");
  await fs.writeFile(file,src);
}

async function patchServer(){
  const file='server-fixed-wrapper.js';
  let src=await fs.readFile(file,'utf8');
  if(src.includes('FLYING_NOW_RADIO_LOOKUP'))return;
  src=must(src,
    "const FLYING_NOW_VOICE_CHANNEL_ID = String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '');",
    `const FLYING_NOW_VOICE_CHANNEL_ID = String(process.env.FLYING_NOW_VOICE_CHANNEL_ID || '');\nconst FLYING_NOW_RADIO_LOOKUP=${JSON.stringify(all)};\nconst FREE_FLIGHT_RADIOS=new Set(${JSON.stringify(Object.keys(free))});\nconst SOLO_FLIGHT_RADIOS=new Set(${JSON.stringify(Object.keys(solo))});`,
    'server radio constants');
  src=src.replace('async function postFlyingNowToDiscord(user, departure, destination, aircraft) {','async function postFlyingNowToDiscord(user, departure, destination, aircraft, channelId, joinPolicy) {');
  src=src.replace("        {name:'Route',value:`${departure} → ${destination}`,inline:false}","        {name:'Route',value:`${departure} → ${destination}`,inline:false},\n        {name:'Comms',value:`<#${channelId}>`,inline:true},\n        {name:'Flight access',value:joinPolicy==='solo'?'🔒 SOLO FLIGHT':'🟢 OPEN TO JOIN',inline:true}");
  src=must(src,
    "    const aircraft = cleanFlightField(req.body?.aircraft, 48);\n    if (!departure || !destination || !aircraft) return res.status(400).json({error:'Departure, destination and aircraft are required'});",
    "    const aircraft = cleanFlightField(req.body?.aircraft, 48);\n    const joinPolicy=String(req.body?.joinPolicy||'open').toLowerCase()==='solo'?'solo':'open';\n    const channelId=String(req.body?.channelId||'');\n    const radioOk=joinPolicy==='solo'?SOLO_FLIGHT_RADIOS.has(channelId):FREE_FLIGHT_RADIOS.has(channelId);\n    if (!departure || !destination || !aircraft) return res.status(400).json({error:'Departure, destination and aircraft are required'});\n    if(!radioOk)return res.status(400).json({error:'Please select an approved radio channel for this flight type'});",
    'server request fields');
  src=src.replace('await postFlyingNowToDiscord(user, departure, destination, aircraft);','await postFlyingNowToDiscord(user, departure, destination, aircraft, channelId, joinPolicy);');
  src=src.replace('    const voiceConfigured = !!FLYING_NOW_VOICE_CHANNEL_ID;\n    const voiceEligible = voiceConfigured && currentVoice === FLYING_NOW_VOICE_CHANNEL_ID;','    const voiceConfigured = !!FLYING_NOW_RADIO_LOOKUP[channelId];\n    const voiceEligible = voiceConfigured && currentVoice === channelId;');
  src=src.replace("? 'Journey Points verification is waiting for the Flying Now voice/comms channel to be configured.'","? 'Journey Points verification is waiting for the selected radio channel.'");
  src=src.replace("? 'Join the approved Flying Now voice/comms channel to start this flight at zero and earn Journey Points.'","? `Join ${FLYING_NOW_RADIO_LOOKUP[channelId]} to start this flight at zero and earn Journey Points.`");
  src=src.replace("    res.json({ok:true,posted:true,stampAwarded,voiceEligible,bonusReason});","    res.json({ok:true,posted:true,stampAwarded,voiceEligible,bonusReason,channelId,channelName:FLYING_NOW_RADIO_LOOKUP[channelId],joinPolicy});");
  await fs.writeFile(file,src);
}

async function patchUi(){
  const file='public/flying-now.js';
  let src=await fs.readFile(file,'utf8');
  if(src.includes('flyingNowJoinPolicy'))return;
  src=src.replace('Your flight will finish automatically when you leave Champagne Voice.','Your flight will finish automatically when you leave your selected radio channel.');
  src=src.replace('Posts to #champagne-chat · join Champagne Voice to earn Journey Points','Posts to #champagne-chat · select a radio channel to earn Journey Points');
  src=must(src,
    '<label class="flying-now-field"><span>Aircraft type</span><input id="flyingNowAircraft" maxlength="48" placeholder="E.G. CESSNA 208B"></label><div id="flyingNowStatus" class="flying-now-status">Post your flight, then join the Champagne Voice Channel to activate it and start earning Journey Points.</div>',
    '<label class="flying-now-field"><span>Aircraft type</span><input id="flyingNowAircraft" maxlength="48" placeholder="E.G. CESSNA 208B"></label><label class="flying-now-field"><span>Flight access</span><select id="flyingNowJoinPolicy" style="width:100%;padding:12px;background:#07131f;color:white;border:1px solid #29475f;border-radius:13px"><option value="open">🟢 Open to Join</option><option value="solo">🔒 Solo Flight</option></select></label><label class="flying-now-field"><span>Radio channel</span><select id="flyingNowRadio" style="width:100%;padding:12px;background:#07131f;color:white;border:1px solid #29475f;border-radius:13px"></select></label><div id="flyingNowStatus" class="flying-now-status">Post your flight, then join the selected Radio channel to activate it and start earning Journey Points.</div>',
    'ui radio fields');
  src=src.replace("  $('flyingNowType')?.addEventListener('change',()=>{const local=$('flyingNowType').value!=='route';$('flyingNowLocalFields').classList.toggle('hidden',!local);$('flyingNowRouteFields').classList.toggle('hidden',local)});",
`  $('flyingNowType')?.addEventListener('change',()=>{const local=$('flyingNowType').value!=='route';$('flyingNowLocalFields').classList.toggle('hidden',!local);$('flyingNowRouteFields').classList.toggle('hidden',local)});
  const radioGroups={open:${JSON.stringify(free)},solo:${JSON.stringify(solo)}};
  const radioName=id=>Object.values(radioGroups).flatMap(x=>Object.entries(x)).find(([key])=>key===String(id||''))?.[1]||'SELECTED RADIO';
  function refreshRadios(){const policy=$('flyingNowJoinPolicy')?.value||'open';const box=$('flyingNowRadio');if(!box)return;box.innerHTML=Object.entries(radioGroups[policy]).map(([id,name])=>\`<option value="\${id}">\${name}</option>\`).join('')}
  $('flyingNowJoinPolicy')?.addEventListener('change',refreshRadios);refreshRadios();`);
  src=src.replace('● PILOT ACTIVE · IN CHAMPAGNE VOICE','● PILOT ACTIVE · IN SELECTED RADIO');
  src=src.replace("      meta.textContent='JOIN THE CHAMPAGNE VOICE CHANNEL TO START EARNING JOURNEY POINTS';","      meta.textContent=`JOIN ${radioName(data.channelId)} TO START EARNING JOURNEY POINTS`; ");
  src=src.replace("    meta.textContent='Posts to #champagne-chat · join Champagne Voice to earn Journey Points';","    meta.textContent='Posts to #champagne-chat · select a radio channel to earn Journey Points';");
  src=src.replace("    const status=$('flyingNowStatus');","    const joinPolicy=String($('flyingNowJoinPolicy')?.value||'open');\n    const channelId=String($('flyingNowRadio')?.value||'');\n    const status=$('flyingNowStatus');");
  src=src.replace("body:JSON.stringify({departure,destination,aircraft})","body:JSON.stringify({departure,destination,aircraft,channelId,joinPolicy})");
  src=src.replace("const immediate={state:d.voiceEligible?'active':'pending',departure,destination,aircraft,attendanceMinutes:0,points:0};","const immediate={state:d.voiceEligible?'active':'pending',departure,destination,aircraft,channelId,joinPolicy,attendanceMinutes:0,points:0};");
  src=src.replace("'Join the Champagne Voice Channel to start earning Journey Points.'","`Join ${radioName(channelId)} to start earning Journey Points.`");
  await fs.writeFile(file,src);
}

await patchLifecycle();
await patchServer();
await patchUi();
console.log('Flying Now selectable radios and solo/open flight modes applied');
