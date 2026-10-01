# ManeComb UX/UI V2 — progreso

Base: `f39e040`, 2026-09-30. Rama: `feat/uxui-system-v2-map-first`.
Especificación: plan maestro del usuario; ejecución continua por dominio, sin cambiar backend/protocolos ni introducir datos ficticios en producto.

## Baseline
- [x] Main actualizado; typecheck PASS, 79 tests/27 archivos PASS, build 76 páginas PASS (Node 20.20.2).
- [x] Cambio local previo en `scripts/prepare-native-android.mjs` preservado y excluido de commits V2.
- [ ] Imagen visual aprobada: no está en el adjunto recibido; ruta/enlace solicitado. No certificar fidelidad sin verla.

## Plan de ejecución y contratos
1. [x] Modularización Foundation CSS: 17 secciones importadas en su orden original; reglas conservadas byte a byte. Tokens/look V2 sujetos a referencia.
2. [ ] Entrada y Portal: redirección map-first implementada; pendientes identidad/rol/navegación V2 y prueba de UI. Auth HTTP existente, canales canónicos y `/api/auth/session`.
3. [ ] Chat principal: `/portal/chat` creado con ChatConsole existente; separado de Radio/RTC. Pendientes estados, mobile y pruebas funcionales UI.
4. [ ] Mapa: mantener LiveMap, `/api/locations/live`, `location:snapshot`, filtros/clusters/cámara; detalle con datos reales y selección sincronizada. Layout visual requiere referencia.
5. [ ] App: DriverMapHome, jornada/GPS nativos existentes; navegación Mapa/Chat/Radio/Alertas/Más con SOS accesible; entrada instalada a auth/operación. No modificar servicio Kotlin sin fallo reproducido.
6. [ ] Gestión: auditar rutas/unidades/conductores/documentos/incidencias y sus APIs antes de modificar presentación; guardar/editar/upload/descarga/revisión verificables.
7. [ ] Auth: login/MFA/recuperación/reset/activación/logout; errores de red recuperables y labels accesibles.
8. [ ] Ventas/facturación: landing separada de operación, catálogo único, registro/checkout existentes; no inventar facturas ni estados financieros.
9. [ ] Admin: empresas/salud/pagos/versiones/auditoría existentes; conservar autorización/MFA.
10. [ ] Estados/responsive: siete anchos 360–1920, dark/light, loading/empty/error/offline/reconnect/forbidden; QA de componentes conectados además de fixtures.
11. [ ] Auditoría: diff, rutas/enlaces/acciones, permisos, CSS, módulos antiguos y fidelidad contra imagen; documentación útil en `UX_UI_V2.md` y `FINAL_AUDIT.md`.
12. [ ] Certificación: typecheck/tests/integration/build/deploy checks aplicables; PR/CI/merge/main sólo con estado consistente. Proveedores live/Android físico/capacidad staging siguen gates reales.

## Decisiones
- La solicitud autoriza el diseño/plan y commits por dominio; no pedir aprobación de nuevo para cada fase.
- La referencia ausente bloquea la reconstrucción visual, no los cambios funcionales explícitos ni el refactor CSS equivalente.
- Trabajo en la rama solicitada dentro del checkout existente, preservando el cambio local del usuario.
- No eliminar las tres ramas históricas restantes: la decisión anterior sigue pendiente y no pertenece a UX V2.

