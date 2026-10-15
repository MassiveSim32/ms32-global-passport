import fs from 'node:fs/promises';

const lines=(xs)=>xs.join('\n');

async function patchLifecycle(){
  const file='flying-now-lifecycle.js';
  let src=await fs.readFile(file,'utf8');

  const oldCreate=lines([
    '  const eventId=`flying-now:${hobartDay()}`;',
    '  const baseAttendanceMs=await loadBaseAttendance(user.id,eventId);',
    '  const s={',
    '    userId:user.id,username:user.username,eventId,departure,destination,aircraft,',
    "    postedAt:Date.now(),state:'pending',joinedAt:null,activatedAt:null,finishedAt:null,"
  ]);
  const newCreate=lines([
    '  const postedAt=Date.now();',
    "  const eventId=`flying-now:${hobartDay(new Date(postedAt))}:${postedAt.toString(36)}:${crypto.randomBytes(3).toString('hex')}`;",
    '  const baseAttendanceMs=0;',
    '  const s={',
    '    userId:user.id,username:user.username,eventId,departure,destination,aircraft,',
    "    postedAt,state:'pending',joinedAt:null,activatedAt:null,finishedAt:null,"
  ]);
  if(!src.includes(oldCreate)) throw new Error('Flying Now create-session patch target not found');
  src=src.replace(oldCreate,newCreate);

  const oldRecover=lines([
    '    const todayEventId=`flying-now:${hobartDay()}`;',
    '    const q=await p.query(`SELECT user_id,event_id,username,event_name,event_start,attendance_ms,active,updated_at',
    '      FROM passport_registrations',
    '      WHERE user_id=$1 AND event_id=$2',
    '      ORDER BY updated_at DESC LIMIT 1`,[id,todayEventId]);'
  ]);
  const newRecover=lines([
    '    const day=hobartDay();',
    '    const q=await p.query(`SELECT user_id,event_id,username,event_name,event_start,attendance_ms,active,updated_at',
    '      FROM passport_registrations',
    '      WHERE user_id=$1 AND active=TRUE AND event_id LIKE $2',
    '      ORDER BY updated_at DESC LIMIT 1`,[id,`flying-now:${day}:%`]);'
  ]);
  if(!src.includes(oldRecover)) throw new Error('Flying Now recovery patch target not found');
  src=src.replace(oldRecover,newRecover);

  await fs.writeFile(file,src);
}

async function patchLegacyDailyStamp(){
  const file='server-fixed-wrapper.js';
  let src=await fs.readFile(file,'utf8');
  const oldBlock=lines([
    '    let stampAwarded = false;',
    "    let bonusReason = '';",
    '',
    '    if (!voiceConfigured) {',
    "      bonusReason = 'Bonus stamp verification is waiting for the Flying Now voice/comms channel to be configured.';",
    '    } else if (!voiceEligible) {',
    "      bonusReason = 'Join the approved Flying Now voice/comms channel before posting to earn the bonus stamp.';",
    '    } else {',
    "      const day = new Date().toISOString().slice(0,10);",
    '      const eventId = `flying-now:${day}`;',
    '      const exists = await flyingNowStampExists(user.id, eventId);',
    '      if (exists) {',
    "        bonusReason = 'Your Flying Now bonus stamp for today is already in your Passport.';",
    '      } else {',
    '        const start = new Date().toISOString();',
    '        await saveFlyingNowStamp({',
    '          userId:user.id,eventId,username:user.username,',
    '          eventName:`Flying Now · ${departure} to ${destination} · ${aircraft}`,' ,
    '          start,channelId:currentVoice,departure,destination,aircraft',
    '        });',
    '        stampAwarded = true;',
    '      }',
    '    }'
  ]);
  const newBlock=lines([
    '    const stampAwarded = false;',
    '    const bonusReason = !voiceConfigured',
    "      ? 'Journey Points verification is waiting for the Flying Now voice/comms channel to be configured.'",
    '      : !voiceEligible',
    "        ? 'Join the approved Flying Now voice/comms channel to start this flight at zero and earn Journey Points.'",
    "        : 'Flight posted. Attendance starts at zero for this flight and is saved independently.';"
  ]);
  if(!src.includes(oldBlock)) throw new Error('Flying Now legacy daily-stamp patch target not found');
  src=src.replace(oldBlock,newBlock);
  await fs.writeFile(file,src);
}

async function patchStampCities(){
  const file='public/stamp-style-v2.js';
  let src=await fs.readFile(file,'utf8');
  if(src.includes("CYVR:'Vancouver'")) return;
  const target="KJFK:'New York',KLAX:'Los Angeles',KSFO:'San Francisco',KSEA:'Seattle',KORD:'Chicago',KATL:'Atlanta',EGLL:'London'";
  const replacement="KJFK:'New York',KLAX:'Los Angeles',KSFO:'San Francisco',KSEA:'Seattle',KORD:'Chicago',KATL:'Atlanta',CYVR:'Vancouver',EGLL:'London'";
  if(!src.includes(target)) throw new Error('Flying Now stamp city map target not found');
  src=src.replace(target,replacement);
  await fs.writeFile(file,src);
}

async function patchFlyingNowCooldown(){
  const file='server-fixed-wrapper.js';
  let src=await fs.readFile(file,'utf8');
  const target='const FLYING_NOW_COOLDOWN_MS = 15 * 60 * 1000;';
  if(src.includes(target)) src=src.replace(target,'const FLYING_NOW_COOLDOWN_MS = 0;');
  await fs.writeFile(file,src);
}

await patchLifecycle();
await patchLegacyDailyStamp();
await patchStampCities();
await patchFlyingNowCooldown();
console.log('Flying Now per-flight attendance isolation patch applied; legacy daily sessions are history-only; Vancouver stamp label fixed; posting cooldown disabled');
