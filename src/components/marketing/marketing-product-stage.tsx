import { BrandLogo } from "@/src/components/brand-logo";
import { Icon } from "@/src/components/ui/icon";

export function MarketingProductStage(){
  return <div className="marketing-stage" role="img" aria-label="Vista del portal operativo ManeComb">
    <div className="marketing-stage-window">
      <aside className="marketing-stage-sidebar" aria-hidden="true">
        <div className="marketing-stage-brand"><BrandLogo size="sm" tone="light"/></div>
        <nav className="marketing-stage-nav">
          <span className="active"><Icon name="map" size={15}/>Mapa</span>
          <span><Icon name="vehicle" size={15}/>Unidades</span>
          <span><Icon name="route" size={15}/>Rutas</span>
          <span><Icon name="chat" size={15}/>Chat</span>
          <span><Icon name="radio" size={15}/>Radio</span>
        </nav>
        <div className="marketing-stage-sidebar-foot"><span className="marketing-live-dot"/>Sistema activo</div>
      </aside>

      <div className="marketing-stage-main">
        <header className="marketing-stage-topbar" aria-hidden="true">
          <div><strong>Monitoreo</strong><span>Operación en vivo</span></div>
          <div className="marketing-stage-top-actions"><span>3 unidades activas</span><span className="marketing-live-chip"><i/>En vivo</span></div>
        </header>

        <div className="marketing-stage-map" aria-hidden="true">
          <svg className="marketing-stage-map-svg" viewBox="0 0 760 470" role="presentation">
            <path className="marketing-map-road" d="M-50 360C120 250 195 420 360 310S615 170 820 250"/>
            <path className="marketing-map-road thin" d="M40 70C170 130 210 215 330 205S540 85 760 120"/>
            <path className="marketing-map-road thin" d="M145-20C120 130 230 170 215 330S300 430 360 510"/>
            <path className="marketing-map-road subtle" d="M500-30C465 130 535 180 520 305S620 390 740 430"/>
            <path className="marketing-route-path" d="M110 345C205 292 272 352 346 298S455 228 554 215S635 193 685 145"/>
          </svg>

          <div className="marketing-map-label label-a">Centro</div>
          <div className="marketing-map-label label-b">Terminal Norte</div>
          <div className="marketing-map-label label-c">Av. Reforma</div>

          <span className="marketing-stage-unit unit-a"><Icon name="vehicle" size={14}/><b>C-3</b></span>
          <span className="marketing-stage-unit unit-b selected"><Icon name="vehicle" size={14}/><b>C-5</b></span>
          <span className="marketing-stage-unit unit-c"><Icon name="vehicle" size={14}/><b>C-8</b></span>

          <div className="marketing-stage-route-card">
            <span className="marketing-stage-card-kicker">UNIDAD SELECCIONADA</span>
            <div className="marketing-stage-unit-row"><span className="marketing-stage-avatar">C-5</span><div><strong>Unidad C-5</strong><small>Ana Torres · Ruta Centro</small></div><span className="marketing-stage-status"><i/>En ruta</span></div>
            <div className="marketing-stage-metrics"><div><span>Velocidad</span><strong>38 km/h</strong></div><div><span>GPS</span><strong>Hace 12 s</strong></div><div><span>Jornada</span><strong>02:48 h</strong></div></div>
            <div className="marketing-stage-actions"><span><Icon name="chat" size={13}/>Chat</span><span><Icon name="radio" size={13}/>Radio</span><span><Icon name="route" size={13}/>Ruta</span></div>
          </div>

          <div className="marketing-stage-float marketing-stage-float-live"><span className="marketing-live-dot"/>GPS actualizado</div>
          <div className="marketing-stage-float marketing-stage-float-route"><Icon name="route" size={13}/><span><b>Ruta Centro</b><small>12 paradas · 74%</small></span></div>
        </div>
      </div>
    </div>
  </div>;
}
