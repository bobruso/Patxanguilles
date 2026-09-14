// Research only. Coordinates are local metres; time is seconds. Every method acts on
// independent observed runs. No method can cross a missing-coordinate boundary.
export const sum = a => a.reduce((s,x)=>s+x,0);
export const mean = a => a.length?sum(a)/a.length:null;
export const quantile = (a,q) => { if(!a.length)return null; const s=[...a].sort((a,b)=>a-b),p=(s.length-1)*q,i=Math.floor(p);return s[i]+(s[Math.ceil(p)]-s[i])*(p-i); };
export const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const length = p => sum(p.slice(1).map((b,i)=>dist(p[i],b)));
export const total = runs => sum(runs.map(length));
export function splitRuns(records,maxGap=10) {
  const runs=[];let run=[];
  for(const p of records){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)){if(run.length)runs.push(run);run=[];continue;}
    if(run.length && (p.t<=run.at(-1).t||p.t-run.at(-1).t>maxGap)){runs.push(run);run=[];}
    run.push(p);
  }
  if(run.length)runs.push(run);return runs;
}
export function lerp(a,b,t){const u=(t-a.t)/(b.t-a.t);const p={...a,t,x:a.x+u*(b.x-a.x),y:a.y+u*(b.y-a.y)};for(const k of ['speed','fit','cadence'])p[k]=Number.isFinite(a[k])&&Number.isFinite(b[k])?a[k]+u*(b[k]-a[k]):null;return p;}
export function at(p,t){if(t<=p[0].t)return {...p[0],t};if(t>=p.at(-1).t)return {...p.at(-1),t};let lo=0,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(p[m].t<t)lo=m;else hi=m;}return lerp(p[lo],p[hi],t);}
export function clip(runs,start,end){return runs.flatMap(p=>{const a=Math.max(start,p[0].t),b=Math.min(end,p.at(-1).t);if(b<a)return [];if(b===a)return [[at(p,a)]];return [[at(p,a),...p.filter(q=>q.t>a&&q.t<b),at(p,b)]];});}
export function intersectSupports(a,b){const out=[];for(const p of a)for(const q of b){const start=Math.max(p[0].t,q[0].t),end=Math.min(p.at(-1).t,q.at(-1).t);if(end>start)out.push([start,end]);}return out;}
export const mask = (runs,intervals)=>intervals.flatMap(([a,b])=>clip(runs,a,b));

export function resample(p,step=1,keepKnots=false,cubic=false,phase=0){
  if(p.length<2)return p;
  const ts=[p[0].t,p.at(-1).t];for(let t=Math.ceil((p[0].t-phase)/step)*step+phase;t<p.at(-1).t;t+=step)if(t>p[0].t)ts.push(t);
  if(keepKnots)ts.push(...p.map(q=>q.t));
  const slopes={};
  if(cubic)for(const key of ['x','y']){
    const h=p.slice(1).map((q,i)=>q.t-p[i].t),d=p.slice(1).map((q,i)=>(q[key]-p[i][key])/h[i]);
    const m=p.map((q,i)=>{if(!i)return d[0];if(i===p.length-1)return d.at(-1);if(d[i-1]*d[i]<=0)return 0;const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];return(w1+w2)/(w1/d[i-1]+w2/d[i]);});
    if(p.length>2)for(const end of [false,true]){const i=end?d.length-1:0,j=end?i-1:1;let v=((2*h[i]+h[j])*d[i]-h[i]*d[j])/(h[i]+h[j]);if(Math.sign(v)!==Math.sign(d[i]))v=0;else if(Math.sign(d[i])!==Math.sign(d[j])&&Math.abs(v)>3*Math.abs(d[i]))v=3*d[i];m[end?p.length-1:0]=v;}slopes[key]=m;
  }
  let i=0;return [...new Set(ts)].sort((a,b)=>a-b).map(t=>{while(i<p.length-2&&p[i+1].t<t)i++;const a=p[i],b=p[i+1],q=lerp(a,b,t);if(cubic){const h=b.t-a.t,u=(t-a.t)/h;for(const k of ['x','y'])q[k]=(2*u**3-3*u*u+1)*a[k]+(u**3-2*u*u+u)*h*slopes[k][i]+(-2*u**3+3*u*u)*b[k]+(u**3-u*u)*h*slopes[k][i+1];}return q;});
}

