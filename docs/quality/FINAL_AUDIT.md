# ManeComb UX/UI V2 — auditoría final

Fecha local: 2026-09-30. Rama: `feat/uxui-system-v2-map-first`. Base/main remoto: `f39e04044cee70f032fe36772edb78c971aa214d`.
Commit final de código validado: **`ca315ecbf64a5ed7ba92daffb87c7b2605ae65f6`**. El commit posterior de documentación no cambia código; su SHA de entrega queda en HEAD y en el PR. Los resultados anteriores de main no certifican esta rama.

## Alcance revisado

Portal/Shell/RBAC, Auth/deep links/logout, LiveMap/driver maps/detalle, app instalada/manifest/Capacitor, jornadas/GPS, Chat/presencia/ACK, Radio/floor/media y RTC, rutas/unidades/conductores/documentos/incidencias, landing/planes/checkout/facturación, Admin, tokens/CSS responsive, runners y CI UX. Arquitectura, almacenamiento GPS nativo/Kotlin y autoridades financieras conservados. Fixtures existen sólo para QA; listas y acciones del producto consumen sus APIs.

## Verificación local de cierre

Node 20.20.2/npm 10.8.2; Next 15.5.27. Ninguna validación cambia producción. Atlas/Redis usan DB/namespace QA temporales con propiedad comprobada y cleanup.

| Prueba | Resultado | Evidencia local / alcance |
|---|---|---|
| `npm run typecheck` | PASS | `artifacts/ux-v2-typecheck.log` |
| `npm test` | PASS: 103 pruebas, 36 archivos | `artifacts/ux-v2-unit.log` |
| Integración completa | PASS: 47 pruebas, 7 archivos | `artifacts/ux-v2-integration.log`; Atlas + Redis, providers simulados cuando corresponde |
| `npm run build` | PASS: 81 páginas | `artifacts/ux-v2-build.log`; warning opcional BullMQ/Valkey preexistente |
| E2E compilado | PASS | `artifacts/ux-v2-production-e2e.log`; registro/activación, ruta/unidad/driver, jornada, GPS orden/dedup/revocation, Chat, PTT con ACK/floor/audio, SOS con aislamiento de otro driver, cierre; QA eliminada |
| Navegador funcional | PASS: 24 recorridos | `artifacts/functional-ui-qa/report.json`; páginas reales, HTTP/socket aislados; RTC con dos peers Chromium y PTT con MediaRecorder/decodificación reales y audio generado |
| Responsive | PASS: 308 checks | `artifacts/functional-ui-qa/responsive-report.json`; 22 páginas × 360/390/430/768/1024/1366/1920 × dark/light; cero overflow y cero axe serious/critical |
| Fixtures de diseño | PASS: 56 checks, cero violaciones | `artifacts/visual-qa/report.json`, capturas y foco/teclado; no certifican imagen aprobada |
| Texto ampliado Incidencias | PASS: 14 checks | `artifacts/functional-ui-qa/responsive-text-stress-report.json`; 12 px en labels de métricas, siete anchos/dark-light, RED→GREEN |
| Deploy check web/worker | FAIL esperado de configuración real | `artifacts/ux-v2-deploy-web.log`, `ux-v2-deploy-worker.log`; no se rellenó con valores ficticios |
| Mapbox live | FAIL: HTTP 401 del estilo; WebGL disponible | `artifacts/ux-v2-mapbox.log`; rutas proveedor sin query/token. No certifica densidades 0/1/20/100/500 ni clusters/cámara reales |
| CI del PR | Verificar checks del SHA de entrega | Workflows Node 20/24, Docker, UX y Android API 33–36. No usar CI histórico como evidencia de V2 |

El reporte functional se repitió tras las correcciones de Radio/responsive; padding tiene regresión unitaria adicional y el mapa live sigue bloqueado. Ninguna prueba con respuestas aisladas acredita Resend/Mapbox/Mercado Pago/Cloudinary/TURN/Push productivos ni hardware físico.

## Hallazgos, correcciones y decisiones

Una revisión independiente completa encontró cero críticos confirmados y tres importantes. Se aceptaron los tres; no hubo segunda revisión ni ciclo de agentes:

1. **Editar conductor cerraba su sesión.** `active` opcional entraba en `!input.active`. Ahora sólo `active === false` revoca Session/DeviceSession y desconecta. Integración RED→GREEN conserva ambas credenciales al editar nombre/email y verifica revocación al desactivar.
2. **HTTP tardío rejuvenecía freshness.** `recordedAt` sólo ordenaba coordenadas; el sweeper podía compartir timestamp. Merge conserva referencia inicial de petición: cambios socket posteriores ganan en empate; HTTP posterior actualiza caché anterior. Portal, DriverMapHome y DriverNavigation usan la misma regla y descartan respuestas de consultas anteriores. Dos regresiones cubren ambas direcciones; el caso tardío reprodujo live en lugar de lost antes del fix.
3. **PTT perdía audio final.** Soltar invalidaba el intento antes de dataavailable/stop y liberaba el floor. Finalización normal detiene captura, entrega fragmentos secuencialmente con ACK y luego libera; desconexión/pérdida/unmount cancelan. ACK opcional del evento existente se emite después de validación/broadcast, compatible con emisores anteriores sin ACK. Regresión browser produce audio final inferior a 300 ms y comprueba orden; unitaria ACK RED→GREEN y E2E servidor real PASS.

