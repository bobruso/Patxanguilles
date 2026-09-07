const FIT_CDN='https://esm.sh/fit-file-parser@5.0.2';
export const GRID_X=42,GRID_Y=27;
export const DEFAULT_SPRINT_KMH=18;
export const DEFAULT_HIGH_INTENSITY_KMH=13;
const MAX_HUMAN_KMH=45;
let FitParserCtor=null;

async function loadFitParser(){if(FitParserCtor)return FitParserCtor;const mod=await import(FIT_CDN);FitParserCtor=mod.default;return FitParserCtor}
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function toMs(ts){if(ts instanceof Date)return ts.getTime();const d=new Date(ts);return Number.isFinite(d.getTime())?d.getTime():null}
function haversine(a,b,c,d){const R=6371000,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,q=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(q)))}
function smooth(values,win=5){const half=Math.floor(win/2);return values.map((_,i)=>{let s=0,n=0;for(let j=Math.max(0,i-half);j<=Math.min(values.length-1,i+half);j++){if(Number.isFinite(values[j])){s+=values[j];n++}}return n?s/n:0})}
function std(values){if(values.length<2)return 0;const m=mean(values);return Math.sqrt(mean(values.map(v=>(v-m)**2)))}

function pcaTransform(points){
  if(points.length<3)return null;
  const ml=mean(points.map(p=>p.lat)),mn=mean(points.map(p=>p.lon)),r=Math.PI/180,R=6371000,c=Math.cos(ml*r);
  const loc=points.map(p=>({x:(p.lon-mn)*r*c*R,y:(p.lat-ml)*r*R}));
  let xx=0,yy=0,xy=0;for(const p of loc){xx+=p.x*p.x;yy+=p.y*p.y;xy+=p.x*p.y}xx/=loc.length;yy/=loc.length;xy/=loc.length;
  const tr=xx+yy,det=xx*yy-xy*xy,disc=Math.sqrt(Math.max(0,(tr/2)**2-det)),l1=tr/2+disc;
  let ax,ay;if(Math.abs(xy)>1e-9){ax=l1-yy;ay=xy}else if(xx>=yy){ax=1;ay=0}else{ax=0;ay=1}
  const norm=Math.hypot(ax,ay)||1;ax/=norm;ay/=norm;const bx=-ay,by=ax;
  const uv=loc.map(p=>({u:p.x*ax+p.y*ay,v:p.x*bx+p.y*by})),us=uv.map(p=>p.u),vs=uv.map(p=>p.v),minU=Math.min(...us),maxU=Math.max(...us),minV=Math.min(...vs),maxV=Math.max(...vs),su=maxU-minU||1,sv=maxV-minV||1;
  return{project:(lat,lon)=>{const x=(lon-mn)*r*c*R,y=(lat-ml)*r*R;return{u:(x*ax+y*ay-minU)/su,v:(x*bx+y*by-minV)/sv}},orientationReliable:false};
}

function detectRuns(samples,thresholdKmh,minDuration=1){const runs=[];let cur=null;for(const s of samples){if(s.speedKmh>=thresholdKmh){if(!cur)cur={startSec:s.tSec,endSec:s.tSec,maxSpeedKmh:s.speedKmh,distanceM:0};cur.endSec=s.tSec;cur.maxSpeedKmh=Math.max(cur.maxSpeedKmh,s.speedKmh);cur.distanceM+=s.dInc||0}else if(cur){cur.durationS=cur.endSec-cur.startSec;if(cur.durationS>=minDuration)runs.push(cur);cur=null}}if(cur){cur.durationS=cur.endSec-cur.startSec;if(cur.durationS>=minDuration)runs.push(cur)}return runs}

function downsampleSeries(samples,key,maxPoints=240){const src=samples.filter(s=>Number.isFinite(s[key]));if(!src.length)return[];const step=Math.max(1,Math.ceil(src.length/maxPoints));return src.filter((_,i)=>i%step===0||i===src.length-1).map(s=>({tSec:+s.tSec.toFixed(1),value:+s[key].toFixed(2)}))}

