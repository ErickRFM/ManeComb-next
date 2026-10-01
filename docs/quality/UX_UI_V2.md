# ManeComb UX/UI V2 — comparación y aceptación

Fecha: 2026-10-01. HEAD real de código del cierre: `ae5c096a139334aac96ce9969d1d5cf998a82f7a`. Base/main `f39e04044cee70f032fe36772edb78c971aa214d`; rama `feat/uxui-system-v2-map-first`, PR #9.
[Referencia aprobada](reference/ux-ui-v2-approved.png), recibida en este cierre y conservada byte a byte. Su SHA256 está en FINAL_AUDIT. El HEAD posterior de documentación se verifica en el PR; no se importan validaciones históricas de otros candidatos.

## Comparación dirigida de las nueve superficies

| Superficie | Ajuste / funcionamiento real | Límite de certificación |
|---|---|---|
| Portal / Mapa | Sidebar y títulos compactados, lista derecha, detalle inferior; Mapbox real, filtros/búsqueda/selección/clusters/cámara | Se usan estilos Mapbox de calle dark/light actuales; no se añadió botón 3D decorativo, batería ni datos de la imagen sin fuente real |
| Portal / Resumen | Métricas existentes, donut accesible calculado con snapshots GPS reales y estados/alertas actuales | No hay serie histórica 24 h ni actividad/batería inventadas; métricas mantienen su significado original |
| Portal / Rutas | Listado real lateral dentro del editor, búsqueda/enlaces/permisos actuales, mapa/geom/paradas/guardado/revisión existentes | Columna se apila en pantallas estrechas; formulario real conserva edición accesible, sin acciones decorativas |
| Ventas / Landing | Hero a la izquierda, jerarquía compacta, catálogo/módulos/planes reales, navegación y checkout conservados | La imagen adjunta es collage de referencia; no hay assets separados del vehículo/logo ni capturas comerciales del destino real. No se fabricaron screenshots/producto |
| App / Login | Acceso operativo centrado, wordmark tipográfico, campos y submit reales, recuperación/activación funcionales, sin marketing | Conductor se activa con el flujo existente; no se añadió registro comercial, login por teléfono ni persistencia de sesión ficticia |
| App / Home | Jornada/ruta/GPS existentes, navegación inferior al borde, SOS conservado; mapa y controles reales en ambos temas | GPS/Doze/buffer/red requieren físico; no se inventó botón de llamada sin destinatario/contrato |
| App / Chat | Título/densidad y bottom nav compactados; directorio real, historial, DM, adjuntos, recepción, ACK/reintento conservados | No existen previews/unread/avatares reales del contrato de la imagen; no se mostraron badges ni personas ficticias |
| App / Radio/RTC | Superficie PTT con aro/micrófono, presencia con nombres reales e iniciales; floor/ACK/audio y llamadas actuales | Audio entre redes/latencia/calidad físicos y TURN pendientes; iniciales no simulan fotos |
| App / Documentos | Se revisó alcance real: POST/descarga móvil de documentos propios del driver, listado sólo Portal; no existe pantalla móvil de la referencia | **PENDIENTE DE ALCANCE**: conductor/unidad de la imagen necesitan pantalla y autorización de lectura consistente. Se conservan contratos hasta resolverlo |

Se corrigieron diferencias demostrables de presentación sin sustituir APIs, Socket.IO, almacenamiento, GPS nativo ni pagos. La fidelidad total permanece pendiente; comparar una imagen no equivale a aprobar el resultado implementado.

## Criterios y evidencias

**PASS LOCAL:** pruebas funcionales con HTTP/socket QA aislados y MediaRecorder/AudioContext reales; integración con Atlas/Redis QA independientes. Mapbox usa el proveedor real: estilos, tiles/fonts, markers proyectados, 0/1/20/100/500, clusters/expansión, búsqueda/filtros, lista/mapa, auto/manual, padding/resize, dark/light y siete anchuras con 500 puntos. Los resultados finales y contadores están en FINAL_AUDIT; no acreditar proveedores externos con respuestas QA.

**PASS CI:** verificar Node 20/24, Docker, UX y Android API 33–36 del HEAD publicado exacto del PR. Snapshot final `artifacts/release-ci-exact-head.json`. Android CI acredita build/install/start/orientación de fixture, no background físico.

**PASS STAGING / PASS FÍSICO:** ninguno acreditado. **BLOCKED EXTERNAL:** entorno aislado/configuración real de proveedores, TURN/dominio/capacidad destino y `PHYSICAL_DEVICE_REQUIRED`. Checklist y estados por proveedor en RELEASE_READINESS.

Responsive: 360/390/430/768/1024/1366/1920, dark/light, cero overflow accidental y cero axe serious/critical exigidos. Login operativo y Radio de App añadidos a la matriz; foco, teclado y permisos se conservan. Regresiones Mapbox comprueban geometría real, no sólo existencia de canvas/DOM.

## Reproducción

```powershell
npm run typecheck
npm test
npm run test:integration:local
node --env-file=.env.local scripts/test-local-visual.mjs --mapbox
node scripts/test-local-visual.mjs --functional
node scripts/test-local-visual.mjs --responsive
node scripts/test-local-visual.mjs
npm run build
node --env-file=.env.local scripts/test-local-operations.mjs --production
```

Integración local ejecuta el mismo Vitest/config de `npm run test:integration` con DB/namespace QA temporales; no correr la suite contra la DB compartida original. No ejecutar dev y build simultáneamente. Después de QA dev reconstruir antes del E2E compilado. Playwright/axe son herramientas QA; los fixtures sólo se habilitan en QA. El filtro opcional QA_FILTER permite repetir casos dirigidos sin rebajar la matriz completa.

**NOT_READY.** PR en draft. Sin merge, creación/deploy Render ni cambio de producción hasta cerrar los gates requeridos.