La inspección propia añadió **padding de cámara inválido en móviles**: 480 px horizontales para canvas de 360 px. Ahora el padding usa dimensiones del contenedor y panel móvil, reservando espacio visible en ambos ejes. Regresión sobre ocho anchos/tres alturas, incluyendo landscape, y conservación del padding desktop cuando cabe. El render Mapbox no se certifica sin token autorizado.

Dos comprobaciones posteriores completaron el cierre:

- **Overflow de Incidencias en CI Linux.** El primer [UX CI](https://github.com/ErickRFM/ManeComb-next/actions/runs/36812267619), SHA `3d25d08`, pasó fixtures/functional y Android 33–36, pero detectó ancho 376 px a viewport 360 en ambos temas. Reproducción local con labels de métricas ampliados produjo 372 px. Tracks móviles `minmax(0,1fr)`, columna limitada al contenedor y `overflow-wrap:anywhere` evitan el mínimo intrínseco que expandía el grid. GREEN: 14 checks de texto, matriz completa 308 y fixtures 56; no se ocultó overflow ni se redujo el gate.
- **Fragmentos PTT no reproducibles.** MediaRecorder real devolvía decodificación `[true,false,false,false]`; el receptor existente reproduce cada payload por separado. El [contrato W3C](https://www.w3.org/TR/mediastream-recording/) permite fragmentos individuales no reproducibles. Se conservan socket/evento/receptor y una sola captura de micrófono, emitiendo grabaciones completas cortas, verificadas con AudioContext. Colas sin muestras se descartan; ACK rechazado detiene captura y mantiene feedback/reintento aun después de floor inactivo. Dos recorridos RED→GREEN y el recorrido blur/fragmento final ahora usan MediaRecorder real. Duración/calidad perceptual en dispositivos y entre redes siguen gates físicos.

El [CI inicial](https://github.com/ErickRFM/ManeComb-next/actions/runs/36812267646) del SHA `3d25d08` pasó Node 20/24, Docker y carga de 500 sockets: 10.000/10.000 y 10.500/10.500 ACK, cero ACK con error, p95 1.667/1.265 ms. Esto no valida por sí solo el SHA de entrega posterior: consultar checks exactos del PR. Staging/Atlas destino continúan pendientes.

El revisor no juzgó fidelidad visual, proveedores/hardware/staging, deploy, cambio local previo, autoaceptación RTC ni ejecución completa de suites. Rulings: imagen/proveedores/hardware siguen gates; Render no autorizado; cambio previo excluido; autoaceptación RTC mantiene comportamiento preexistente y cualquier cambio requiere definición de producto; las suites las ejecutó el implementador y se documentan arriba. Sin hallazgos importantes conocidos pendientes de esa revisión.

## Bloqueos y deuda pendiente real

- Falta la imagen aprobada: sólo se recibió el texto del plan. Pendientes comparación visual, presentación definitiva y capturas comerciales fieles. No declarar V2 visual completo.
- Mapbox estilo HTTP 401: corregir token/restricción de dominio en el entorno autorizado; después probar densidades/clusters/cámara/filtros/selección sobre proveedor real.
- Configuración destino: DB Mongo explícita correcta, namespace/Redis aislado, APP_URL HTTPS, EMAIL_FROM, VAPID, credenciales Mercado Pago del entorno, Cloudinary, STUN/TURN y credenciales TURN. No se imprimen valores ni se modifica `.env.local`.
- Resend/MP/Cloudinary/Push/TURN live y E2E extremo a extremo entre redes pendientes.
- Android físico/GPS/background/Doze/bloqueo/buffer/Wi-Fi/LTE/audio/cámara pendientes; smoke CI y browser no los sustituyen.
- Capacidad staging equivalente pendiente: CI histórico de 500 sockets PASS, Atlas local histórico FAIL; no atribuir causa sin evidencia ni relajar gate.

## Git, merge y Render

Todos los cambios V2 se entregan en commits de esta rama. Única modificación previa del usuario `scripts/prepare-native-android.mjs` preservada y excluida; por tanto no afirmar checkout completamente limpio. `next-env.d.ts` generado se restaura. Ramas históricas se conservan.

PR hacia main debe permanecer draft mientras falte la referencia obligatoria; consultar allí diff, SHA final y checks exactos. No integrar como V2 certificado ni repetir validación main como si hubiera merge. Main remoto permanece en la base indicada.

Render: sólo preparación previa de web `manecomb-next`, worker `manecomb-next-communication-worker` y Key Value `manecomb-next-redis`, Oregon/starter, Docker/main, health `/api/health/ready`, auto-deploy off. Ningún recurso creado, despliegue iniciado o variable productiva modificada. Primer sync de Blueprint sigue prohibido hasta gates; detalles en `RELEASE_READINESS.md` y `docs/deployment/PRODUCTION_DEPLOYMENT.md`.

**VEREDICTO TÉCNICO: NOT_READY.** Código funcional validado; referencia visual y gates externos impiden certificación final y producción.
