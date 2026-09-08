import{buildFieldTransform,chooseNearestPitch}from'./field-transform.js';

const FIT_CDN='https://esm.sh/fit-file-parser@5.0.2';
export const GRID_X=42,GRID_Y=27;
export const DEFAULT_HIGH_INTENSITY_KMH=13;
const ABSOLUTE_SPRINT_REFERENCE_KMH=18;
const MAX_HUMAN_KMH=45;
let FitParserCtor=null;

async function loadFitParser(){if(FitParserCtor)return FitParserCtor;const mod=await import(FIT_CDN);FitParserCtor=mod.default;return FitParserCtor}
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percentile=(values,q)=>{const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return 0;const p=clamp(q,0,1)*(a.length-1),lo=Math.floor(p),hi=Math.ceil(p),f=p-lo;return a[lo]*(1-f)+a[hi]*f};
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
  const uv=loc.map(p=>({u:p.x*ax+p.y*ay,v:p.x*bx+p.y*by})),us=uv.map(p=>p.u),vs=uv.map(p=>p.v);
  const lo=.015,hi=.985,minU=percentile(us,lo),maxU=percentile(us,hi),minV=percentile(vs,lo),maxV=percentile(vs,hi),su=maxU-minU||1,sv=maxV-minV||1;
  const rejected=uv.filter(p=>p.u<minU||p.u>maxU||p.v<minV||p.v>maxV).length,quality=Math.max(0,1-rejected/Math.max(1,uv.length));
  return{project:(lat,lon)=>{const x=(lon-mn)*r*c*R,y=(lat-ml)*r*R;return{u:(x*ax+y*ay-minU)/su,v:(x*bx+y*by-minV)/sv}},autoBounds:{trimLow:lo,trimHigh:hi,quality:+quality.toFixed(3),rejected}};
}

function detectRuns(samples,thresholdKmh,minDuration=1){
  const runs=[];let cur=null;
  for(const s of samples){
    if(s.speedKmh>=thresholdKmh){
      if(!cur)cur={startSec:s.tSec,endSec:s.tSec,maxSpeedKmh:s.speedKmh,distanceM:0};
      cur.endSec=s.tSec;cur.maxSpeedKmh=Math.max(cur.maxSpeedKmh,s.speedKmh);cur.distanceM+=s.dInc||0;
    }else if(cur){cur.durationS=cur.endSec-cur.startSec;if(cur.durationS>=minDuration)runs.push(cur);cur=null}
  }
  if(cur){cur.durationS=cur.endSec-cur.startSec;if(cur.durationS>=minDuration)runs.push(cur)}
  return runs;
}

function detectRelativeSprintPeaks(samples){
  const values=smooth(samples.map(s=>s.speedKmh),3),moving=values.filter(v=>v>2.16);
  const runningFloor=Math.max(6,percentile(moving,.70)),robustTop=percentile(values,.997),prominenceMin=Math.max(1.5,robustTop*.08),raw=[];
  for(let i=6;i<values.length-6;i++){
    const v=values[i];if(v<runningFloor)continue;
    if(!(v>=values[i-1]&&v>=values[i-2]&&v>values[i+1]&&v>values[i+2]))continue;
    const left=Math.min(...values.slice(i-6,i)),right=Math.min(...values.slice(i+1,i+7)),prominence=v-Math.max(left,right);
    if(prominence>=prominenceMin)raw.push({index:i,peakSpeedKmh:v,prominenceKmh:prominence});
  }
  const selected=[];
  for(const p of raw.slice().sort((a,b)=>b.peakSpeedKmh-a.peakSpeedKmh)){
    if(selected.every(x=>Math.abs(samples[x.index].tSec-samples[p.index].tSec)>=8))selected.push(p);
  }
  selected.sort((a,b)=>a.index-b.index);
  const peakValues=selected.map(p=>p.peakSpeedKmh),cutoff=Math.max(runningFloor,selected.length>=8?percentile(peakValues,.85):robustTop*.80);
  const sprints=selected.filter(p=>p.peakSpeedKmh>=cutoff).map(p=>({tSec:+samples[p.index].tSec.toFixed(1),peakSpeedKmh:+p.peakSpeedKmh.toFixed(2),prominenceKmh:+p.prominenceKmh.toFixed(2)}));
  return{model:'relative_peak_v1',cutoffKmh:+cutoff.toFixed(2),robustTopKmh:+robustTop.toFixed(2),runningFloorKmh:+runningFloor.toFixed(2),candidatePeakCount:selected.length,sprints};
}

