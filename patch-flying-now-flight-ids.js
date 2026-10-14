import fs from 'node:fs/promises';

async function patchLifecycle(){
  const file='flying-now-lifecycle.js';
  let src=await fs.readFile(file,'utf8');

  const oldCreate=`  const eventId=\`flying-now:${hobartDay()}\`;\n  const baseAttendanceMs=await loadBaseAttendance(user.id,eventId);\n  const s={\n    userId:user.id,username:user.username,eventId,departure,destination,aircraft,\n    postedAt:Date.now(),state:'pending',joinedAt:null,activatedAt:null,finishedAt:null,`;
  const newCreate=`  const postedAt=Date.now();\n  const eventId=\`flying-now:${hobartDay(new Date(postedAt))}:${postedAt.toString(36)}:${crypto.randomBytes(3).toString('hex')}\`;\n  const baseAttendanceMs=0;\n  const s={\n    userId:user.id,username:user.username,eventId,departure,destination,aircraft,\n    postedAt,state:'pending',joinedAt:null,activatedAt:null,finishedAt:null,`;
  if(src.includes(oldCreate)) src=src.replace(oldCreate,newCreate);

  const oldRecover=`    const todayEventId=\`flying-now:${hobartDay()}\`;\n    const q=await p.query(\`SELECT user_id,event_id,username,event_name,event_start,attendance_ms,active,updated_at\n      FROM passport_registrations\n      WHERE user_id=$1 AND event_id=$2\n      ORDER BY updated_at DESC LIMIT 1\`,[id,todayEventId]);`;
  const newRecover=`    const day=hobartDay();\n    const q=await p.query(\`SELECT user_id,event_id,username,event_name,event_start,attendance_ms,active,updated_at\n      FROM passport_registrations\n      WHERE user_id=$1 AND active=TRUE AND (event_id LIKE $2 OR event_id=$3)\n      ORDER BY updated_at DESC LIMIT 1\`,[id,\`flying-now:${day}:%\`,\`flying-now:${day}\`]);`;
  if(src.includes(oldRecover)) src=src.replace(oldRecover,newRecover);

  await fs.writeFile(file,src);
}

async function patchLegacyDailyStamp(){
  const file='server-fixed-wrapper.js';
  let src=await fs.readFile(file,'utf8');
  const oldBlock=`    let stampAwarded = false;\n    let bonusReason = '';\n\n    if (!voiceConfigured) {\n      bonusReason = 'Bonus stamp verification is waiting for the Flying Now voice/comms channel to be configured.';\n    } else if (!voiceEligible) {\n      bonusReason = 'Join the approved Flying Now voice/comms channel before posting to earn the bonus stamp.';\n    } else {\n      const day = new Date().toISOString().slice(0,10);\n      const eventId = \`flying-now:${day}\`;\n      const exists = await flyingNowStampExists(user.id, eventId);\n      if (exists) {\n        bonusReason = 'Your Flying Now bonus stamp for today is already in your Passport.';\n      } else {\n        const start = new Date().toISOString();\n        await saveFlyingNowStamp({\n          userId:user.id,eventId,username:user.username,\n          eventName:\`Flying Now · ${departure} to ${destination} · ${aircraft}\`,\n          start,channelId:currentVoice,departure,destination,aircraft\n        });\n        stampAwarded = true;\n      }\n    }`;
  const newBlock=`    const stampAwarded = false;\n    const bonusReason = !voiceConfigured\n      ? 'Journey Points verification is waiting for the Flying Now voice/comms channel to be configured.'\n      : !voiceEligible\n        ? 'Join the approved Flying Now voice/comms channel to start this flight at zero and earn Journey Points.'\n        : 'Flight posted. Attendance starts at zero for this flight and is saved independently.';`;
  if(src.includes(oldBlock)) src=src.replace(oldBlock,newBlock);
  await fs.writeFile(file,src);
}

await patchLifecycle();
await patchLegacyDailyStamp();