// Exact integral of the piecewise linear observation, independent of point density.
export function temporal(p,width){
  if(p.length<3)return p;
  const integral={x:[0],y:[0]};for(let i=1;i<p.length;i++)for(const k of ['x','y'])integral[k][i]=integral[k][i-1]+(p[i][k]+p[i-1][k])*.5*(p[i].t-p[i-1].t);
  function primitive(t,k){let lo=0,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(p[m].t<t)lo=m;else hi=m;}const dt=t-p[lo].t;return integral[k][lo]+p[lo][k]*dt+.5*(p[hi][k]-p[lo][k])/(p[hi].t-p[lo].t)*dt*dt;}
  return p.map((q,i)=>{if(!i||i===p.length-1)return q;const a=Math.max(p[0].t,q.t-width/2),b=Math.min(p.at(-1).t,q.t+width/2);return {...q,x:(primitive(b,'x')-primitive(a,'x'))/(b-a),y:(primitive(b,'y')-primitive(a,'y'))/(b-a)};});
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,u=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy);}
export function rdp(p,eps){if(p.length<3)return p;const keep=new Set([0,p.length-1]),stack=[[0,p.length-1]];while(stack.length){const[a,b]=stack.pop();let best=eps,idx=-1;for(let i=a+1;i<b;i++){const d=segmentDistance(p[i],p[a],p[b]);if(d>best){best=d;idx=i;}}if(idx>=0){keep.add(idx);stack.push([a,idx],[idx,b]);}}return [...keep].sort((a,b)=>a-b).map(i=>p[i]);}
// Synchronous distance bounds deviation from the chord at the SAME time, preserving
// many collinear reversals that set-based spatial simplification can erase.
export function sed(p,eps){if(p.length<3)return p;const keep=new Set([0,p.length-1]),stack=[[0,p.length-1]];while(stack.length){const[a,b]=stack.pop();let best=eps,idx=-1;for(let i=a+1;i<b;i++){const d=dist(p[i],lerp(p[a],p[b],p[i].t));if(d>best){best=d;idx=i;}}if(idx>=0){keep.add(idx);stack.push([a,idx],[idx,b]);}}return [...keep].sort((a,b)=>a-b).map(i=>p[i]);}
export function vw(p,scale){const q=[...p];while(q.length>2){let smallest=scale*scale,idx=-1;for(let i=1;i<q.length-1;i++){const a=q[i-1],b=q[i],c=q[i+1],area=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/2;if(area<smallest){smallest=area;idx=i;}}if(idx<0)break;q.splice(idx,1);}return q;}
export function anchor(p,eps){if(p.length<3)return p;const out=[p[0]];for(let i=1;i<p.length-1;i++)if(dist(out.at(-1),p[i])>=eps)out.push(p[i]);out.push(p.at(-1));return out;}
export function turn(p,i){const a=p[i-1],b=p[i],c=p[i+1],ab=dist(a,b),bc=dist(b,c);if(ab<.25||bc<.25)return 0;return Math.acos(Math.max(-1,Math.min(1,((b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y))/(ab*bc))))*180/Math.PI;}
export function features(p){if(p.length<2)return {path:0,net:0,ratio:1,spread:0,duration:0,speed:null,headingConsistency:1,turns:0};const d=length(p),net=dist(p[0],p.at(-1)),duration=p.at(-1).t-p[0].t,mx=mean(p.map(q=>q.x)),my=mean(p.map(q=>q.y));let hx=0,hy=0,n=0;for(let i=1;i<p.length;i++){const v=dist(p[i-1],p[i]);if(v>.25){hx+=(p[i].x-p[i-1].x)/v;hy+=(p[i].y-p[i-1].y)/v;n++;}}return {path:d,net,ratio:d?net/d:1,spread:Math.max(...p.map(q=>Math.hypot(q.x-mx,q.y-my))),duration,speed:mean(p.map(q=>q.speed).filter(Number.isFinite)),headingConsistency:n?Math.hypot(hx,hy)/n:1,turns:p.slice(1,-1).filter((_,i)=>turn(p,i+1)>=45).length};}