function downsampleSeries(samples,key,maxPoints=360){const src=samples.filter(s=>Number.isFinite(s[key]));if(!src.length)return[];const step=Math.max(1,Math.ceil(src.length/maxPoints));return src.filter((_,i)=>i%step===0||i===src.length-1).map(s=>({tSec:+s.tSec.toFixed(1),value:+s[key].toFixed(2)}))}

function buildPosition(samples,{attackDirection=1,field=null}={}){
  const gps=samples.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));
  const fieldTf=field?.corners?.length===4?buildFieldTransform(field.corners):null;
  const tf=fieldTf||pcaTransform(gps);if(!tf)return null;
  const direction=Number(attackDirection)===-1?-1:1,grid=Array.from({length:GRID_Y},()=>Array(GRID_X).fill(0)),zoneGrid=Array.from({length:3},()=>Array(6).fill(0)),pts=[];
  const thirds=[0,0,0],sides=[0,0,0];let totalTime=0;
  for(const s of gps){
    let{u,v}=tf.project(s.lat,s.lon);if(!Number.isFinite(u)||!Number.isFinite(v))continue;
    u=clamp(u,0,1);v=clamp(v,0,1);if(direction<0)u=1-u;
    const weight=s.dt||.5;totalTime+=weight;
    grid[Math.min(GRID_Y-1,Math.floor(v*GRID_Y))][Math.min(GRID_X-1,Math.floor(u*GRID_X))]+=weight;
    zoneGrid[Math.min(2,Math.floor(v*3))][Math.min(5,Math.floor(u*6))]+=weight;
    thirds[Math.min(2,Math.floor(u*3))]+=weight;sides[Math.min(2,Math.floor(v*3))]+=weight;
    pts.push({u,v,tSec:s.tSec,dt:weight,speedKmh:s.speedKmh});
  }
  if(!pts.length)return null;
  const avgPosition={u:mean(pts.map(p=>p.u)),v:mean(pts.map(p=>p.v))};
  const step=Math.max(1,Math.ceil(pts.length/300)),trail=pts.filter((_,i)=>i%step===0||i===pts.length-1).map(p=>({u:+p.u.toFixed(4),v:+p.v.toFixed(4),tSec:+p.tSec.toFixed(1)}));
  return{grid,zoneGrid,avgPosition,trail,points:pts,thirds:thirds.map(v=>v/(totalTime||1)),sides:sides.map(v=>v/(totalTime||1)),attackDirection:direction,fieldCalibrated:!!fieldTf,autoBounds:fieldTf?null:(tf.autoBounds||null),lengthM:fieldTf?.lengthM||null,widthM:fieldTf?.widthM||null};
}

function sprintSpatialProfile(pos,sprints){
  if(!pos?.points?.length||!Array.isArray(sprints)||!sprints.length)return{thirds:[0,0,0],sides:[0,0,0],count:0};
  const thirds=[0,0,0],sides=[0,0,0];
  for(const sp of sprints){
    let best=pos.points[0],bestDt=Math.abs(Number(best.tSec)-Number(sp.tSec));
    for(const pt of pos.points){const d=Math.abs(Number(pt.tSec)-Number(sp.tSec));if(d<bestDt){best=pt;bestDt=d}}
    thirds[Math.min(2,Math.floor(clamp(Number(best.u)||0,0,0.9999)*3))]++;
    sides[Math.min(2,Math.floor(clamp(Number(best.v)||0,0,0.9999)*3))]++;
  }
  const n=sprints.length||1;return{thirds:thirds.map(v=>v/n),sides:sides.map(v=>v/n),count:sprints.length};
}

