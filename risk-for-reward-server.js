import crypto from 'node:crypto';
import express from 'express';
import {Pool} from 'pg';

const db=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3}):null;
const DURATION_MS=10000;
const questions=[
  ['On an ILS approach, what does the glideslope primarily provide?',['Lateral runway alignment','Vertical descent guidance','Distance to the threshold','Missed approach altitude'],1],
  ['What does a standard-rate turn change heading by in one minute?',['90 degrees','120 degrees','180 degrees','360 degrees'],2],
  ['Which pressure setting makes an altimeter indicate height above mean sea level?',['QFE','QNH','Standard pressure only','Density altitude'],1],
  ['On a magnetic compass in the Northern Hemisphere, what typically occurs when accelerating on an east or west heading?',['Indication turns north','Indication turns south','Indication remains unaffected','Indication reverses by 180 degrees'],0],
  ['In a METAR, what does BKN indicate?',['1–2 oktas cloud','3–4 oktas cloud','5–7 oktas cloud','8 oktas cloud'],2],
  ['At a constant true airspeed, what happens to groundspeed when a direct headwind increases?',['Increases','Decreases','Remains constant','Becomes equal to indicated airspeed'],1],
  ['What is the primary purpose of a pitot tube?',['Measure static pressure','Measure impact (total) pressure','Measure engine oil pressure','Measure cabin pressure'],1],
  ['What is the usual transponder code for a general aviation emergency?',['7000','7500','7600','7700'],3],
  ['Which V-speed denotes the maximum speed for operating landing gear?',['VLE','VLO','VFE','VA'],1],
  ['Which instrument uses both pitot and static pressure?',['Altimeter','Vertical speed indicator','Airspeed indicator','Turn coordinator'],2],
  ['What does a published DA mean on a precision approach?',['Decision altitude','Departure altitude','Descent angle','Diversion altitude'],0],
  ['Which type of drag increases significantly as induced drag falls with increasing airspeed?',['Profile/parasitic drag','Wave drag only','Induced drag','Lift-dependent drag'],0],
  ['On an RNAV approach, what does LNAV provide?',['Lateral guidance','Vertical guidance only','Radar vectors','Autoland capability'],0],
  ['What is the main difference between indicated and true airspeed at high altitude?',['True airspeed generally exceeds indicated airspeed','They are always equal','Indicated always exceeds true','Indicated becomes groundspeed'],0],
  ['What does the term coffin corner describe?',['A narrow speed margin between stall and high-speed buffet','An airport pattern entry','A rejected takeoff zone','A type of holding pattern'],0],
  ['What is the purpose of a yaw damper?',['Reduce dutch-roll oscillation','Maintain indicated airspeed','Control pitch trim','Increase flap lift'],0],
  ['Which chart feature defines the lowest altitude providing obstacle clearance within a specified sector?',['MSA','VNE','TORA','QFE'],0],
  ['What is the speed of a standard-rate turn?',['1 degree per second','2 degrees per second','3 degrees per second','6 degrees per second'],2],
  ['In aviation, what is the meaning of TEMPO in a TAF?',['Temporary fluctuations in forecast conditions','Permanent change until end of forecast','Weather observed at issuance','No significant weather expected'],0],
  ['What causes an aircraft to experience a higher stall speed in a steep level turn?',['Increased load factor','Reduced engine RPM alone','Higher pressure altitude alone','Decreased bank angle'],0],
  ['What does RVR measure?',['Runway visual range','Radar vector radius','Required vertical rate','Runway velocity reference'],0],
  ['Which navigation aid provides distance information rather than bearing alone?',['DME','ADF','VOR without DME','Localizer'],0],
  ['When using a VOR, what does a TO indication mean?',['Selected course leads toward the station','Aircraft nose points at station','Aircraft is over station','Receiver is tuned to an ILS'],0],
  ['Which altitude is referenced to standard pressure 1013.25 hPa?',['Pressure altitude','Density altitude','Absolute altitude','True altitude'],0],
  ['What is the primary concern with wind shear close to the runway?',['Rapid changes in airspeed and flight path','Steady improvement in visibility','Slow changes in cabin pressure','Loss of magnetic compass only'],0],
  ['What does the approach category depend on for aircraft approach minima?',['Vat, speed at threshold','Maximum takeoff weight only','Number of engines','Cruise Mach number'],0],
  ['In a turbine engine, what does EGT measure?',['Exhaust gas temperature','Engine gearbox torque','Emergency generator time','Elevator gradient trim'],0],
  ['What does a squawk of 7600 indicate?',['Radio communications failure','Unlawful interference','General emergency','VFR in Europe'],0],
  ['What is the primary function of a winglet?',['Reduce induced drag by influencing wingtip vortices','Increase maximum fuel pressure','Replace ailerons','Eliminate all wake turbulence'],0],
  ['What is the meaning of an ISA temperature deviation of +10°C?',['Air is 10°C warmer than standard at that altitude','Air is 10°C colder than standard','Pressure is 10 hPa above QNH','Wind is 10 knots above forecast'],0]
];
const utcDay=()=>new Date().toISOString().slice(0,10);
const dayQuestion=day=>questions[Math.floor(Date.parse(day+'T00:00:00Z')/86400000)%questions.length];
const tomorrow=day=>new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString();
let schemaPromise;
function schema(){
  if(!db)throw Error('Trivia database unavailable');
  if(!schemaPromise)schemaPromise=db.query(`CREATE TABLE IF NOT EXISTS ms32_trivia_attempts(
    day date NOT NULL, user_id text NOT NULL, username text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT NOW(),
    answered_at timestamptz, choice integer, correct boolean,
    jp_delta integer, PRIMARY KEY(day,user_id)
  )`).catch(e=>{schemaPromise=null;throw e});
  return schemaPromise;
}
function auth(req){
  if(req.session?.user?.id&&req.session.user.member)return {id:String(req.session.user.id),username:String(req.session.user.username||'Pilot')};
  try{
    const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ms32_auth='));
    const secret=process.env.SESSION_SECRET;
    if(!cookie||!secret)return null;
    const [p,s]=decodeURIComponent(cookie.slice(10)).split('.');
    const expected=crypto.createHmac('sha256',secret).update(p).digest('base64url');
    if(!s||Buffer.byteLength(s)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;
    const u=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));
    return u.id&&u.member&&Number(u.exp)>Date.now()?{id:String(u.id),username:String(u.username||'Pilot')}:null;
  }catch{return null}
}
async function basePoints(client,id){
  const q=await client.query(`SELECT attendance_ms FROM passport_registrations WHERE user_id=$1 AND (verified=TRUE OR attendance_ms>=1800000)`,[id]);
  return q.rows.reduce((total,r)=>{const m=Math.floor(Number(r.attendance_ms||0)/60000);return total+(m>=120?300:m>=60?200:m>=30?100:0)},0);
}
async function settle(id,day,choice){
  const c=await db.connect();
  try{
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[id]);
    const q=await c.query('SELECT * FROM ms32_trivia_attempts WHERE day=$1 AND user_id=$2 FOR UPDATE',[day,id]);
    if(!q.rows.length){await c.query('COMMIT');return null;}
    const row=q.rows[0];
    if(row.jp_delta!==null){await c.query('COMMIT');return row;}
    const expires=new Date(row.started_at).getTime()+DURATION_MS;
    const now=Date.now();
    if(choice!==null&&now>expires){choice=null;}
    if(choice===null&&now<expires){await c.query('COMMIT');return row;}
    const correct=choice!==null&&choice===dayQuestion(day)[2];
    let delta=200;
    if(!correct){
      const base=await basePoints(c,id);
      const past=await c.query('SELECT COALESCE(SUM(jp_delta),0)::int AS points FROM ms32_trivia_attempts WHERE user_id=$1 AND jp_delta IS NOT NULL',[id]);
      delta=-Math.min(200,Math.max(0,base+Number(past.rows[0].points)));
    }
    const updated=await c.query('UPDATE ms32_trivia_attempts SET answered_at=NOW(),choice=$3,correct=$4,jp_delta=$5 WHERE day=$1 AND user_id=$2 RETURNING *',[day,id,choice,correct,delta]);
    await c.query('COMMIT');return updated.rows[0];
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
async function status(req,res){
  const user=auth(req);if(!user)return res.status(401).json({error:'Sign in first'});
  res.set('Cache-Control','no-store');
  try{
    await schema();
    const day=utcDay();
    const q=await db.query('SELECT * FROM ms32_trivia_attempts WHERE day=$1 AND user_id=$2',[day,user.id]);
    let attempt=q.rows[0]||null;
    if(attempt&&attempt.jp_delta===null&&Date.now()>=new Date(attempt.started_at).getTime()+DURATION_MS)attempt=await settle(user.id,day,null);
    const prev=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
    const stats=await db.query('SELECT COUNT(*)::int AS attempts,COUNT(*) FILTER(WHERE correct=TRUE)::int AS correct FROM ms32_trivia_attempts WHERE day=$1 AND jp_delta IS NOT NULL',[prev]);
    const current=attempt?{completed:attempt.jp_delta!==null,startedAt:new Date(attempt.started_at).toISOString(),expiresAt:new Date(new Date(attempt.started_at).getTime()+DURATION_MS).toISOString(),reward:attempt.jp_delta,correct:attempt.correct}:null;
    const [question,options]=dayQuestion(day);
    res.json({day,nextReset:tomorrow(day),attempt:current,question:attempt?.jp_delta===null?{text:question,options}:null,previous:{day:prev,...stats.rows[0]}});
  }catch(e){console.error('Trivia status:',e);res.status(503).json({error:'Trivia temporarily unavailable'});}
}
async function start(req,res){
  const user=auth(req);if(!user)return res.status(401).json({error:'Sign in first'});
  res.set('Cache-Control','no-store');
  try{
    await schema();const day=utcDay();
    const q=await db.query('INSERT INTO ms32_trivia_attempts(day,user_id,username) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *',[day,user.id,user.username]);
    if(!q.rows.length)return res.status(409).json({error:'You have already started today’s challenge'});
    const row=q.rows[0], [text,options]=dayQuestion(day);
    res.json({day,question:{text,options},expiresAt:new Date(new Date(row.started_at).getTime()+DURATION_MS).toISOString()});
  }catch(e){console.error('Trivia start:',e);res.status(503).json({error:'Cannot start trivia right now'});}
}
async function answer(req,res){
  const user=auth(req);if(!user)return res.status(401).json({error:'Sign in first'});
  res.set('Cache-Control','no-store');
  try{
    await schema();
    const day=String(req.body?.day||'');
    const choice=Number(req.body?.choice);
    const isToday=day===utcDay();
    const isYesterday=Date.parse(day+'T00:00:00Z')===Date.parse(utcDay()+'T00:00:00Z')-86400000;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||(!isToday&&!isYesterday)||!Number.isInteger(choice)||choice<0||choice>3)return res.status(400).json({error:'Invalid or expired question'});
    const row=await settle(user.id,day,choice);
    if(!row)return res.status(409).json({error:'Start the challenge first'});
    res.json({completed:row.jp_delta!==null,correct:row.correct,reward:row.jp_delta,correctAnswer:row.jp_delta!==null?dayQuestion(day)[2]:null});
  }catch(e){console.error('Trivia answer:',e);res.status(503).json({error:'Unable to record answer'});}
}
const get=express.application.get,post=express.application.post,installed=new WeakSet();
function install(app){
  if(installed.has(app))return;installed.add(app);
  get.call(app,'/api/trivia/today',status);
  post.call(app,'/api/trivia/start',start);
  post.call(app,'/api/trivia/answer',answer);
}
express.application.get=function(path,...handlers){install(this);return get.call(this,path,...handlers)};
express.application.post=function(path,...handlers){install(this);return post.call(this,path,...handlers)};

void schema().catch(e=>console.error('Trivia database setup failed:',e?.message||e));