function buildPosition(samples,{attackDirection=1}={}){
  const gps=samples.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));
  const tf=pcaTransform(gps);if(!tf)return null;
  const grid=Array.from({length:GRID_Y},()=>Array(GRID_X).fill(0)),zoneGrid=Array.from({length:3},()=>Array(6).fill(0)),pts=[];
  const thirds=[0,0,0],sides=[0,0,0];let totalTime=0;
  for(const s of gps){let{u,v}=tf.project(s.lat,s.lon);if(!Number.isFinite(u)||!Number.isFinite(v))continue;u=clamp(u,0,1);v=clamp(v,0,1);if(attackDirection<0)u=1-u;const weight=s.dt||.5;totalTime+=weight;
    grid[Math.min(GRID_Y-1,Math.floor(v*GRID_Y))][Math.min(GRID_X-1,Math.floor(u*GRID_X))]+=weight;
    zoneGrid[Math.min(2,Math.floor(v*3))][Math.min(5,Math.floor(u*6))]+=weight;
    thirds[Math.min(2,Math.floor(u*3))]+=weight;sides[Math.min(2,Math.floor(v*3))]+=weight;
    pts.push({u,v,tSec:s.tSec,dt:weight,speedKmh:s.speedKmh});
  }
  if(!pts.length)return null;
  const avgPosition={u:mean(pts.map(p=>p.u)),v:mean(pts.map(p=>p.v))};
  const step=Math.max(1,Math.ceil(pts.length/240)),trail=pts.filter((_,i)=>i%step===0||i===pts.length-1).map(p=>({u:+p.u.toFixed(4),v:+p.v.toFixed(4),tSec:+p.tSec.toFixed(1)}));
  return{grid,zoneGrid,avgPosition,trail,points:pts,thirds:thirds.map(v=>v/(totalTime||1)),sides:sides.map(v=>v/(totalTime||1)),orientationReliable:tf.orientationReliable};
}

function roleEstimate(pos,ctx){
  if(!pos)return null;
  const def=pos.thirds[0]||0,mid=pos.thirds[1]||0,att=pos.thirds[2]||0,left=pos.sides[0]||0,center=pos.sides[1]||0,right=pos.sides[2]||0,wide=Math.max(left,right),u=pos.points.map(p=>p.u),v=pos.points.map(p=>p.v),spreadU=std(u),spreadV=std(v),roam=(spreadU+spreadV)/2,sprintRate=ctx.durationS?ctx.sprints.length/(ctx.durationS/60):0;
  const roles=[
    {role:'Delantero centro',score:att*3.3+center*1.3+sprintRate*.35+(1-def)*.5},
    {role:'Extremo',score:att*2.2+wide*2.4+sprintRate*.55+spreadU*.8},
    {role:'Centrocampista',score:mid*3.1+roam*2.4+(1-Math.abs(att-def))*.7},
    {role:'Interior / mediapunta',score:mid*1.8+att*2+center*.8+roam*1.4},
    {role:'Lateral / carrilero',score:def*1.5+mid*1.5+wide*2.3+roam*1.2},
    {role:'Defensa central',score:def*3.2+center*1.5+(1-att)*.8+(1-Math.min(1,spreadU*2))*.5}
  ].sort((a,b)=>b.score-a.score);
  const total=roles.reduce((s,r)=>s+Math.max(0,r.score),0)||1,top=roles[0];
  const baseConfidence=Math.round(100*top.score/total),confidence=pos.orientationReliable?baseConfidence:Math.min(62,baseConfidence);
  const notes=[];if(att>.45)notes.push('Gran parte del tiempo aparece en campo rival.');else if(def>.45)notes.push('Tendencia clara a ocupar zonas defensivas.');else notes.push('Ocupación bastante repartida alrededor del centro del campo.');if(wide>.48)notes.push('Perfil muy abierto hacia banda.');if(roam>.22)notes.push('Amplio radio de acción.');if(ctx.sprints.length>=8)notes.push('Volumen alto de sprints para fútbol 7.');if(!pos.orientationReliable)notes.push('Posición provisional: mejorará al calibrar las cuatro esquinas del campo.');
  return{top:top.role,confidence,ranked:roles.slice(0,4).map(r=>({role:r.role,score:+r.score.toFixed(2)})),notes,avgU:+pos.avgPosition.u.toFixed(3),avgV:+pos.avgPosition.v.toFixed(3),spreadU:+spreadU.toFixed(3),spreadV:+spreadV.toFixed(3),orientationReliable:pos.orientationReliable};
}

