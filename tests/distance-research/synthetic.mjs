import { splitRuns, total, mean, quantile } from './methods.mjs';

function polyline(knots){const end=knots.at(-1)[0],cum=[0];for(let i=1;i<knots.length;i++)cum[i]=cum[i-1]+Math.hypot(knots[i][1]-knots[i-1][1],knots[i][2]-knots[i-1][2]);return {duration:end,point(t){let i=0;while(i<knots.length-2&&knots[i+1][0]<t)i++;const a=knots[i],b=knots[i+1],u=(t-a[0])/(b[0]-a[0]);return {x:a[1]+u*(b[1]-a[1]),y:a[2]+u*(b[2]-a[2]),s:cum[i]+u*(cum[i+1]-cum[i]),speed:(cum[i+1]-cum[i])/(b[0]-a[0])};}};}
export function scenarios(){return [
  {name:'straight100',...polyline([[0,0,0],[50,100,0]])},
  {name:'slow04',...polyline([[0,0,0],[100,40,0]])},
  {name:'stationary',...polyline([[0,0,0],[100,0,0]])},
  {name:'zigzag',...polyline(Array.from({length:21},(_,i)=>[i*2,i*3,i%2?3:0]))},
  {name:'shuttle5',...polyline(Array.from({length:21},(_,i)=>[i*2.5,i%2?5:0,0]))},
  {name:'circle10',duration:60,point(t){const a=t/60*2*Math.PI;return {x:10*Math.cos(a),y:10*Math.sin(a),s:10*a,speed:Math.PI/3};}},
  {name:'sprint-brake-turn',...polyline([[0,0,0],[5,2,0],[7,6,0],[9,16,0],[11,32,0],[13,42,0],[15,44,0],[17,40,0],[19,30,0],[24,30,10],[40,30,10]])},
  {name:'missing-slow04',missing:[[25,34],[65,69]],...polyline([[0,0,0],[100,40,0]])},
  {name:'micro-shuttle05',...polyline(Array.from({length:41},(_,i)=>[i, i%2?.5:0,0]))}
];}
function random(seed){let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return(state+.5)/4294967296;};}
function gaussian(rng){return Math.sqrt(-2*Math.log(rng()))*Math.cos(2*Math.PI*rng());}
export function sampleScenario(s,{sigma=0,tau=0,seed=1,sampling='dense',speedMode='lagged'}={}){
  const rng=random(seed),noise=[],dt=.25,rho=tau?Math.exp(-dt/tau):0;let nx=gaussian(rng)*sigma,ny=gaussian(rng)*sigma;
  for(let i=0;i<=s.duration/dt;i++){if(i){nx=rho*nx+Math.sqrt(1-rho*rho)*sigma*gaussian(rng);ny=rho*ny+Math.sqrt(1-rho*rho)*sigma*gaussian(rng);}noise.push([nx,ny]);}
  const times=[0],pattern=[1,1,3,2,5,1,2,4],phase=sampling==='irregular-phase'?.5:0;let t=phase,i=0;if(phase)times.push(phase);
  while(t<s.duration){t+=sampling==='dense'?1:pattern[i++%pattern.length];if(t<s.duration)times.push(t);}times.push(s.duration);
  const points=times.map(t=>{const p=s.point(t),n=noise[Math.round(t/dt)];const missing=s.missing?.some(([a,b])=>t>=a&&t<=b);let speed=null;
    if(speedMode==='ideal')speed=p.speed;
    if(speedMode==='lagged')speed=mean([0,1,2,3,4].map(lag=>s.point(Math.max(0,t-lag)).speed))*.9;
    return {t,x:missing?null:p.x+n[0],y:missing?null:p.y+n[1],speed};});
  // Explicit missing records even if the sampling schedule entirely skipped a missing block.
  for(const [a,b] of s.missing||[])points.push({t:(a+b)/2,x:null,y:null,speed:null});
  points.sort((a,b)=>a.t-b.t);const runs=splitRuns(points);
  const observableTruth=runs.reduce((a,p)=>a+s.point(p.at(-1).t).s-s.point(p[0].t).s,0),fullTruth=s.point(s.duration).s;
  return {runs,observableTruth,fullTruth,observedSeconds:runs.reduce((a,p)=>a+p.at(-1).t-p[0].t,0)};
}

