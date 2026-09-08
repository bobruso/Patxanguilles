const R=6371000;
const rad=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function haversineMeters(aLat,aLon,bLat,bLon){
  const x=(bLat-aLat)*rad,y=(bLon-aLon)*rad;
  const q=Math.sin(x/2)**2+Math.cos(aLat*rad)*Math.cos(bLat*rad)*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}

function normalizeCorner(c){
  const lat=Number(c?.lat),lon=Number(c?.lon);
  return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
}

function solveLinear(A,b){
  const n=b.length,M=A.map((row,i)=>[...row,b[i]]);
  for(let col=0;col<n;col++){
    let pivot=col;
    for(let r=col+1;r<n;r++)if(Math.abs(M[r][col])>Math.abs(M[pivot][col]))pivot=r;
    if(Math.abs(M[pivot][col])<1e-12)return null;
    [M[col],M[pivot]]=[M[pivot],M[col]];
    const div=M[col][col];for(let j=col;j<=n;j++)M[col][j]/=div;
    for(let r=0;r<n;r++){
      if(r===col)continue;const f=M[r][col];if(!f)continue;
      for(let j=col;j<=n;j++)M[r][j]-=f*M[col][j];
    }
  }
  return M.map(row=>row[n]);
}

/*
  Corners must be stored in this order:
  0 = Goal A / left touchline
  1 = Goal B / left touchline
  2 = Goal B / right touchline
  3 = Goal A / right touchline

  The resulting physical field coordinates are:
  Goal A = u 0, Goal B = u 1, left = v 0, right = v 1.
*/
export function buildFieldTransform(rawCorners){
  const corners=(rawCorners||[]).map(normalizeCorner);
  if(corners.length!==4||corners.some(c=>!c))return null;
  const lat0=corners.reduce((s,c)=>s+c.lat,0)/4,lon0=corners.reduce((s,c)=>s+c.lon,0)/4,cos=Math.cos(lat0*rad);
  const local=corners.map(c=>({x:(c.lon-lon0)*rad*cos*R,y:(c.lat-lat0)*rad*R}));
  const targets=[[0,0],[1,0],[1,1],[0,1]],A=[],b=[];
  for(let i=0;i<4;i++){
    const{x,y}=local[i],[u,v]=targets[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
    A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);
  }
  const h=solveLinear(A,b);if(!h)return null;
  const project=(lat,lon)=>{
    const x=(Number(lon)-lon0)*rad*cos*R,y=(Number(lat)-lat0)*rad*R,den=h[6]*x+h[7]*y+1;
    if(!Number.isFinite(den)||Math.abs(den)<1e-10)return{u:NaN,v:NaN};
    return{u:(h[0]*x+h[1]*y+h[2])/den,v:(h[3]*x+h[4]*y+h[5])/den};
  };
  const goalACentre={lat:(corners[0].lat+corners[3].lat)/2,lon:(corners[0].lon+corners[3].lon)/2};
  const goalBCentre={lat:(corners[1].lat+corners[2].lat)/2,lon:(corners[1].lon+corners[2].lon)/2};
  const leftMid={lat:(corners[0].lat+corners[1].lat)/2,lon:(corners[0].lon+corners[1].lon)/2};
  const rightMid={lat:(corners[3].lat+corners[2].lat)/2,lon:(corners[3].lon+corners[2].lon)/2};
  return{
    project,
    fieldCalibrated:true,
    lengthM:haversineMeters(goalACentre.lat,goalACentre.lon,goalBCentre.lat,goalBCentre.lon),
    widthM:haversineMeters(leftMid.lat,leftMid.lon,rightMid.lat,rightMid.lon),
    center:{lat:lat0,lon:lon0}
  };
}

export function chooseNearestPitch(samples,pitches){
  const gps=(samples||[]).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));
  if(!gps.length||!(pitches||[]).length)return null;
  const lat=gps.reduce((s,p)=>s+p.lat,0)/gps.length,lon=gps.reduce((s,p)=>s+p.lon,0)/gps.length;
  let best=null,bestDistance=Infinity;
  for(const p of pitches){
    const plat=Number(p.center_lat),plon=Number(p.center_lon),radius=Number(p.match_radius_m)||250;
    if(!p.is_active||!Number.isFinite(plat)||!Number.isFinite(plon)||!Array.isArray(p.corners)||p.corners.length!==4)continue;
    const d=haversineMeters(lat,lon,plat,plon);
    if(d<=radius&&d<bestDistance){best=p;bestDistance=d}
  }
  return best?{...best,distanceFromTrackM:+bestDistance.toFixed(1)}:null;
}

export function periodIndexAt(tSec,periods){
  if(!Array.isArray(periods)||!periods.length)return-1;
  return periods.findIndex(p=>Number(tSec)>=Number(p.startSec)&&Number(tSec)<=Number(p.endSec));
}

export function normalizeAttackU(u,tSec,{periods=[],firstPeriodAttack=null}={}){
  const first=Number(firstPeriodAttack);
  if(first!==1&&first!==-1)return{u:clamp(u,0,1),periodIndex:-1,reliable:false};
  const idx=periodIndexAt(tSec,periods);
  if(idx<0)return{u:null,periodIndex:-1,reliable:true};
  const direction=idx%2===0?first:-first;
  return{u:clamp(direction>0?u:1-u,0,1),periodIndex:idx,reliable:true};
}
