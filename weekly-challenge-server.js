import crypto from 'node:crypto';
import {Pool} from 'pg';

const CHANNEL='1572096423581851779';
const GUILD='838642528315506728';
const LIMIT=30*60*1000;
const db=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2}):null;
const routes=[
  {title:'Southern Alps Scenic Run',from:'NZQN',to:'NZMF',aircraft:'Single-engine GA or turboprop',brief:'Follow the valleys from Queenstown to Milford Sound. Navigate the mountains carefully and make a safe landing.'},
  {title:'Tasmanian Wilderness Explorer',from:'YMHB',to:'YSMI',aircraft:'General aviation aircraft',brief:'Fly north from Hobart to Smithton, enjoying Tasmania’s varied coast and rugged interior.'},
  {title:'Alaskan Coastal Adventure',from:'PAJN',to:'PASI',aircraft:'Turboprop or bush aircraft',brief:'Explore Alaska’s island coastline between Juneau and Sitka, choosing a safe route for the conditions.'},
  {title:'Scottish Highlands Hop',from:'EGPE',to:'EGPR',aircraft:'General aviation aircraft',brief:'Navigate from Inverness to Barra and enjoy the unique coastal approach.'},
  {title:'Norwegian Fjord Flight',from:'ENBR',to:'ENSO',aircraft:'General aviation aircraft',brief:'Enjoy a scenic flight across western Norway from Bergen to Stord.'},
  {title:'Rocky Mountain Crossing',from:'KASE',to:'KEGE',aircraft:'High-performance GA aircraft',brief:'Plan a safe high-altitude mountain flight between Aspen and Eagle County.'},
  {title:'Australian Outback Run',from:'YBAS',to:'YAYE',aircraft:'General aviation aircraft',brief:'Fly from Alice Springs to Ayers Rock and take in the red centre.'},
  {title:'Icelandic Coast Explorer',from:'BIKF',to:'BIAR',aircraft:'General aviation or turboprop',brief:'Cross Iceland from Keflavik to Akureyri, selecting a scenic route around the terrain.'}
];
function friday(){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Hobart',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const day=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));
  const offset=({Sun:2,Mon:3,Tue:4,Wed:5,Thu:6,Fri:0,Sat:1})[parts.weekday];
  day.setUTCDate(day.getUTCDate()-offset);
  return day.toISOString().slice(0,10);
}
function challenge(){
  const week=friday();
  const index=Math.floor((Date.parse(week+'T00:00:00Z')-Date.parse('2026-11-13T00:00:00Z'))/(7*86400000));
  return {week,points:500,channelId:CHANNEL,guildId:GUILD,requiredMinutes:30,...routes[((index%routes.length)+routes.length)%routes.length]};
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
let schemaPromise;
function schema(){
  if(!db)throw Error('Weekly challenge database unavailable');
  if(!schemaPromise)schemaPromise=db.query(`CREATE TABLE IF NOT EXISTS ms32_weekly_challenges(
    week date NOT NULL,user_id text NOT NULL,username text NOT NULL,
    registered_at timestamptz NOT NULL DEFAULT NOW(),attendance_ms bigint NOT NULL DEFAULT 0,
    active_since timestamptz,completed_at timestamptz,cancelled boolean NOT NULL DEFAULT false,
    PRIMARY KEY(week,user_id)
  )`).catch(e=>{schemaPromise=null;throw e});
  return schemaPromise;
}
function view(row,inVoice){
  if(!row)return {registered:false,attendanceMinutes:0,completed:false,inVoice:false,cancelled:false};
  const completed=!!row.completed_at;
  const ms=Number(row.attendance_ms||0)+(row.active_since&&!completed?Math.max(0,Date.now()-new Date(row.active_since).getTime()):0);
  return {registered:!row.cancelled,attendanceMinutes:Math.min(30,Math.floor(ms/60000)),completed,inVoice:!row.cancelled&&!completed&&inVoice,cancelled:!!row.cancelled,pointsAwarded:completed?500:0};
}
export function installWeeklyChallenge(app,getVoice){
  let sweeping=false;
  async function sweep(){
    if(sweeping||!db)return;
    sweeping=true;
    try{
      await schema();
      const c=challenge();
      const q=await db.query('SELECT * FROM ms32_weekly_challenges WHERE week=$1 AND cancelled=false AND completed_at IS NULL',[c.week]);
      for(const row of q.rows){
        const inVoice=getVoice().get(row.user_id)===CHANNEL;
        if(inVoice&&!row.active_since){
          await db.query('UPDATE ms32_weekly_challenges SET active_since=NOW() WHERE week=$1 AND user_id=$2 AND cancelled=false AND completed_at IS NULL AND active_since IS NULL',[c.week,row.user_id]);
        }else if(!inVoice&&row.active_since){
          await db.query('UPDATE ms32_weekly_challenges SET attendance_ms=attendance_ms+GREATEST(0,EXTRACT(EPOCH FROM (NOW()-active_since))*1000)::bigint,active_since=NULL WHERE week=$1 AND user_id=$2 AND cancelled=false AND completed_at IS NULL AND active_since IS NOT NULL',[c.week,row.user_id]);
        }
        await db.query(`UPDATE ms32_weekly_challenges SET
          attendance_ms=attendance_ms+CASE WHEN active_since IS NOT NULL THEN GREATEST(0,EXTRACT(EPOCH FROM (NOW()-active_since))*1000)::bigint ELSE 0 END,
          active_since=NULL,completed_at=NOW()
          WHERE week=$1 AND user_id=$2 AND cancelled=false AND completed_at IS NULL
          AND attendance_ms+CASE WHEN active_since IS NOT NULL THEN GREATEST(0,EXTRACT(EPOCH FROM (NOW()-active_since))*1000)::bigint ELSE 0 END >= $3`,[c.week,row.user_id,LIMIT]);
      }
    }catch(e){console.error('Weekly challenge attendance sweep:',e.message)}finally{sweeping=false}
  }
  // On restart, never count server downtime as Discord attendance.
  (async()=>{try{await schema();await db.query('UPDATE ms32_weekly_challenges SET active_since=NULL WHERE active_since IS NOT NULL AND completed_at IS NULL')}catch(e){console.error('Weekly challenge startup:',e.message)}})();
  setInterval(sweep,10000);
  const respond=(fn)=>async(req,res)=>{
    const user=auth(req);if(!user)return res.status(401).json({error:'Sign in with Discord first'});
    res.set('Cache-Control','no-store');
    try{await schema();await sweep();await fn(req,res,user)}catch(e){console.error('Weekly challenge request:',e.message);res.status(503).json({error:'Weekly challenge temporarily unavailable'})}
  };
  app.get('/api/weekly-challenge',respond(async(req,res,user)=>{
    const c=challenge();
    const q=await db.query('SELECT * FROM ms32_weekly_challenges WHERE week=$1 AND user_id=$2',[c.week,user.id]);
    res.json({challenge:c,status:view(q.rows[0],getVoice().get(user.id)===CHANNEL)});
  }));
  app.post('/api/weekly-challenge/register',respond(async(req,res,user)=>{
    const c=challenge();
    await db.query(`INSERT INTO ms32_weekly_challenges(week,user_id,username) VALUES($1,$2,$3)
      ON CONFLICT(week,user_id) DO UPDATE SET username=EXCLUDED.username,cancelled=false,
      registered_at=CASE WHEN ms32_weekly_challenges.cancelled THEN NOW() ELSE ms32_weekly_challenges.registered_at END,
      attendance_ms=CASE WHEN ms32_weekly_challenges.cancelled THEN 0 ELSE ms32_weekly_challenges.attendance_ms END,
      active_since=CASE WHEN ms32_weekly_challenges.cancelled THEN NULL ELSE ms32_weekly_challenges.active_since END
      WHERE ms32_weekly_challenges.completed_at IS NULL`,[c.week,user.id,user.username]);
    await sweep();
    const q=await db.query('SELECT * FROM ms32_weekly_challenges WHERE week=$1 AND user_id=$2',[c.week,user.id]);
    res.json({challenge:c,status:view(q.rows[0],getVoice().get(user.id)===CHANNEL)});
  }));
  app.post('/api/weekly-challenge/cancel',respond(async(req,res,user)=>{
    const c=challenge();
    const q=await db.query(`UPDATE ms32_weekly_challenges SET cancelled=true,attendance_ms=0,active_since=NULL
      WHERE week=$1 AND user_id=$2 AND completed_at IS NULL RETURNING *`,[c.week,user.id]);
    if(!q.rows.length)return res.status(409).json({error:'No pending registration to cancel, or challenge already completed'});
    res.json({challenge:c,status:view(q.rows[0],false)});
  }));
}
