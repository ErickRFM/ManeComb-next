"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OperationalUnitSnapshot } from "@/src/core/contracts/telemetry";
import { useSocket } from "@/src/hooks/useSocket";
import { fleetMarkerState, fleetToGeoJson, shouldClusterFleet } from "@/src/lib/fleet-density";

type Filter="all"|"live"|"risk"|"lost";
const emptyCollection={type:"FeatureCollection" as const,features:[] as any[]};

export function LiveMap(){
  const container=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const markers=useRef(new Map<string,any>());
  const programmaticCamera=useRef(false);
  const unitsRef=useRef<OperationalUnitSnapshot[]>([]);
  const socket=useSocket();

  const [units,setUnits]=useState<OperationalUnitSnapshot[]>([]);
  const [mapReady,setMapReady]=useState(false);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState<Filter>("all");
  const [cameraMode,setCameraMode]=useState<"auto"|"free">("auto");
  const [error,setError]=useState("");

  useEffect(()=>{unitsRef.current=units},[units]);

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/locations/live").then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"No se pudo cargar la flota");
      if(!cancelled)setUnits(data.units||[]);
    }).catch(err=>!cancelled&&setError(err.message));
    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    const onSnapshot=(snapshot:OperationalUnitSnapshot)=>{
      setUnits(current=>{
        const index=current.findIndex(unit=>unit.vehicleId===snapshot.vehicleId);
        if(index<0)return [...current,snapshot];
        const next=[...current];next[index]=snapshot;return next;
      });
    };
    socket.on("location:snapshot",onSnapshot);
    return()=>{socket.off("location:snapshot",onSnapshot)};
  },[socket]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return units.filter(unit=>{
      const matches=!q||unit.economicNumber.toLowerCase().includes(q)||(unit.routeName||"").toLowerCase().includes(q);
      if(!matches)return false;
      if(filter==="live")return unit.freshness==="live";
      if(filter==="risk")return unit.isOffRoute||["stale","delayed"].includes(unit.freshness);
      if(filter==="lost")return unit.freshness==="lost";
      return true;
    });
  },[units,search,filter]);

  const clustered=shouldClusterFleet(filtered.length);
  const selected=units.find(unit=>unit.vehicleId===selectedId)||null;

  useEffect(()=>{
    let disposed=false;
    void import("mapbox-gl").then(module=>{
      if(disposed||!container.current||mapRef.current)return;
      const mapboxgl=module.default;
      const token=process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if(!token){setError("Falta NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN");return}
      mapboxgl.accessToken=token;
      const light=document.documentElement.dataset.theme==="light";
      const map=new mapboxgl.Map({
        container:container.current,
        style:light?"mapbox://styles/mapbox/light-v11":"mapbox://styles/mapbox/dark-v11",
        center:[-98.2,19.3],
        zoom:10,
        attributionControl:false
      });
      map.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");
      const unlock=()=>{if(!programmaticCamera.current)setCameraMode("free")};
      map.on("dragstart",unlock);
      map.on("zoomstart",unlock);

      map.on("load",()=>{
        map.addSource("fleet-density",{
          type:"geojson",
          data:emptyCollection,
          cluster:true,
          clusterMaxZoom:14,
          clusterRadius:55
        });
        map.addLayer({
          id:"fleet-clusters",
          type:"circle",
          source:"fleet-density",
          filter:["has","point_count"],
          layout:{visibility:"none"},
          paint:{
            "circle-color":["step",["get","point_count"],"#e11d48",100,"#be123c",300,"#881337"],
            "circle-radius":["step",["get","point_count"],20,100,26,300,32],
            "circle-stroke-color":"#ffffff",
            "circle-stroke-width":2
          }
        });
        map.addLayer({
          id:"fleet-cluster-count",
          type:"symbol",
          source:"fleet-density",
          filter:["has","point_count"],
          layout:{visibility:"none","text-field":["get","point_count_abbreviated"],"text-size":11},
          paint:{"text-color":"#ffffff"}
        });
        map.addLayer({
          id:"fleet-unclustered",
          type:"circle",
          source:"fleet-density",
          filter:["!",["has","point_count"]],
          layout:{visibility:"none"},
          paint:{
            "circle-color":["match",["get","state"],"danger","#fb7185","warn","#f59e0b","#22c55e"],
            "circle-radius":9,
            "circle-stroke-color":"#ffffff",
            "circle-stroke-width":2
          }
        });

        map.on("click","fleet-clusters",(event:any)=>{
          const feature=map.queryRenderedFeatures(event.point,{layers:["fleet-clusters"]})[0] as any;
          const clusterId=feature?.properties?.cluster_id;
          if(clusterId==null)return;
          const source=map.getSource("fleet-density") as any;
          source.getClusterExpansionZoom(clusterId,(err:any,zoom:number)=>{
            if(err)return;
            map.easeTo({center:(feature.geometry as any).coordinates,zoom,duration:400});
          });
        });
        map.on("click","fleet-unclustered",(event:any)=>{
          const feature=event.features?.[0];
          const vehicleId=String(feature?.properties?.vehicleId||"");
          const unit=unitsRef.current.find(item=>item.vehicleId===vehicleId);
          if(!unit)return;
          setSelectedId(vehicleId);
          if(unit.longitude!==null&&unit.latitude!==null)map.easeTo({center:[unit.longitude,unit.latitude],zoom:15.5,duration:420});
        });
        for(const layer of ["fleet-clusters","fleet-unclustered"]){
          map.on("mouseenter",layer,()=>{map.getCanvas().style.cursor="pointer"});
          map.on("mouseleave",layer,()=>{map.getCanvas().style.cursor=""});
        }
        setMapReady(true);
      });
      mapRef.current=map;
    });
    return()=>{disposed=true;markers.current.forEach(marker=>marker.remove?.());markers.current.clear();mapRef.current?.remove?.();mapRef.current=null};
  },[]);

  function fitToFleet(){
    const map=mapRef.current;
    if(!map||!mapReady)return;
    const located=filtered.filter(unit=>unit.latitude!==null&&unit.longitude!==null);
    if(!located.length)return;
    void import("mapbox-gl").then(({default:mapboxgl})=>{
      programmaticCamera.current=true;
      if(located.length===1){
        map.easeTo({center:[located[0].longitude as number,located[0].latitude as number],zoom:14,duration:450});
      }else{
        const bounds=new mapboxgl.LngLatBounds();
        located.forEach(unit=>bounds.extend([unit.longitude as number,unit.latitude as number]));
        map.fitBounds(bounds,{padding:{top:90,right:90,bottom:110,left:390},maxZoom:15,duration:500});
      }
      window.setTimeout(()=>{programmaticCamera.current=false},600);
    });
  }

  useEffect(()=>{
    if(!mapReady)return;
    const map=mapRef.current;
    const source=map.getSource("fleet-density") as any;
    if(source)source.setData(clustered?fleetToGeoJson(filtered):emptyCollection);
    for(const layer of ["fleet-clusters","fleet-cluster-count","fleet-unclustered"]){
      if(map.getLayer(layer))map.setLayoutProperty(layer,"visibility",clustered?"visible":"none");
    }

    if(clustered){
      markers.current.forEach(marker=>marker.remove?.());
      markers.current.clear();
      if(cameraMode==="auto")fitToFleet();
      return;
    }

    const visibleIds=new Set(filtered.map(unit=>unit.vehicleId));
    markers.current.forEach((marker,id)=>{
      if(!visibleIds.has(id)){marker.remove();markers.current.delete(id)}
    });

    void import("mapbox-gl").then(({default:mapboxgl})=>{
      for(const unit of filtered){
        if(unit.latitude===null||unit.longitude===null)continue;
        const state=fleetMarkerState(unit);
        let marker=markers.current.get(unit.vehicleId);
        if(!marker){
          const el=document.createElement("button");
          el.type="button";
          el.className="fleet-marker "+state;
          el.setAttribute("aria-label","Seleccionar "+unit.economicNumber);
          el.innerHTML="<span>"+unit.economicNumber.replace(/[^A-Za-z0-9]/g,"").slice(-3)+"</span>";
          el.addEventListener("click",()=>{
            setSelectedId(unit.vehicleId);
            const current=unitsRef.current.find(item=>item.vehicleId===unit.vehicleId)||unit;
            if(current.latitude!==null&&current.longitude!==null){
              programmaticCamera.current=true;
              map.easeTo({center:[current.longitude,current.latitude],zoom:15.5,duration:450});
              window.setTimeout(()=>{programmaticCamera.current=false},550);
            }
          });
          marker=new mapboxgl.Marker({element:el,anchor:"center"}).setLngLat([unit.longitude,unit.latitude]).addTo(map);
          markers.current.set(unit.vehicleId,marker);
        }else{
          marker.setLngLat([unit.longitude,unit.latitude]);
          const el=marker.getElement();
          el.className="fleet-marker "+state+(selectedId===unit.vehicleId?" selected":"");
        }
      }
      if(cameraMode==="auto")fitToFleet();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[filtered,mapReady,selectedId,cameraMode,clustered]);

  function selectUnit(unit:OperationalUnitSnapshot){
    setSelectedId(unit.vehicleId);
    const map=mapRef.current;
    if(map&&unit.latitude!==null&&unit.longitude!==null){
      programmaticCamera.current=true;
      map.easeTo({center:[unit.longitude,unit.latitude],zoom:15.5,duration:450});
      window.setTimeout(()=>{programmaticCamera.current=false},550);
    }
  }

  function enableAutoCamera(){setCameraMode("auto");window.setTimeout(fitToFleet,0)}

  return <div className="fleet-view">
    <div className="fleet-toolbar">
      <div className="fleet-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar unidad o ruta..." aria-label="Buscar unidad o ruta"/></div>
      <div className="fleet-filters" role="group" aria-label="Filtros de flota">
        {([["all","Todas"],["live","En vivo"],["risk","Atención"],["lost","Sin GPS"]] as const).map(([value,label])=><button key={value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{label}<span>{value==="all"?units.length:value==="live"?units.filter(u=>u.freshness==="live").length:value==="risk"?units.filter(u=>u.isOffRoute||["stale","delayed"].includes(u.freshness)).length:units.filter(u=>u.freshness==="lost").length}</span></button>)}
      </div>
      {clustered?<span className="cluster-mode-badge">Clusters · {filtered.length}</span>:null}
      <button className={"camera-mode "+(cameraMode==="auto"?"active":"")} onClick={enableAutoCamera}>◎ {cameraMode==="auto"?"Auto":"Recentrar"}</button>
    </div>

    {error?<div className="fleet-map-error" role="alert">{error}</div>:null}

    <div className="fleet-stage">
      <aside className="fleet-list-panel" aria-label="Lista de unidades visibles">
        <div className="fleet-panel-heading"><div><strong>Flota</strong><span>{filtered.length} visibles</span></div><span className="live-badge"><span className="live-dot"/>Live</span></div>
        <div className="fleet-list-scroll">
          {filtered.map(unit=><button key={unit.vehicleId} className={"fleet-list-item "+(selectedId===unit.vehicleId?"selected":"")} onClick={()=>selectUnit(unit)} aria-pressed={selectedId===unit.vehicleId}>
            <span className={"fleet-list-state "+fleetMarkerState(unit)}/>
            <span className="fleet-list-copy"><strong>{unit.economicNumber}</strong><small>{unit.routeName||"Sin ruta"}</small></span>
            <span className="fleet-list-stats"><strong>{unit.speedKmH.toFixed(0)}</strong><small>km/h</small></span>
            <span className="fleet-list-stats"><strong>{unit.etaMinutes==null?"—":unit.etaMinutes}</strong><small>min ETA</small></span>
          </button>)}
          {!filtered.length?<div className="empty-state compact"><strong>Sin coincidencias</strong><span>Ajusta búsqueda o filtros.</span></div>:null}
        </div>
      </aside>

      <div ref={container} className="fleet-map-canvas" role="region" aria-label="Mapa de monitoreo en vivo"/>

      {selected?<aside className="unit-detail-panel" aria-label={"Detalle de "+selected.economicNumber}>
        <div className="unit-detail-head"><div><span className={"unit-status-dot "+fleetMarkerState(selected)}/><div><strong>{selected.economicNumber}</strong><small>{selected.routeName||"Sin ruta asignada"}</small></div></div><button className="icon-action" onClick={()=>setSelectedId(null)} aria-label="Cerrar detalle">×</button></div>
        <div className="unit-detail-status">
          <span className={"health-chip "+fleetMarkerState(selected)}>{selected.freshness}</span>
          {selected.routeState?<span className={"health-chip "+(selected.isOffRoute?"danger":"neutral")}>{selected.isOffRoute?"Fuera de ruta":selected.routeState}</span>:null}
        </div>
        <div className="unit-detail-grid">
          <div><small>Velocidad</small><strong>{selected.speedKmH.toFixed(0)} km/h</strong></div>
          <div><small>Avance</small><strong>{selected.progressPercent==null?"—":selected.progressPercent.toFixed(0)+"%"}</strong></div>
          <div><small>ETA</small><strong>{selected.etaMinutes==null?"—":selected.etaMinutes+" min"}</strong></div>
          <div><small>Corredor</small><strong>{selected.distanceFromRouteM==null?"—":selected.distanceFromRouteM+" m"}</strong></div>
        </div>
        {selected.nextStop?<div className="next-stop-card"><small>PRÓXIMA PARADA</small><strong>{selected.nextStop.name}</strong><span>{selected.nextStop.distanceRemainingM} m restantes</span></div>:null}
        <div className="unit-detail-footer"><span>Último GPS</span><strong>{selected.recordedAt?new Date(selected.recordedAt).toLocaleTimeString():"Sin reporte"}</strong></div>
      </aside>:null}
    </div>
  </div>;
}
