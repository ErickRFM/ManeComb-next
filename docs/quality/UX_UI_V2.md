# ManeComb UX/UI V2 — aceptación

Base `f39e040`; rama `feat/uxui-system-v2-map-first`. La referencia visual exigida no está en el adjunto recibido (sólo texto). Se implementan los cambios funcionales y estructurales explícitos; la comparación visual, el diseño definitivo y las capturas comerciales quedan pendientes de esa imagen. No hay certificación visual ni autorización para desplegar Render.

## Superficies y contratos conservados

| Superficie | Implementación | Evidencia y límite |
|---|---|---|
| Portal | `/portal` y login company → `/portal/monitoreo`; Resumen secundario; menú por permisos reales | Redirecciones, viewer y foco del drawer probados |
| Mapa | LiveMap/Mapbox/Socket.IO existentes; selección/filtros y detalle Resumen/Ruta/Incidencias/Documentos/Telemetría | Datos de APIs existentes, 403 diferenciado, tres alturas móviles; sin historial de GPS inventado |
| App | `/app` valida sesión; manifest/Capacitor raíz → `/app`; Mapa/Chat/Radio/Alertas/Más y SOS | Inicio y deep links conservan login operativo; controles GPS persisten entre tabs |
| Chat | `/portal/chat` y `/operacion/chat`; general/directo, historial, recepción, imágenes, presencia | Merge/dedup, timeout ACK, reintento con mismo ID, borradores y pendientes en memoria; no se inventa unread |
| Radio/RTC | Canales/floor/audio y offer/answer/ice/hangup originales; ACK de audio opcional y compatible | PTT libera micrófono al perder foco, entrega fragmento final antes de liberar floor; directorio real; dos peers Chromium conectan, cuelgan y repiten llamada |
| Rutas | GET/POST/PATCH originales, geometría/paradas/revisión | Segundo guardado actualiza el mismo ID; edición numérica funciona sin proveedor cartográfico |
| Gestión | APIs originales de vehículos, drivers, documentos e incidencias | Mutaciones recuperables, permisos, inputs conservados; conductor editable sin modificar activación |
| Incidencias | Gestores autorizados y usuario reportante; HTTP/socket/push con scope | Driver no ve reportes ajenos. Modelo actual contiene tipo/estado/unidad/reportante/mensaje/coordenadas; no hay ruta, evidencia adjunta ni severidad independiente que se pueda mostrar como dato real |
| Ventas | Header/Hero/Producto/Funciones/Cómo/Módulos/Planes/FAQ/CTA/Footer | Enlaces funcionales; catálogo `COMMERCIAL_PLANS`; plan persiste registro/login→checkout; sin mockups ni descarga ficticia |
| Facturación | Suscripción y comprobantes/manual review existentes | Errores/reintentos visibles; ninguna tarifa, conciliación ni autoridad financiera sustituida |
| Admin | Empresas, salud/métricas, pagos, versiones y auditoría | MFA/autorización existentes; estados recuperables, drawer y logout compartidos |

## Design system y QA

CSS dividido en módulos importados desde `app/globals.css`. El primer refactor conservó las reglas y su orden byte a byte. Cambios posteriores corrigen contraste con `--brand-text` y texto secundario, overflow documental, iconos SVG, foco/labels y responsive; no incorporan framework visual.

Orden GPS: coordenadas más nuevas prevalecen; para timestamps iguales, HTTP sólo reemplaza estado no modificado desde que inició su petición. Un sweeper recibido durante HTTP no rejuvenece freshness al llegar esa respuesta. La caché anterior sí permite actualización HTTP posterior. Padding de cámara usa dimensiones del contenedor y posición del panel móvil, conservando espacio visible incluso en landscape corto; su render live sigue pendiente.

QA aislada utiliza datos de prueba únicamente en tests y rutas de fixtures protegidas por `VISUAL_QA`. Las páginas reales usan respuestas HTTP/socket controladas en navegador; esto prueba presentación y contratos, no sustituye providers live. Atlas/Redis se prueban aparte en bases/namespaces QA temporales con propiedad verificada y cleanup.

Comandos reproducibles con Node 20:

```powershell
npm run typecheck
npm test
node --env-file=.env.local scripts/test-local-integration.mjs
npm run build
node --env-file=.env.local scripts/test-local-operations.mjs --production
node scripts/test-local-visual.mjs --functional
node scripts/test-local-visual.mjs --responsive
node --env-file=.env.local scripts/test-local-visual.mjs --mapbox
node --env-file=.env.local scripts/predeploy-check.mjs --role=web
node --env-file=.env.local scripts/predeploy-check.mjs --role=worker
```

No correr servidor dev y build simultáneamente. Después de QA dev, reconstruir antes del E2E `--production`. Playwright 1.55.1/axe 4.10.2 son herramientas QA instaladas sin cambios de package/lock; CI las instala explícitamente.

## Gates pendientes

- Imagen aprobada: comparar todas las superficies y producir capturas comerciales del producto final.
- Mapbox: token local alcanza el proveedor, pero el estilo responde HTTP 401; WebGL disponible. Densidades reales 0/1/20/100/500, clusters/cámara y dominio autorizado siguen sin certificación. Helpers de densidad y comportamiento sin proveedor sí están probados.
- TURN/audio: llamada entre peers locales con audio generado PASS; Wi-Fi/LTE/NAT y permisos/audio físicos pendientes.
- Android: Kotlin intacto; no inferir background/Doze/bloqueo/buffer físico por smoke o navegador.
- Resend, Mercado Pago, Cloudinary y Push live: configuración/credenciales/entregas reales pendientes. Integración con providers simulados no activa este gate.
- Staging/capacidad: CI anterior pasó 500 sockets, Atlas local anterior falló; repetir en infraestructura equivalente antes de producción.

Estado V2: **NOT_READY** hasta cubrir referencia y gates aplicables. Un PR revisable con checks verdes no autoriza merge como V2 certificado ni creación/despliegue de recursos Render.