function roleFromFeatures({thirds=[],sides=[],spreadU=0,spreadV=0,sprintCount=0,durationS=0,avgPosition=null,attackDirection=1,sprintThirds=[],sprintSides=[]}={}){
  const def=thirds[0]||0,mid=thirds[1]||0,att=thirds[2]||0,left=sides[0]||0,center=sides[1]||0,right=sides[2]||0,wide=Math.max(left,right),roam=(spreadU+spreadV)/2,sprintRate=durationS?sprintCount/(durationS/60):0,sDef=sprintThirds[0]||0,sMid=sprintThirds[1]||0,sAtt=sprintThirds[2]||0,sWide=Math.max(sprintSides[0]||0,sprintSides[2]||0);
  const roles=[
    {role:'Delantero centro',score:att*3.1+center*1.25+sAtt*.9+sprintRate*.18+(1-def)*.45},
    {role:'Extremo',score:att*2.05+wide*2.2+sWide*1.15+sAtt*.55+sprintRate*.25+spreadU*.7},
    {role:'Centrocampista',score:mid*3+roam*2.2+sMid*.55+(1-Math.abs(att-def))*.65},
    {role:'Interior / mediapunta',score:mid*1.7+att*1.9+center*.8+roam*1.3+sAtt*.45+sMid*.35},
    {role:'Lateral / carrilero',score:def*1.45+mid*1.45+wide*2.15+sWide*.9+sDef*.35+roam*1.05},
    {role:'Defensa central',score:def*3.05+center*1.45+sDef*.75+(1-att)*.75+(1-Math.min(1,spreadU*2))*.45}
  ].sort((a,b)=>b.score-a.score);
  const total=roles.reduce((s,r)=>s+Math.max(0,r.score),0)||1,top=roles[0],confidence=Math.round(100*top.score/total);
  const notes=[];if(att>.45)notes.push('Gran parte del tiempo aparece en campo rival.');else if(def>.45)notes.push('Tendencia clara a ocupar zonas defensivas.');else notes.push('Ocupación bastante repartida alrededor del centro del campo.');
  if(wide>.48)notes.push('Perfil muy abierto hacia banda.');if(roam>.22)notes.push('Amplio radio de acción.');if(sprintCount>=10)notes.push('Alta frecuencia de picos de sprint relativos.');if(sAtt>.5)notes.push(Math.round(sAtt*100)+'% de los picos de sprint aparecen en tercio atacante.');else if(sDef>.5)notes.push(Math.round(sDef*100)+'% de los picos de sprint aparecen en tercio defensivo.');if(sWide>.6)notes.push('Los sprints se concentran especialmente en zonas de banda.');
  return{top:top.role,confidence,ranked:roles.slice(0,4).map(r=>({role:r.role,score:+r.score.toFixed(2)})),notes,avgU:avgPosition?+avgPosition.u.toFixed(3):null,avgV:avgPosition?+avgPosition.v.toFixed(3):null,spreadU:+spreadU.toFixed(3),spreadV:+spreadV.toFixed(3),attackDirection,sprintThirds:[sDef,sMid,sAtt],sprintSides:[sprintSides[0]||0,sprintSides[1]||0,sprintSides[2]||0]};
}
function roleEstimate(pos,ctx){
  if(!pos)return null;const sprintProfile=sprintSpatialProfile(pos,ctx.sprints);
  return roleFromFeatures({thirds:pos.thirds,sides:pos.sides,spreadU:std(pos.points.map(p=>p.u)),spreadV:std(pos.points.map(p=>p.v)),sprintCount:ctx.sprints.length,durationS:ctx.durationS,avgPosition:pos.avgPosition,attackDirection:pos.attackDirection,sprintThirds:sprintProfile.thirds,sprintSides:sprintProfile.sides});
}