## Evidencia por fase
- Baseline: PASS; warning opcional BullMQ `@valkey/valkey-glide` ya existente, sin cambio de dependencias.
- Entrada: tres tests de canal RED (módulo ausente) → GREEN; typecheck PASS. Company → mapa, driver → operación, admin → salud; canal inválido rechazado. Login recupera busy ante fallo de red y usa labels/autocomplete.
- CSS: equivalencia SHA256 `e637eaa6021bfd4ef36228aed2517b95e09e094c52906fa3ca1db42ad88ef7b2`, build 78 páginas PASS, QA 56 fixtures/0 violaciones PASS. Playwright 1.55.1/axe 4.10.2 instalados sólo para QA, sin cambios de package/lock.
- Mapas: tres regresiones de orden GPS/freshness PASS; carga HTTP no sustituye GPS más reciente. DriverMapHome inicializa Mapbox al montar el contenedor tras recibir jornada; proveedor ausente conserva ETA/GPS/parada. Lista distingue carga, fallo, cero unidades y filtros vacíos; selección oculta se cierra. Badge deriva de Socket.IO real y reconexión recarga HTTP.
- Navegador funcional: cinco flujos PASS sobre páginas reales con APIs aisladas: entrada instalada → login sin registro, fallo/reintento de sesión → mapa por canal, filtros/selección, fallo/reintento de flota y jornada usable sin proveedor cartográfico. Esto no sustituye pruebas de proveedores live ni referencia visual.
- Entrada instalada: manifest `/app`, URL raíz Capacitor → `/app` (paths explícitos de smoke preservados), sesión validada por API y redirección por canal. Dos regresiones URL y `native:prepare` PASS; config Android generada confirma `/app`. Kotlin original sin modificaciones.
- Navegación: iconografía SVG común; permisos del menú desde roles reales de `/api/auth/session`, perfil visible, drawer oscuro con foco atrapado/Escape/restauración. App: Mapa/Chat/Radio/Alertas/Más y SOS permanente. Controles GPS/jornada permanecen montados en Home.
- Alertas/security: dos fallos reproducidos → corrección → integración completa 41/41 PASS con Atlas/Redis y base QA aislada. Driver GET limitado a organizationId+driverId; POST valida empresa y asignación de vehículo, ID inválido rechazado. Backend Portal mantiene manage_incidents.
- Auth: fallo de red MFA reproducido en navegador → corrección; recuperación/reset/activación conservan input y recuperan botón; logout sólo redirige tras éxito del endpoint. Labels y estados alert/status añadidos. Cuatro flujos Auth + logout PASS.
- Chat: tres regresiones RED → GREEN (historial tardío, deduplicación ACK/replay, offline/ID estable). Navegador con Socket.IO aislado confirma recepción durante carga y ACK fallido→reintento mismo ID→un único mensaje persistido; mobile lista→conversación→lista. Presencia no soportada deja de mostrarse como online. Pendientes en memoria, límite 20 y timeout 10s; historial visible acotado a 200.
- QA funcional actual: 12 flujos de navegador PASS; typecheck PASS. Fixtures visuales y proveedor live tienen alcance distinto.
- Incidencias realtime/push: auditoría encontró detalle emitido a toda la empresa; publisher usa sala de gestores autorizados + usuario reportante, sin cambiar eventos. Dos tests PASS. Job real del worker reprodujo envío a owner/viewer/driver → filtro por roles → 3/3 worker PASS; también limita jobs históricos dirigidos a `/portal/incidencias`.
- E2E dev real Atlas/Redis PASS: registro, unidad, ruta, driver/activación, jornada, GPS nativo/orden/replay, Chat e idempotencia, PTT/floor/audio, SOS visible al gestor y reportante, ningún evento ni lectura de SOS para otro driver, actualización y revocación de credenciales al finalizar. Base/namespace QA eliminados por el wrapper.
- Detalle de mapa: navegador PASS para ruta/revisión/parada de API, documentos de la unidad filtrados y descarga protegida, incidencia 403 diferenciada de lista vacía y panel compacto/medio/expandido. No se incorpora historial inexistente de telemetría.
- Mapa/detalle y permisos: typecheck + 18 recorridos PASS. Tabs consumen APIs existentes, documentos filtrados por unidad/conductor, permisos del Portal compartidos con módulos y Resumen distingue incidencias restringidas de cero reportes.
- Gestión: 21 recorridos funcionales PASS; crear/editar unidad y conductor mantienen inputs ante red fallida; guardado de ruta POST→PATCH mismo ID/revisión validado en navegador e integración (3/3). Documentos diferencian vencimiento y revisión, incidencias recuperan mutaciones y realtime. Los estados de carga no muestran conteos como hechos.
- GPS/logout: layout mantiene controles y suscripción web entre tabs; arranque usa jornada RUNNING actual. Navegador PASS (una suscripción, cero detenciones al entrar a Chat, detención explícita al volver). Logout falla con 503 sin ocultar revocación fallida, revoca credenciales nativas y sólo sockets del jti actual: unitarios 4/4, integración device-session 6/6 PASS. No se modifica Kotlin.