function speedZones(samples){const defs=[['Caminar',0,7],['Trote',7,14.4],['Carrera',14.4,19.8],['Alta velocidad',19.8,25.2],['Sprint',25.2,Infinity]].map(([name,min,max])=>({name,min,max,distanceM:0,timeS:0}));for(const s of samples){const z=defs.find(z=>s.speedKmh>=z.min&&s.speedKmh<z.max)||defs.at(-1);z.distanceM+=s.dInc||0;z.timeS+=s.dt||0}return defs.map(z=>({...z,distanceM:+z.distanceM.toFixed(1),timeS:+z.timeS.toFixed(1)}))}
function hrZones(samples,referenceMax){if(!referenceMax)return[];const defs=[[1,.5,.6],[2,.6,.7],[3,.7,.8],[4,.8,.9],[5,.9,1.2]].map(([zone,min,max])=>({zone,name:'Zona '+zone,minPct:min,maxPct:max,lowBpm:Math.round(referenceMax*min),highBpm:Math.round(referenceMax*Math.min(1,max)),timeS:0}));for(const s of samples){if(!(s.hr>0))continue;const p=s.hr/referenceMax,z=defs.find(z=>p>=z.minPct&&p<z.maxPct)||defs.at(-1);z.timeS+=s.dt||0}return defs.map(z=>({...z,timeS:+z.timeS.toFixed(1)}))}
function accelEvents(samples){const sm=smooth(samples.map(s=>s.speedKmh/3.6),5),events={accelerations:[],decelerations:[]};for(let i=1;i<samples.length;i++){const dt=samples[i].dt;if(!(dt>0&&dt<=3))continue;const a=(sm[i]-sm[i-1])/dt;if(a>=2.2)events.accelerations.push({tSec:+samples[i].tSec.toFixed(1),ms2:+a.toFixed(2)});if(a<=-2.2)events.decelerations.push({tSec:+samples[i].tSec.toFixed(1),ms2:+a.toFixed(2)})}events.accelerations=events.accelerations.slice(0,80);events.decelerations=events.decelerations.slice(0,80);return events}
function fatigue(samples,highIntensityKmh){if(!samples.length)return null;const split=samples.at(-1).tSec/2,calc=a=>{const timeS=a.reduce((s,x)=>s+(x.dt||0),0),distanceM=a.reduce((s,x)=>s+(x.dInc||0),0),hiDistanceM=a.filter(x=>x.speedKmh>=highIntensityKmh).reduce((s,x)=>s+(x.dInc||0),0);return{timeS:+timeS.toFixed(1),distanceM:+distanceM.toFixed(1),hiDistanceM:+hiDistanceM.toFixed(1),distancePerMin:timeS?+(distanceM/(timeS/60)).toFixed(1):0}};const first=calc(samples.filter(s=>s.tSec<=split)),second=calc(samples.filter(s=>s.tSec>split));return{first,second,distanceRateChangePct:first.distancePerMin?+((second.distancePerMin-first.distancePerMin)/first.distancePerMin*100).toFixed(1):0,provisional:true}}