function speedZones(samples){const defs=[['Caminar',0,7],['Trote',7,14.4],['Carrera',14.4,19.8],['Alta velocidad',19.8,25.2],['Muy alta velocidad',25.2,Infinity]].map(([name,min,max])=>({name,min,max,distanceM:0,timeS:0}));for(const s of samples){const z=defs.find(z=>s.speedKmh>=z.min&&s.speedKmh<z.max)||defs.at(-1);z.distanceM+=s.dInc||0;z.timeS+=s.dt||0}return defs.map(z=>({...z,distanceM:+z.distanceM.toFixed(1),timeS:+z.timeS.toFixed(1)}))}
function hrZones(samples,referenceMax){if(!referenceMax)return[];const defs=[[1,.5,.6],[2,.6,.7],[3,.7,.8],[4,.8,.9],[5,.9,1.2]].map(([zone,min,max])=>({zone,name:'Zona '+zone,minPct:min,maxPct:max,lowBpm:Math.round(referenceMax*min),highBpm:Math.round(referenceMax*Math.min(1,max)),timeS:0}));for(const s of samples){if(!(s.hr>0))continue;const p=s.hr/referenceMax,z=defs.find(z=>p>=z.minPct&&p<z.maxPct)||defs.at(-1);z.timeS+=s.dt||0}return defs.map(z=>({...z,timeS:+z.timeS.toFixed(1)}))}
function accelEvents(samples){const sm=smooth(samples.map(s=>s.speedKmh/3.6),5),events={accelerations:[],decelerations:[]};for(let i=1;i<samples.length;i++){const dt=samples[i].dt;if(!(dt>0&&dt<=3))continue;const a=(sm[i]-sm[i-1])/dt;if(a>=2.2)events.accelerations.push({tSec:+samples[i].tSec.toFixed(1),ms2:+a.toFixed(2)});if(a<=-2.2)events.decelerations.push({tSec:+samples[i].tSec.toFixed(1),ms2:+a.toFixed(2)})}events.accelerations=events.accelerations.slice(0,80);events.decelerations=events.decelerations.slice(0,80);return events}