export function syntheticStudy(methods){
  const rows=[],noiseCases=[{sigma:0,tau:0},...[.5,1,2,3].flatMap(sigma=>[0,3,15].map(tau=>({sigma,tau})))];
  for(const split of ['train','holdout'])for(const scenario of scenarios())for(const sampling of ['dense','irregular','irregular-phase'])for(const noise of noiseCases){
    const accum=methods.map(()=>[]);
    for(const seed of split==='train'?[1,2,3]:[101,102,103]){
      const sample=sampleScenario(scenario,{...noise,sampling,seed}),raw=total(sample.runs);
      methods.forEach((m,i)=>{const measured=total(sample.runs.map(m.run)),bias=measured-sample.observableTruth;accum[i].push({bias,absolute:Math.abs(bias),relative:sample.observableTruth>0?100*bias/sample.observableTruth:null,stationaryMPerMin:scenario.name==='stationary'?measured/sample.observedSeconds*60:null,truth:sample.observableTruth,fullTruth:sample.fullTruth,measured,raw});});
    }
    methods.forEach((m,i)=>{const a=accum[i];rows.push({split,scenario:scenario.name,sampling,...noise,method:m.id,seeds:a.length,truthM:mean(a.map(v=>v.truth)),fullTruthM:a[0].fullTruth,distanceM:mean(a.map(v=>v.measured)),rawM:mean(a.map(v=>v.raw)),biasM:mean(a.map(v=>v.bias)),maeM:mean(a.map(v=>v.absolute)),biasPct:mean(a.map(v=>v.relative).filter(v=>v!==null)),mapePct:mean(a.map(v=>v.relative).filter(v=>v!==null).map(Math.abs)),maxSeedAbsErrorM:Math.max(...a.map(v=>v.absolute)),stationaryMPerMin:mean(a.map(v=>v.stationaryMPerMin).filter(v=>v!==null))});});
  }
  const summary=[];
  for(const split of ['train','holdout'])for(const m of methods){const a=rows.filter(r=>r.split===split&&r.method===m.id),moving=a.filter(r=>r.truthM>0&&r.sigma>0),still=a.filter(r=>r.scenario==='stationary'&&r.sigma>0),clean=a.filter(r=>r.sigma===0&&r.truthM>0),meanAbsBias=names=>mean(moving.filter(r=>names.includes(r.scenario)).map(r=>r.mapePct));
    // Equal weights per scenario × noise × sampling cell. No real FIT agreement in this score.
    const movingMape=mean(moving.map(r=>r.mapePct)),stationary=mean(still.map(r=>r.stationaryMPerMin)),cleanWorst=Math.max(...clean.map(r=>r.mapePct));
    const samplingDifference=[];for(const d of moving.filter(r=>r.sampling==='dense')){const sparse=moving.find(r=>r.scenario===d.scenario&&r.sigma===d.sigma&&r.tau===d.tau&&r.sampling==='irregular');if(sparse)samplingDifference.push(100*Math.abs(d.distanceM-sparse.distanceM)/d.truthM);}
    const core=a.filter(r=>r.sigma>0&&r.tau>0&&r.scenario!=='micro-shuttle05'&&r.truthM>0),coreStill=still.filter(r=>r.tau>0),cleanDense=clean.filter(r=>r.sampling==='dense'&&r.scenario!=='micro-shuttle05'),cleanDenseWorst=Math.max(...cleanDense.map(r=>r.mapePct));
    const coreMoving=mean(core.map(r=>r.mapePct)),coreStationary=mean(coreStill.map(r=>r.stationaryMPerMin));
    const cleanDenseExcess=Math.max(0,...cleanDense.map(r=>r.mapePct-Math.abs(100*(r.rawM-r.truthM)/r.truthM)));
    summary.push({split,method:m.id,movingMapePct:movingMape,movingBiasPct:mean(moving.map(r=>r.biasPct)),movingMaeM:mean(moving.map(r=>r.maeM)),cellP95MapePct:quantile(moving.map(r=>r.mapePct),.95),stationaryMPerMin:stationary,cleanWorstMapePct:cleanWorst,slowMapePct:meanAbsBias(['slow04','missing-slow04']),footballMapePct:meanAbsBias(['zigzag','shuttle5','circle10','sprint-brake-turn']),samplingDeltaPct:mean(samplingDifference),score:movingMape+stationary+cleanWorst,
      coreCorrelatedMapePct:coreMoving,coreCorrelatedStationaryMPerMin:coreStationary,cleanDenseCoreWorstPct:cleanDenseWorst,cleanDenseExcessPct:cleanDenseExcess,coreScore:coreMoving+coreStationary+cleanDenseExcess,
      eligible:coreMoving<=10&&coreStationary<=2&&cleanDenseExcess<=5});
  }
  // Speed ablations held separately: does the conclusion require privileged ground-truth speed?
  const ablation=[];
  for(const s of scenarios())for(const mode of ['ideal','lagged','absent'])for(const m of methods.filter(m=>['hybrid','noise-adaptive'].includes(m.family))){const a=[];for(const seed of [101,102,103]){const sample=sampleScenario(s,{sigma:1,tau:3,sampling:'dense',seed,speedMode:mode});a.push(total(sample.runs.map(m.run))-sample.observableTruth);}ablation.push({scenario:s.name,speedMode:mode,method:m.id,biasM:mean(a),maeM:mean(a.map(Math.abs))});}
  return {rows,summary,ablation};
}
