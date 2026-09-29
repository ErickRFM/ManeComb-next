export type GeoPoint = { latitude:number; longitude:number };
export type RouteState = "ON_ROUTE"|"NEAR_ROUTE"|"POSSIBLE_DEVIATION"|"OFF_ROUTE_CONFIRMED"|"RECOVERING";

const EARTH_RADIUS_M=6_371_000;
export const ROUTE_CORRIDOR={
  onRouteMeters:65,
  nearRouteMeters:120,
  possibleDeviationMeters:220,
  hardDeviationMeters:650,
  deviationConfirmSeconds:45
} as const;

function radians(value:number){return value*Math.PI/180}
function valid(point:any):point is GeoPoint{
  return Number.isFinite(Number(point?.latitude))&&Number.isFinite(Number(point?.longitude));
}
export function distanceMeters(a:GeoPoint,b:GeoPoint){
  const dLat=radians(b.latitude-a.latitude);
  const dLon=radians(b.longitude-a.longitude);
  const latA=radians(a.latitude);
  const latB=radians(b.latitude);
  const h=Math.sin(dLat/2)**2+Math.cos(latA)*Math.cos(latB)*Math.sin(dLon/2)**2;
  return 2*EARTH_RADIUS_M*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function xy(point:GeoPoint,origin:GeoPoint){
  const lat0=radians(origin.latitude);
  return {
    x:radians(point.longitude-origin.longitude)*EARTH_RADIUS_M*Math.cos(lat0),
    y:radians(point.latitude-origin.latitude)*EARTH_RADIUS_M
  };
}
function projectSegment(point:GeoPoint,start:GeoPoint,end:GeoPoint){
  const p=xy(point,start),a={x:0,y:0},b=xy(end,start);
  const dx=b.x-a.x,dy=b.y-a.y;
  const denominator=dx*dx+dy*dy;
  const t=denominator===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/denominator));
  const projected={x:a.x+t*dx,y:a.y+t*dy};
  const latitude=start.latitude+(end.latitude-start.latitude)*t;
  const longitude=start.longitude+(end.longitude-start.longitude)*t;
  return {t,distance:Math.hypot(p.x-projected.x,p.y-projected.y),point:{latitude,longitude}};
}
export function projectPointOnRoute(point:GeoPoint,geometry:GeoPoint[]){
  const points=geometry.filter(valid);
  if(points.length<2)return null;
  let total=0;
  const lengths:number[]=[];
  for(let i=1;i<points.length;i++){const length=distanceMeters(points[i-1],points[i]);lengths.push(length);total+=length}
  let traversed=0;
  let best:{distance:number;along:number;point:GeoPoint}|null=null;
  for(let i=1;i<points.length;i++){
    const projection=projectSegment(point,points[i-1],points[i]);
    const along=traversed+lengths[i-1]*projection.t;
    if(!best||projection.distance<best.distance)best={distance:projection.distance,along,point:projection.point};
    traversed+=lengths[i-1];
  }
  if(!best)return null;
  return {
    totalDistanceM:total,
    distanceAlongM:best.along,
    distanceRemainingM:Math.max(0,total-best.along),
    distanceFromRouteM:best.distance,
    progressPercent:total>0?Math.max(0,Math.min(100,best.along/total*100)):0,
    snappedLocation:best.point
  };
}
export function resolveRouteState(input:{
  distanceFromRouteM:number;
  previous?:{routeState?:RouteState;deviationStartedAt?:string|null}|null;
  now?:Date;
}){
  const now=input.now||new Date();
  const previousState=input.previous?.routeState||"ON_ROUTE";
  if(input.distanceFromRouteM<=ROUTE_CORRIDOR.onRouteMeters){
    return {routeState:(previousState==="OFF_ROUTE_CONFIRMED"?"RECOVERING":"ON_ROUTE") as RouteState,deviationStartedAt:null,deviationDurationSeconds:0};
  }
  if(input.distanceFromRouteM<=ROUTE_CORRIDOR.nearRouteMeters){
    return {routeState:(previousState==="OFF_ROUTE_CONFIRMED"?"RECOVERING":"NEAR_ROUTE") as RouteState,deviationStartedAt:null,deviationDurationSeconds:0};
  }
  const started=input.previous?.deviationStartedAt?new Date(input.previous.deviationStartedAt):now;
  const duration=Math.max(0,Math.round((now.getTime()-started.getTime())/1000));
  if(input.distanceFromRouteM>=ROUTE_CORRIDOR.hardDeviationMeters){
    return {routeState:"OFF_ROUTE_CONFIRMED" as RouteState,deviationStartedAt:started.toISOString(),deviationDurationSeconds:duration};
  }
  const confirmed=input.distanceFromRouteM>=ROUTE_CORRIDOR.possibleDeviationMeters&&duration>=ROUTE_CORRIDOR.deviationConfirmSeconds;
  return {routeState:(confirmed?"OFF_ROUTE_CONFIRMED":"POSSIBLE_DEVIATION") as RouteState,deviationStartedAt:started.toISOString(),deviationDurationSeconds:duration};
}
export function nextRouteStop(stops:any[],geometry:GeoPoint[],distanceAlongM:number){
  const projected=(Array.isArray(stops)?stops:[]).map(stop=>{
    if(!valid(stop))return null;
    const p=projectPointOnRoute({latitude:Number(stop.latitude),longitude:Number(stop.longitude)},geometry);
    return p?{name:String(stop.name||"Parada"),order:Number(stop.order||0),distanceAlongM:p.distanceAlongM,latitude:Number(stop.latitude),longitude:Number(stop.longitude)}:null;
  }).filter(Boolean) as Array<{name:string;order:number;distanceAlongM:number;latitude:number;longitude:number}>;
  return projected.filter(stop=>stop.distanceAlongM+20>=distanceAlongM).sort((a,b)=>a.distanceAlongM-b.distanceAlongM||a.order-b.order)[0]||null;
}