// Conservative hypothesis, not a validated stationary classifier. Preserve entry/exit anchors.
export function adaptive(p,window=12,hybrid=false){const out=[];let i=0;while(i<p.length){let j=i;while(j+1<p.length&&p[j+1].t-p[i].t<=window)j++;const block=p.slice(i,j+1),f=features(block),allSpeed=block.every(q=>Number.isFinite(q.speed));const veto=hybrid&&(!allSpeed||block.some(q=>q.speed>.2));const still=f.duration>=window*.8&&f.net<=.75&&f.spread<=1.5&&f.ratio<=.12&&f.headingConsistency<=.3&&!veto;
    if(still){out.push(p[i]);if(j>i)out.push(p[j]);i=j+1;}else{out.push(p[i]);i++;}}
  return out;
}

// Constant-velocity, independent x/y Kalman filter; white acceleration per step.
export function kalman(p,sigma=1,accel=2){if(p.length<3)return p;const states=['x','y'].map(k=>({k,z:p[0][k],v:0,P:[sigma*sigma,0,0,100]})),out=[p[0]];
  for(let i=1;i<p.length;i++){const dt=p[i].t-p[i-1].t,q=accel*accel,r=sigma*sigma,o={...p[i]};for(const s of states){let[a,b,c,d]=s.P;const A=a+dt*(b+c)+dt*dt*d+q*dt**4/4,B=b+dt*d+q*dt**3/2,C=c+dt*d+q*dt**3/2,D=d+q*dt*dt;const pred=s.z+dt*s.v,e=p[i][s.k]-pred,k0=A/(A+r),k1=C/(A+r);s.z=pred+k0*e;s.v+=k1*e;s.P=[(1-k0)*A,(1-k0)*B,C-k1*A,D-k1*B];o[s.k]=s.z;}out.push(o);}out[out.length-1]=p.at(-1);return out;
}
export function noiseEstimate(p){const estimates=[];for(let i=0;i<p.length;i++){let j=i;while(j+1<p.length&&p[j+1].t-p[i].t<=15)j++;const b=p.slice(i,j+1),f=features(b);if(f.duration<12||f.net/f.duration>.08||f.spread>3||!b.every(q=>Number.isFinite(q.speed)&&q.speed<=.15))continue;const mx=quantile(b.map(q=>q.x),.5),my=quantile(b.map(q=>q.y),.5);estimates.push(quantile(b.map(q=>Math.hypot(q.x-mx,q.y-my)),.5)/1.1774);i=j;}return {windows:estimates.length,sigma:estimates.length>=3?quantile(estimates,.5):null};}
export function multiscale(p,plateau=.01){const scales=[.5,1,1.5,2,2.5,3,4,5],curves=scales.map(s=>({scale:s,p:rdp(p,s)}));const raw=length(p);for(let i=0;i<curves.length-2;i++){const a=length(curves[i].p),b=length(curves[i+1].p),c=length(curves[i+2].p);if(raw>0&&(a-b)/raw/(scales[i+1]-scales[i])<plateau&&(b-c)/raw/(scales[i+2]-scales[i+1])<plateau)return curves[i].p;}return p;}

