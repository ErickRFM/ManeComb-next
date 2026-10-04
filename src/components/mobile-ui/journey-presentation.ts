const journeyLabels:Record<string,string>={ASSIGNED:"Preparando jornada",READY:"Lista para iniciar",RUNNING:"En ruta",PAUSED:"Jornada pausada",FINISHED:"Jornada finalizada",CANCELLED:"Jornada cancelada"};
const routeLabels:Record<string,string>={ON_ROUTE:"En ruta",NEAR_ROUTE:"Cerca de la ruta",POSSIBLE_DEVIATION:"Posible desvío",OFF_ROUTE_CONFIRMED:"Fuera de ruta",RECOVERING:"Regresando a la ruta"};
export function journeyStateLabel(state:string){return Object.hasOwn(journeyLabels,state)?journeyLabels[state]:"Estado de jornada no disponible";}
export function distanceLabel(value:number|null|undefined){return value!=null&&Number.isFinite(value)?value+" m":"Sin dato";}
export function orderedStops<T extends {order:number}>(stops:readonly T[]):T[]{return [...stops].sort((a,b)=>a.order-b.order);}
export function routeStateLabel(state:string|null|undefined){return state&&Object.hasOwn(routeLabels,state)?routeLabels[state]:"Estado de ruta no disponible";}
