import { Icon } from "@/src/components/ui/icon";

export function MarketingProductPreview({compact=false}:{compact?:boolean}){
  return <div className={"product-preview "+(compact?"compact":"")} aria-label="Vista previa ilustrativa del producto ManeComb">
    <div className="product-preview-topbar">
      <span><span className="product-preview-dot"/>Monitoreo en vivo</span>
      <span className="product-preview-time">Hace 12 s</span>
    </div>
    <div className="product-preview-map" aria-hidden="true">
      <div className="preview-road preview-road-a"/>
      <div className="preview-road preview-road-b"/>
      <div className="preview-road preview-road-c"/>
      <div className="preview-route"/>
      <span className="preview-unit preview-unit-main"><Icon name="vehicle"/></span>
      <span className="preview-unit preview-unit-secondary"><Icon name="vehicle"/></span>
      <span className="preview-unit preview-unit-third"><Icon name="vehicle"/></span>
    </div>
    <div className="product-preview-card">
      <div className="product-preview-unit">
        <span className="preview-avatar">C-5</span>
        <div><strong>Unidad C-5</strong><small>Ana Torres · Ruta Centro</small></div>
      </div>
      <span className="preview-status"><span/>En ruta</span>
      <div className="preview-metrics">
        <div><small>Velocidad</small><strong>38 km/h</strong></div>
        <div><small>GPS</small><strong>Hace 12 s</strong></div>
      </div>
      <div className="preview-actions"><span><Icon name="chat"/>Chat</span><span><Icon name="radio"/>Radio</span><span><Icon name="route"/>Ruta</span></div>
    </div>
  </div>;
}
