import crypto from 'node:crypto';
import express from 'express';
import {Pool} from 'pg';

const db=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2}):null;
// Installed before routes by risk-for-reward-server.js; schema is created on first trivia access.
const originalGet=express.application.get;
const installed=new WeakSet();

function parseCookies(header=''){
  const out={};
  for(const part of String(header).split(';')){
    const i=part.indexOf('='); if(i<0)continue;
    const k=part.slice(0,i).trim(),v=part.slice(i+1).trim(); if(k)out[k]=decodeURIComponent(v);
  }
  return out;
}
function auth(req){
  if(req.session?.user?.id&&req.session.user.member)return {id:String(req.session.user.id),username:String(req.session.user.username||'')};
  try{
    const secret=process.env.SESSION_SECRET;
    const raw=parseCookies(req.headers.cookie||'').ms32_auth;
    if(!secret||!raw)return null;
    const [payload,sig]=raw.split('.'); if(!payload||!sig)return null;
    const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
    const a=Buffer.from(sig),b=Buffer.from(expected); if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
    const user=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(!user?.id||!user?.member||Number(user.exp||0)<=Date.now())return null;
    return {id:String(user.id),username:String(user.username||'')};
  }catch{return null;}
}
function pointsForMs(ms){
  const minutes=Math.floor(Number(ms||0)/60000);
  if(minutes<30)return 0;
  if(minutes>=120)return 300;
  if(minutes>=60)return 200;
  return 100;
}
function ranked(rows,key){
  return rows.filter(x=>Number(x[key]||0)>0)
    .sort((a,b)=>Number(b[key]||0)-Number(a[key]||0)||String(a.username).localeCompare(String(b.username)))
    .map((x,i)=>({userId:x.userId,username:x.username,points:Number(x[key]||0),rank:i+1,overallPoints:x.overallPoints,communityPoints:x.communityPoints,spontaneousPoints:x.spontaneousPoints}));
}
async function build(){
  if(!db)return {boards:{overall:[],community:[],spontaneous:[]},users:[]};
  const q=await db.query(`SELECT user_id,username,event_id,attendance_ms,verified,updated_at
    FROM passport_registrations
    WHERE verified=TRUE OR attendance_ms >= 1800000
    ORDER BY updated_at ASC`);
  const byUser=new Map();
  for(const r of q.rows){
    const points=pointsForMs(r.attendance_ms); if(!points)continue;
    const id=String(r.user_id);
    const x=byUser.get(id)||{userId:id,username:r.username||`Discord ${id}`,communityPoints:0,spontaneousPoints:0,overallPoints:0};
    if(r.username)x.username=r.username;
    if(String(r.event_id||'').startsWith('flying-now:'))x.spontaneousPoints+=points; else x.communityPoints+=points;
    x.overallPoints=x.communityPoints+x.spontaneousPoints;
    byUser.set(id,x);
  }
  // Trivia adjustments are a separate permanent ledger. Flight attendance is untouched.
  const trivia=await db.query('SELECT user_id,COALESCE(SUM(jp_delta),0)::int AS delta FROM ms32_trivia_attempts WHERE jp_delta IS NOT NULL GROUP BY user_id');
  for(const r of trivia.rows){
    const id=String(r.user_id);
    const x=byUser.get(id)||{userId:id,username:`Discord ${id}`,communityPoints:0,spontaneousPoints:0,overallPoints:0};
    x.triviaPoints=Number(r.delta)||0;
    x.overallPoints=Math.max(0,x.communityPoints+x.spontaneousPoints+x.triviaPoints);
    byUser.set(id,x);
  }
  const users=[...byUser.values()];
  return {users,boards:{overall:ranked(users,'overallPoints'),community:ranked(users,'communityPoints'),spontaneous:ranked(users,'spontaneousPoints')}};
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  originalGet.call(app,'/api/journey-points-sources',async(req,res)=>{
    const user=auth(req); if(!user)return res.status(401).json({error:'Please sign in with Discord first'});
    res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    try{
      const data=await build();
      const mine=data.users.find(x=>x.userId===user.id)||{userId:user.id,username:user.username,overallPoints:0,communityPoints:0,spontaneousPoints:0};
      const me={...mine,
        overallRank:data.boards.overall.find(x=>x.userId===user.id)?.rank||null,
        communityRank:data.boards.community.find(x=>x.userId===user.id)?.rank||null,
        spontaneousRank:data.boards.spontaneous.find(x=>x.userId===user.id)?.rank||null};
      res.json({boards:{overall:data.boards.overall.slice(0,50),community:data.boards.community.slice(0,50),spontaneous:data.boards.spontaneous.slice(0,50)},me});
    }catch(e){console.error('Journey source leaderboard failed:',e?.message||e);res.status(500).json({error:'Leaderboard temporarily unavailable'});}
  });
}

express.application.get=function journeySourcesGet(path,...handlers){install(this);return originalGet.call(this,path,...handlers)};