export function configurations(){const m=[{id:'raw',family:'raw',param:null,run:p=>p}];
  for(const w of [1,2,3,4,5,6])m.push({id:`temporal-${w}s`,family:'temporal',param:w,run:p=>temporal(p,w)});
  m.push({id:'linear-1Hz',family:'resampling',param:1,run:p=>resample(p)}, {id:'linear-knots-1Hz',family:'resampling',param:1,run:p=>resample(p,1,true)}, {id:'pchip-knots-1Hz',family:'resampling',param:1,run:p=>resample(p,1,true,true)});
  for(const w of [2,3,4,5])m.push({id:`linear-temporal-${w}s`,family:'resample-temporal',param:w,run:p=>temporal(resample(p),w)});
  for(const eps of [.25,.5,.75,1,1.2,1.5,1.6,1.8,2,2.5,3,4,5]){
    m.push({id:`rdp-${eps}m`,family:'rdp',param:eps,run:p=>rdp(p,eps)}, {id:`anchor-${eps}m`,family:'anchor',param:eps,run:p=>anchor(p,eps)}, {id:`sed-${eps}m`,family:'sed',param:eps,run:p=>sed(p,eps)});
    if([.5,1,1.5,2,3,5].includes(eps))m.push({id:`vw-${eps}m`,family:'vw-sqrt-area',param:eps,run:p=>vw(p,eps)});
  }
  for(const w of [10,12,15])m.push({id:`adaptive-${w}s`,family:'adaptive',param:w,run:p=>adaptive(p,w)}, {id:`hybrid-${w}s`,family:'hybrid',param:w,run:p=>adaptive(p,w,true)});
  for(const s of [.5,1,2,3])for(const a of [1,2,4])m.push({id:`kalman-s${s}-a${a}`,family:'kalman',param:s,accel:a,run:p=>kalman(p,s,a)});
  for(const slope of [.005,.01,.02])m.push({id:`multiscale-${slope}`,family:'multiscale',param:slope,run:p=>multiscale(p,slope)});
  m.push({id:'noise-adaptive',family:'noise-adaptive',param:null,run:p=>{const n=noiseEstimate(p);return n.sigma==null?p:rdp(p,Math.max(.25,Math.min(2,n.sigma)));}});
  return m;
}

export function geometry(raw,filtered){const movement=[],endpoints=[],turnMatches=[],localRatios=[];let before=0,after=0;
  for(let r=0;r<raw.length;r++){const p=raw[r],q=filtered[r];if(!q?.length)continue;endpoints.push(dist(p[0],q[0]),dist(p.at(-1),q.at(-1)));for(const v of p)movement.push(dist(v,at(q,v.t)));
    const ta=p.slice(1,-1).map((v,i)=>({t:v.t,angle:turn(p,i+1)})).filter(v=>v.angle>=45),tb=q.slice(1,-1).map((v,i)=>({t:v.t,angle:turn(q,i+1)})).filter(v=>v.angle>=45);before+=ta.length;after+=tb.length;
    // One-to-one temporal matching avoids counting one surviving turn many times.
    const used=new Set();for(const a of ta){let best=-1,dt=Infinity;tb.forEach((b,i)=>{if(!used.has(i)&&Math.abs(a.t-b.t)<=2&&Math.abs(a.angle-b.angle)<=30&&Math.abs(a.t-b.t)<dt){best=i;dt=Math.abs(a.t-b.t);}});if(best>=0){used.add(best);turnMatches.push(1);}}
    for(let t=p[0].t;t+10<=p.at(-1).t;t+=10){const a=total(clip([p],t,t+10)),b=total(clip([q],t,t+10));if(a>1)localRatios.push(b/a);}
  }
  return {pointCount:sum(filtered.map(p=>p.length)),removedPoints:sum(raw.map(p=>p.length))-sum(filtered.map(p=>p.length)),positionRmsM:Math.sqrt(mean(movement.map(v=>v*v))||0),maxTimeAlignedDisplacementM:Math.max(0,...movement),endpointMaxM:Math.max(0,...endpoints),rawTurns:before,filteredTurns:after,matchedTurns:turnMatches.length,turnRetentionPct:before?100*turnMatches.length/before:null,local10sRetentionP10:quantile(localRatios,.1)};
}
