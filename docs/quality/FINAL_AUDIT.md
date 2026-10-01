# ManeComb-next — cierre de release PR #9

Fecha: 2026-10-01. Rama: `feat/uxui-system-v2-map-first`.
HEAD real de código sometido al cierre: `ae5c096a139334aac96ce9969d1d5cf998a82f7a`.
Base/main sincronizado: `f39e04044cee70f032fe36772edb78c971aa214d`.
El commit posterior de documentación no modifica código. Su HEAD publicado y sus checks exactos se consultan en [PR #9](https://github.com/ErickRFM/ManeComb-next/pull/9); no se usan checks de otros candidatos.

## PASS LOCAL

Ejecución final completa sobre el código indicado. Todos los comandos finalizaron exit 0; los límites de staging/físico se mantienen separados.

| Gate | Estado de cierre | Evidencia |
|---|---|---|
| Typecheck | PASS | `artifacts/release-typecheck.log` |
| Unitarias | PASS: 103 / 36 archivos | `artifacts/release-unit.log` |
| Integración Atlas/Redis | PASS: 47 / 7 archivos | `artifacts/release-integration.log`; DB/namespace QA temporales, cleanup |
| Build | PASS: 81 páginas | `artifacts/release-build.log` |
| E2E compilado | PASS: registro, GPS/orden/dedup, Chat, PTT/ACK, SOS, revocación y cierre | `artifacts/release-production-e2e.log` |
| Navegador funcional | PASS: 24 recorridos | `artifacts/release-functional.log`, `artifacts/functional-ui-qa/report.json` |
| Responsive | PASS: 336 checks, cero fallos | `artifacts/release-responsive.log`, `artifacts/functional-ui-qa/responsive-report.json`; siete anchos, ambos temas |
| Fixtures/teclado/axe | PASS: 56 checks, cero violaciones | `artifacts/release-fixtures.log`, `artifacts/visual-qa/report.json` |
| Mapbox real | PASS: 16 checks, cero fallos | `artifacts/release-mapbox-final.log`, `artifacts/release-mapbox-full-report.json` |

Los datos de densidad y los endpoints de navegador son QA aislados; Mapbox/estilos/tiles/fonts, MediaRecorder y decodificación PTT son reales. QA de UI no acredita transacciones de proveedores ni dispositivos físicos.

## Correcciones dirigidas de este cierre

- Referencia recibida y conservada sin alterar sus bytes: [imagen aprobada](reference/ux-ui-v2-approved.png), SHA256 `ccf4b43ca3a5284de772db8a305d76b44771f4c9c37a8e88ea2ba21f4d1eab9d`.
- Portal más compacto; listado de flota a la derecha y detalle inferior; distribución GPS con datos actuales; login operativo, navegación inferior, presencia/estado PTT y hero ajustados a esa dirección.
- Editor de rutas muestra el listado real en una columna lateral; reutiliza búsqueda, enlaces, permisos y editor existentes. Guardado/segunda revisión, responsive y proveedor probados de forma dirigida.
- Token Mapbox anterior: HTTP 401 en light-v11/dark-v11 con y sin orígenes localhost/127.0.0.1; estructura inválida. El usuario actualizó el token y ambas peticiones respondieron 200. Scopes y restricciones administrativas no son legibles con esa credencial; los endpoints efectivamente usados se verifican en navegador. El dominio de staging permanece pendiente. [Diagnóstico oficial](https://docs.mapbox.com/help/troubleshooting/token-errors/).
- **Resize:** padding desktop sobrevivía al ancho móvil. RED real; ahora el evento resize recalcula límites y respeta cámara auto/manual.
- **Markers:** actualizar `className` eliminaba la clase del SDK; markers quedaban `position: static` y separados de GPS. RED real; ahora sólo se alternan clases de estado, preservando las del proveedor. La regresión compara posición DOM con `map.project`.
- **Zoom en Home:** el panel inferior interceptaba clicks. RED real; controles desplazados a una zona libre. Home/Rutas se prueban con proveedor real en dark/light.

Mapbox valida 0/1/20/100/500, clusters y expansión real, fitBounds de 500 puntos en 360/390/430/768/1024/1366/1920, auto/manual, padding, resize, búsqueda/filtros, selección bidireccional y ausencia de overflow. No se reemplazó el proveedor.

## Regresiones conservadas y revisión de diff

Las suites mantienen edición de conductor sin revocación, desactivación con revocación, empate de freshness HTTP/socket y precedencia GPS, audio final PTT decodificable, ACK antes de liberar floor, padding válido e Incidencias a 360 px. No se reimplementaron esos contratos.

Diff contra `origin/main` revisado en líneas añadidas: sin TODO/FIXME/HACK, logs de depuración, alert/confirm, href vacío ni mocks nuevos en producto. Los botones/enlaces nuevos usan submit o rutas existentes; clases nuevas referenciadas e importadas. Typecheck cubre errores TS. Logs/fixtures de QA permanecen fuera del producto. No se eliminó código ajeno.

## PASS CI

Exigir CI y UX/Android verdes **del HEAD publicado exacto** del PR. La certificación consultada al terminar se guarda en `artifacts/release-ci-exact-head.json`, con head/base, draft, runs y resultados. Un resultado local o un check de otro SHA no cierra este gate.

## PASS STAGING / PASS FÍSICO

**Ninguno acreditado.** El detalle por proveedor y el protocolo A–P están en [RELEASE_READINESS](RELEASE_READINESS.md). Validators staging web/worker reales: exit 1. ADB: lista vacía, **PHYSICAL_DEVICE_REQUIRED**. APK de CI prueba fixture/emulador; no acredita un APK conectado a staging real.

## BLOCKED EXTERNAL y fidelidad pendiente

Mapbox local ya está desbloqueado. Faltan staging aislado, credenciales válidas/configuración de proveedores, TURN entre redes, capacidad del destino y hardware físico. La imagen se comparó; no se certifica fidelidad total: App no ofrece la pantalla Documentos de la referencia y el contrato móvil sólo descarga documentos propios del conductor. El listado sólo admite Portal. No se ampliaron permisos sin resolver ese alcance. Actividad histórica 24 h, métricas de batería y assets comerciales de la referencia tampoco existen como datos/assets reales; no se fabricaron. Comparación por superficie en [UX_UI_V2](UX_UI_V2.md).

## Decisión Git / Render

**NOT_READY.** PR #9 permanece draft. No Ready, merge ni smoke de main fingido. Main continúa en la base indicada; verificarlo al publicar. Único cambio local previo del usuario: `scripts/prepare-native-android.mjs`, preservado y excluido. Kotlin, `.idea`, DNS y variables productivas intactos; `next-env.d.ts` generado se restaura.

Render: inspección/preparación únicamente. No crear servicios, desplegar, activar auto-deploy ni modificar producción. Recursos y gates concretos en RELEASE_READINESS.