export async function analyzeFit(buf,options={}){
  const highIntensityKmh=Number(options.highIntensityKmh)||DEFAULT_HIGH_INTENSITY_KMH,attackDirection=Number(options.attackDirection)===-1?-1:1;
  const FitParser=await loadFitParser(),parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),data=await parser.parseAsync(buf),records=(data.records||[]).filter(r=>toMs(r.timestamp)!=null).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp));if(!records.length)throw new Error('El FIT no contiene registros con tiempo.');
  const t0=toMs(records[0].timestamp),samples=records.map((r,i)=>({tSec:(toMs(r.timestamp)-t0)/1000,dt:i?Math.max(0,Math.min(8,(toMs(r.timestamp)-toMs(records[i-1].timestamp))/1000)):0,lat:num(r.position_lat),lon:num(r.position_long),speedKmh:num(r.enhanced_speed??r.speed),distance:num(r.distance),hr:num(r.heart_rate),cadence:num(r.cadence)}));
  for(const s of samples)if(s.speedKmh==null||s.speedKmh<0||s.speedKmh>MAX_HUMAN_KMH)s.speedKmh=null;
  for(let i=1;i<samples.length;i++){const s=samples[i],p=samples[i-1];if(s.speedKmh==null&&s.lat!=null&&s.lon!=null&&p.lat!=null&&p.lon!=null&&s.dt>0){const v=haversine(p.lat,p.lon,s.lat,s.lon)/s.dt*3.6;if(v<=MAX_HUMAN_KMH)s.speedKmh=v}}
  for(const s of samples)if(s.speedKmh==null)s.speedKmh=0;samples[0].dInc=0;
  for(let i=1;i<samples.length;i++){const s=samples[i],p=samples[i-1];let d=null;if(s.distance!=null&&p.distance!=null){d=s.distance-p.distance;if(d<0||d>60)d=null}if(d==null&&s.dt>0)d=s.speedKmh/3.6*s.dt;if(d==null&&s.lat!=null&&p.lat!=null)d=haversine(p.lat,p.lon,s.lat,s.lon);s.dInc=Math.max(0,Number.isFinite(d)?d:0)}
  const durationS=samples.at(-1).tSec,moving=samples.filter(s=>s.speedKmh>2.16),movingTimeS=moving.reduce((a,s)=>a+s.dt,0),distanceM=samples.reduce((a,s)=>a+s.dInc,0),smoothed=smooth(samples.map(s=>s.speedKmh),5),topSpeedKmh=Math.max(...smoothed),rawTopSpeedKmh=Math.max(...samples.map(s=>s.speedKmh)),avgSpeedKmh=moving.length?mean(moving.map(s=>s.speedKmh)):0;
  const selectedPitch=options.field||chooseNearestPitch(samples,options.fields||[]),relative=detectRelativeSprintPeaks(samples),absoluteSprints18=detectRuns(samples,ABSOLUTE_SPRINT_REFERENCE_KMH),hiRuns=detectRuns(samples,highIntensityKmh),highIntensityDistanceM=samples.filter(s=>s.speedKmh>=highIntensityKmh).reduce((a,s)=>a+s.dInc,0),hrs=samples.filter(s=>s.hr>0).map(s=>s.hr),pos=buildPosition(samples,{attackDirection,field:selectedPitch}),refMax=Number(options.maxHr)||((Number(options.age)>0)?Math.round(208-.7*Number(options.age)):null)||(hrs.length?Math.max(...hrs):null),accels=accelEvents(samples),cadences=samples.filter(s=>s.cadence>0).map(s=>s.cadence);
  const sprintProfile=sprintSpatialProfile(pos,relative.sprints),role=roleEstimate(pos,{sprints:relative.sprints,durationS});
  const detail={positional:{thirds:pos?.thirds||[],sides:pos?.sides||[],sprintProfile,role,attackDirection,fieldCalibrated:!!pos?.fieldCalibrated,pitchId:selectedPitch?.id??null,pitchName:selectedPitch?.name||null,goalALabel:selectedPitch?.goal_a_label||'Portería A',goalBLabel:selectedPitch?.goal_b_label||'Portería B',pitchDistanceFromTrackM:selectedPitch?.distanceFromTrackM??null,autoBounds:pos?.autoBounds||null,lengthM:pos?.lengthM??null,widthM:pos?.widthM??null},speed:{zones:speedZones(samples),sprintModel:relative.model,relativeSprintCutoffKmh:relative.cutoffKmh,robustTopKmh:relative.robustTopKmh,runningFloorKmh:relative.runningFloorKmh,candidatePeakCount:relative.candidatePeakCount,sprints:relative.sprints,absoluteSprintReferenceKmh:ABSOLUTE_SPRINT_REFERENCE_KMH,absoluteSprintCount18:absoluteSprints18.length,highIntensityThresholdKmh:highIntensityKmh,highIntensityRuns:hiRuns.slice(0,80),rawTopSpeedKmh:+rawTopSpeedKmh.toFixed(2),accelerations:accels.accelerations,decelerations:accels.decelerations,speedSeries:downsampleSeries(samples,'speedKmh')},heartRate:{referenceMaxBpm:refMax,zones:hrZones(samples,refMax),series:downsampleSeries(samples,'hr')},workload:{distancePerMin:movingTimeS?+(distanceM/(movingTimeS/60)).toFixed(1):0,highIntensityDistancePerMin:movingTimeS?+(highIntensityDistanceM/(movingTimeS/60)).toFixed(1):0,avgCadence:cadences.length?+mean(cadences).toFixed(1):null}};
  return{sourceStartedAt:new Date(t0).toISOString(),durationS,movingTimeS,distanceM,topSpeedKmh,rawTopSpeedKmh,avgSpeedKmh,sprintCount:relative.sprints.length,highIntensityDistanceM,avgHr:hrs.length?Math.round(mean(hrs)):null,maxHr:hrs.length?Math.max(...hrs):null,sampleCount:samples.length,hasGps:!!pos,hasHr:hrs.length>0,heatmapGrid:pos?.grid||[],zoneGrid:pos?.zoneGrid||[],avgPosition:pos?.avgPosition||null,trail:pos?.trail||[],speedZones:detail.speed.zones,analysisDetail:detail};
}