export async function analyzeFit(buf,options={}){
  const sprintKmh=Number(options.sprintKmh)||DEFAULT_SPRINT_KMH,highIntensityKmh=Number(options.highIntensityKmh)||DEFAULT_HIGH_INTENSITY_KMH,attackDirection=Number(options.attackDirection)||1;
  const FitParser=await loadFitParser(),parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),data=await parser.parseAsync(buf),records=(data.records||[]).filter(r=>toMs(r.timestamp)!=null).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp));if(!records.length)throw new Error('El FIT no contiene registros con tiempo.');
  const t0=toMs(records[0].timestamp),samples=records.map((r,i)=>({tSec:(toMs(r.timestamp)-t0)/1000,dt:i?Math.max(0,Math.min(8,(toMs(r.timestamp)-toMs(records[i-1].timestamp))/1000)):0,lat:num(r.position_lat),lon:num(r.position_long),speedKmh:num(r.enhanced_speed??r.speed),distance:num(r.distance),hr:num(r.heart_rate),cadence:num(r.cadence)}));
  for(const s of samples)if(s.speedKmh==null||s.speedKmh<0||s.speedKmh>MAX_HUMAN_KMH)s.speedKmh=null;
  for(let i=1;i<samples.length;i++){const s=samples[i],p=samples[i-1];if(s.speedKmh==null&&s.lat!=null&&s.lon!=null&&p.lat!=null&&p.lon!=null&&s.dt>0){const v=haversine(p.lat,p.lon,s.lat,s.lon)/s.dt*3.6;if(v<=MAX_HUMAN_KMH)s.speedKmh=v}}
  for(const s of samples)if(s.speedKmh==null)s.speedKmh=0;samples[0].dInc=0;
  for(let i=1;i<samples.length;i++){const s=samples[i],p=samples[i-1];let d=null;if(s.distance!=null&&p.distance!=null){d=s.distance-p.distance;if(d<0||d>60)d=null}if(d==null&&s.dt>0)d=s.speedKmh/3.6*s.dt;if(d==null&&s.lat!=null&&p.lat!=null)d=haversine(p.lat,p.lon,s.lat,s.lon);s.dInc=Math.max(0,Number.isFinite(d)?d:0)}
  const durationS=samples.at(-1).tSec,moving=samples.filter(s=>s.speedKmh>2.16),movingTimeS=moving.reduce((a,s)=>a+s.dt,0),distanceM=samples.reduce((a,s)=>a+s.dInc,0),smoothed=smooth(samples.map(s=>s.speedKmh),5),topSpeedKmh=Math.max(...smoothed),rawTopSpeedKmh=Math.max(...samples.map(s=>s.speedKmh)),avgSpeedKmh=moving.length?mean(moving.map(s=>s.speedKmh)):0;
  const sprints=detectRuns(samples,sprintKmh),hiRuns=detectRuns(samples,highIntensityKmh),highIntensityDistanceM=samples.filter(s=>s.speedKmh>=highIntensityKmh).reduce((a,s)=>a+s.dInc,0),hrs=samples.filter(s=>s.hr>0).map(s=>s.hr),pos=buildPosition(samples,{attackDirection}),refMax=Number(options.maxHr)||((Number(options.age)>0)?Math.round(208-.7*Number(options.age)):null)|| (hrs.length?Math.max(...hrs):null),accels=accelEvents(samples),cadences=samples.filter(s=>s.cadence>0).map(s=>s.cadence);
  const role=roleEstimate(pos,{sprints,totalDistance:distanceM,durationS});
  const detail={
    positional:{thirds:pos?.thirds||[],sides:pos?.sides||[],role,orientationReliable:!!pos?.orientationReliable},
    speed:{zones:speedZones(samples),sprintThresholdKmh:sprintKmh,highIntensityThresholdKmh:highIntensityKmh,sprints:sprints.slice(0,50),highIntensityRuns:hiRuns.slice(0,80),rawTopSpeedKmh:+rawTopSpeedKmh.toFixed(2),accelerations:accels.accelerations,decelerations:accels.decelerations,speedSeries:downsampleSeries(samples,'speedKmh')},
    heartRate:{referenceMaxBpm:refMax,zones:hrZones(samples,refMax),series:downsampleSeries(samples,'hr')},
    workload:{distancePerMin:movingTimeS?+(distanceM/(movingTimeS/60)).toFixed(1):0,highIntensityDistancePerMin:movingTimeS?+(highIntensityDistanceM/(movingTimeS/60)).toFixed(1):0,fatigue:fatigue(samples,highIntensityKmh),avgCadence:cadences.length?+mean(cadences).toFixed(1):null}
  };
  return{sourceStartedAt:new Date(t0).toISOString(),durationS,movingTimeS,distanceM,topSpeedKmh,rawTopSpeedKmh,avgSpeedKmh,sprintCount:sprints.length,highIntensityDistanceM,avgHr:hrs.length?Math.round(mean(hrs)):null,maxHr:hrs.length?Math.max(...hrs):null,sampleCount:samples.length,hasGps:!!pos,hasHr:hrs.length>0,heatmapGrid:pos?.grid||[],zoneGrid:pos?.zoneGrid||[],avgPosition:pos?.avgPosition||null,trail:pos?.trail||[],speedZones:detail.speed.zones,analysisDetail:detail};
}

export function toSupabaseRow(matchId,playerId,a){return{match_id:matchId,player_id:playerId,source_format:'fit',source_started_at:a.sourceStartedAt,duration_s:a.durationS,moving_time_s:a.movingTimeS,distance_m:a.distanceM,top_speed_kmh:a.topSpeedKmh,avg_speed_kmh:a.avgSpeedKmh,sprint_count:a.sprintCount,high_intensity_distance_m:a.highIntensityDistanceM,avg_hr:a.avgHr,max_hr:a.maxHr,sample_count:a.sampleCount,has_gps:a.hasGps,has_hr:a.hasHr,heatmap_grid:a.heatmapGrid,zone_grid:a.zoneGrid,avg_position:a.avgPosition,trail:a.trail,speed_zones:a.speedZones,analysis_detail:a.analysisDetail||{},analysis_version:2,updated_at:new Date().toISOString()}}

export function fromSupabaseRow(row){if(!row)return null;return{sourceStartedAt:row.source_started_at,durationS:Number(row.duration_s)||0,movingTimeS:Number(row.moving_time_s)||0,distanceM:Number(row.distance_m)||0,topSpeedKmh:Number(row.top_speed_kmh)||0,avgSpeedKmh:Number(row.avg_speed_kmh)||0,sprintCount:Number(row.sprint_count)||0,highIntensityDistanceM:Number(row.high_intensity_distance_m)||0,avgHr:row.avg_hr==null?null:Number(row.avg_hr),maxHr:row.max_hr==null?null:Number(row.max_hr),sampleCount:Number(row.sample_count)||0,hasGps:!!row.has_gps,hasHr:!!row.has_hr,heatmapGrid:row.heatmap_grid||[],zoneGrid:row.zone_grid||[],avgPosition:row.avg_position||null,trail:row.trail||[],speedZones:row.speed_zones||[],analysisDetail:row.analysis_detail||{}}}
