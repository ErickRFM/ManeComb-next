import { Route } from "@/src/core/models/Route";
import { nextRouteStop, projectPointOnRoute, resolveRouteState } from "@/src/core/domain/route-progress";

type CachedRoute={expiresAt:number;route:any};
const cache=new Map<string,CachedRoute>();
const TTL_MS=30_000;

async function getRoute(organizationId:string,routeId:unknown){
  if(!routeId)return null;
  const key=organizationId+":"+String(routeId);
  const cached=cache.get(key);
  if(cached&&cached.expiresAt>Date.now())return cached.route;
  const route:any=await Route.findOne({_id:routeId,organizationId,status:"active"},null,{lean:true});
  if(route)cache.set(key,{route,expiresAt:Date.now()+TTL_MS});
  return route;
}

export async function calculateOperationalRouteProgress(input:{
  organizationId:string;
  routeId:unknown;
  latitude:number;
  longitude:number;
  speedMps:number;
  recordedAt:Date;
  previous?:any;
}){
  const route=await getRoute(input.organizationId,input.routeId);
  if(!route||!Array.isArray(route.geometry)||route.geometry.length<2)return null;
  const geometry=route.geometry.map((p:any)=>({latitude:Number(p.latitude),longitude:Number(p.longitude)}));
  const projection=projectPointOnRoute({latitude:input.latitude,longitude:input.longitude},geometry);
  if(!projection)return null;
  const state=resolveRouteState({distanceFromRouteM:projection.distanceFromRouteM,previous:input.previous,now:input.recordedAt});
  const effectiveSpeed=input.speedMps>=1?input.speedMps:null;
  const etaSeconds=effectiveSpeed?Math.round(projection.distanceRemainingM/effectiveSpeed):null;
  const next=nextRouteStop(route.stops||[],geometry,projection.distanceAlongM);
  return {
    routeId:String(route._id),
    routeName:route.name,
    routeRevision:Number(route.revision||1),
    progressPercent:Math.round(projection.progressPercent*10)/10,
    distanceAlongM:Math.round(projection.distanceAlongM),
    distanceRemainingM:Math.round(projection.distanceRemainingM),
    distanceFromRouteM:Math.round(projection.distanceFromRouteM),
    routeState:state.routeState,
    isOffRoute:state.routeState==="OFF_ROUTE_CONFIRMED",
    deviationStartedAt:state.deviationStartedAt,
    deviationDurationSeconds:state.deviationDurationSeconds,
    etaMinutes:etaSeconds===null?null:Math.max(0,Math.ceil(etaSeconds/60)),
    etaAt:etaSeconds===null?null:new Date(input.recordedAt.getTime()+etaSeconds*1000).toISOString(),
    nextStop:next?{name:next.name,order:next.order,latitude:next.latitude,longitude:next.longitude,distanceRemainingM:Math.max(0,Math.round(next.distanceAlongM-projection.distanceAlongM))}:null
  };
}