export function toSupabaseRow(matchId,playerId,a){const p=a?.analysisDetail?.positional||{};return{match_id:matchId,player_id:playerId,source_format:'fit',source_started_at:a.sourceStartedAt,duration_s:a.durationS,moving_time_s:a.movingTimeS,distance_m:a.distanceM,top_speed_kmh:a.topSpeedKmh,avg_speed_kmh:a.avgSpeedKmh,sprint_count:a.sprintCount,high_intensity_distance_m:a.highIntensityDistanceM,avg_hr:a.avgHr,max_hr:a.maxHr,sample_count:a.sampleCount,has_gps:a.hasGps,has_hr:a.hasHr,heatmap_grid:a.heatmapGrid,zone_grid:a.zoneGrid,avg_position:a.avgPosition,trail:a.trail,speed_zones:a.speedZones,analysis_detail:a.analysisDetail||{},pitch_id:p.pitchId??null,attack_direction:p.attackDirection===-1?-1:1,analysis_version:4,updated_at:new Date().toISOString()}}
export function fromSupabaseRow(row){if(!row)return null;const a={sourceStartedAt:row.source_started_at,durationS:Number(row.duration_s)||0,movingTimeS:Number(row.moving_time_s)||0,distanceM:Number(row.distance_m)||0,topSpeedKmh:Number(row.top_speed_kmh)||0,avgSpeedKmh:Number(row.avg_speed_kmh)||0,sprintCount:Number(row.sprint_count)||0,highIntensityDistanceM:Number(row.high_intensity_distance_m)||0,avgHr:row.avg_hr==null?null:Number(row.avg_hr),maxHr:row.max_hr==null?null:Number(row.max_hr),sampleCount:Number(row.sample_count)||0,hasGps:!!row.has_gps,hasHr:!!row.has_hr,heatmapGrid:row.heatmap_grid||[],zoneGrid:row.zone_grid||[],avgPosition:row.avg_position||null,trail:row.trail||[],speedZones:row.speed_zones||[],analysisDetail:row.analysis_detail||{}};a.analysisDetail.positional=a.analysisDetail.positional||{};a.analysisDetail.positional.attackDirection=row.attack_direction===-1?-1:(a.analysisDetail.positional.attackDirection===-1?-1:1);return a}
export function setAttackDirection(analysis,direction){if(!analysis)return analysis;const target=Number(direction)===-1?-1:1,pos=analysis.analysisDetail?.positional||{},current=Number(pos.attackDirection)===-1?-1:1;if(target===current)return analysis;const clone=typeof structuredClone==='function'?structuredClone(analysis):JSON.parse(JSON.stringify(analysis));const p=clone.analysisDetail.positional||{},speed=clone.analysisDetail.speed||{};clone.heatmapGrid=(clone.heatmapGrid||[]).map(row=>row.slice().reverse());clone.zoneGrid=(clone.zoneGrid||[]).map(row=>row.slice().reverse());if(clone.avgPosition)clone.avgPosition={...clone.avgPosition,u:1-Number(clone.avgPosition.u||0)};clone.trail=(clone.trail||[]).map(x=>({...x,u:1-Number(x.u||0)}));p.thirds=(p.thirds||[]).slice().reverse();if(p.sprintProfile?.thirds)p.sprintProfile={...p.sprintProfile,thirds:p.sprintProfile.thirds.slice().reverse()};p.attackDirection=target;const oldRole=p.role||{},avg=clone.avgPosition||{u:.5,v:.5};p.role=roleFromFeatures({thirds:p.thirds,sides:p.sides||[],spreadU:Number(oldRole.spreadU)||0,spreadV:Number(oldRole.spreadV)||0,sprintCount:Number(clone.sprintCount)||speed.sprints?.length||0,durationS:Number(clone.durationS)||0,avgPosition:avg,attackDirection:target,sprintThirds:p.sprintProfile?.thirds||[],sprintSides:p.sprintProfile?.sides||[]});return clone}
