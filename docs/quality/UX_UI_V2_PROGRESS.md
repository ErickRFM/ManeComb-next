# ManeComb UX/UI V2 — progreso

Base: `f39e040`, 2026-09-30. Rama: `feat/uxui-system-v2-map-first`.
Especificación: plan maestro del usuario; ejecución continua por dominio, sin cambiar backend/protocolos ni introducir datos ficticios en producto.

## Baseline
- [x] Main actualizado; typecheck PASS, 79 tests/27 archivos PASS, build 76 páginas PASS (Node 20.20.2).
- [x] Cambio local previo en `scripts/prepare-native-android.mjs` preservado y excluido de commits V2.
- [ ] Imagen visual aprobada: no está en el adjunto recibido; ruta/enlace solicitado. No certificar fidelidad sin verla.

## Plan de ejecución y contratos
1. [x] Modularización Foundation CSS: 17 secciones importadas en su orden original; reglas conservadas byte a byte. Tokens/look V2 sujetos a referencia.
2. [x] Entrada y Portal: map-first, identidad, roles y drawer probados con APIs reales en producto y respuestas aisladas en QA.
3. [x] Chat principal: módulo separado de Radio/RTC; historial/realtime/ACK/retry, presencia, borradores y mobile probados.
4. [ ] Mapa: detalle conectado y orden HTTP/realtime implementados; pendiente proveedor live para certificar clusters/cámara/densidades y referencia para layout definitivo.
5. [x] App funcional: Mapa/Chat/Radio/Alertas/Más, SOS, entrada instalada operativa y GPS persistente entre tabs; Android físico es gate separado. Kotlin intacto.
6. [x] Gestión: rutas/unidades/conductores/documentos/incidencias auditados; guardar/editar y descargas protegidas probados; cargas live pendientes del proveedor.
7. [x] Auth: login/MFA/recuperación/reset/activación/logout; fallos de red recuperables, deep links operativos y revocación probados.
8. [x] Ventas/facturación funcional: secciones, catálogo único y plan seleccionado hasta checkout. Referencia/capturas comerciales y proveedor de pagos live pendientes.
9. [x] Admin: empresas/salud/pagos/versiones/auditoría; estados recuperables, autorización/MFA conservadas.
10. [x] Estados/responsive: 22 páginas × siete anchos × dark/light; axe serious/critical, overflow y recorridos de foco/teclado probados. No certifica comparación visual.
11. [ ] Auditoría de código terminada con tres correcciones importantes RED→GREEN; falta fidelidad contra imagen.
12. [ ] Certificación final: gates externos y visual abiertos; PR revisable/CI no autorizan merge como V2 certificado ni deploy.

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
- Chat: tres regresiones RED → GREEN (historial tardío, deduplicación ACK/replay, offline/ID estable). Navegador con Socket.IO aislado confirma recepción durante carga y ACK fallido→reintento mismo ID→un único mensaje persistido; mobile lista→conversación→lista. Presencia proviene de snapshot/update y permanece desconocida hasta recibir baseline. Pendientes en memoria, límite 20 y timeout 10s; historial visible acotado a 200.
- QA funcional actual: 12 flujos de navegador PASS; typecheck PASS. Fixtures visuales y proveedor live tienen alcance distinto.
- Incidencias realtime/push: auditoría encontró detalle emitido a toda la empresa; publisher usa sala de gestores autorizados + usuario reportante, sin cambiar eventos. Dos tests PASS. Job real del worker reprodujo envío a owner/viewer/driver → filtro por roles → 3/3 worker PASS; también limita jobs históricos dirigidos a `/portal/incidencias`.
- E2E dev real Atlas/Redis PASS: registro, unidad, ruta, driver/activación, jornada, GPS nativo/orden/replay, Chat e idempotencia, PTT/floor/audio, SOS visible al gestor y reportante, ningún evento ni lectura de SOS para otro driver, actualización y revocación de credenciales al finalizar. Base/namespace QA eliminados por el wrapper.
- Detalle de mapa: navegador PASS para ruta/revisión/parada de API, documentos de la unidad filtrados y descarga protegida, incidencia 403 diferenciada de lista vacía y panel compacto/medio/expandido. No se incorpora historial inexistente de telemetría.
- Mapa/detalle y permisos: typecheck + 18 recorridos PASS. Tabs consumen APIs existentes, documentos filtrados por unidad/conductor, permisos del Portal compartidos con módulos y Resumen distingue incidencias restringidas de cero reportes.
- Gestión: 21 recorridos funcionales PASS; crear/editar unidad y conductor mantienen inputs ante red fallida; guardado de ruta POST→PATCH mismo ID/revisión validado en navegador e integración (3/3). Documentos diferencian vencimiento y revisión, incidencias recuperan mutaciones y realtime. Se distinguen cargas, errores y listas vacías; no se certifica cada contador como estado de carga independiente.
- GPS/logout: layout mantiene controles y suscripción web entre tabs; arranque usa jornada RUNNING actual. Navegador PASS (una suscripción, cero detenciones al entrar a Chat, detención explícita al volver). Logout falla con 503 sin ocultar revocación fallida, revoca credenciales nativas y sólo sockets del jti actual: unitarios 4/4, integración device-session 6/6 PASS. No se modifica Kotlin.
- Comunicación: 22 recorridos PASS, incluyendo dos peers Chromium reales con audio generado, conexión/colgar/reconexión, cancelación de getUserMedia tardío y liberación PTT ante blur. Señalización conserva offer/answer/ice/hangup. Presencia de Chat proviene de presence:snapshot/update reales; pendiente probar TURN entre redes y audio físico.
- Ventas/Auth: landing tiene las secciones funcionales solicitadas y enlaza producto real, sin mockups inventados ni estados técnicos de descarga. PlanCards consume catálogo único; selección de plan persiste registro/login→checkout y reintento usa la misma clave. Login/recuperación/MFA/activación de Operación omiten navegación comercial. La referencia y capturas comerciales definitivas siguen pendientes.
- Navegación de ruta: HTTP y reconexión mantienen snapshot GPS más reciente; petición anterior no reemplaza estado de una consulta posterior. Ruta y mapa muestran datos/reintento ante fallos, sin tocar contratos.
- Admin/facturación: foco/Escape/drawer compartido y logout confirmado; empresas, pagos, auditoría, salud y versiones distinguen loading/error/empty y ofrecen reintento. Error de revisión de pago permanece dentro del modal (RED→GREEN navegador). Directiva Android carga antes de montar defaults; suscripción conserva error dentro de confirmación; finanzas del servidor intactas.
- Accesibilidad/responsive: 308 checks PASS (22 páginas reales × 7 anchos × dark/light). Axe serious/critical cero y cero overflow horizontal; se corrigieron texto rojo/secundario y min-width de Documentos. Iconos SVG y copys operativos reemplazan glifos/explicaciones internas. Falta comparar con referencia; no se certifica pixel-fidelity.
- Auth deep links: tres regresiones RED→GREEN verifican que sesión ausente/inválida o canal incorrecto en /operacion conserva login operativo sin marketing; Portal mantiene login comercial.

## Auditoría independiente y cierre de código

Revisión única del diff completo: cero críticos confirmados, tres importantes, sin menores adicionales bloqueantes. Se aceptaron los tres hallazgos y se corrigieron en un solo pase con regresiones reproducidas antes del cambio:

- PATCH de nombre/email revocaba sesiones por `!input.active`; ahora sólo `active === false` revoca. Integración verifica Session/DeviceSession intactas al editar y revocadas al desactivar.
- GPS con `recordedAt` igual podía reemplazar freshness reciente. HTTP captura referencias al iniciar; cambios socket durante la petición prevalecen en empate y HTTP nuevo sí sustituye caché anterior. Portal y ambos componentes del conductor comparten la regla; peticiones anteriores no ganan a nuevas.
- PTT descartaba el evento final de `MediaRecorder.stop()`. Finalización normal conserva el intento, espera entrega ACK del fragmento y libera floor después; desconexión/floor-lost/unmount cancelan. ACK opcional del evento existente confirma validación de floor y broadcast; clientes anteriores siguen compatibles.

Typecheck PASS, 102 unitarias/36 archivos PASS y 47 integraciones/7 archivos PASS tras los tres hallazgos del revisor. Browser PTT produce un fragmento final y comprueba su orden antes de release; el E2E exige ACK del servidor real.

La comprobación propia encontró otro defecto: fitBounds reservaba 480 px horizontales en canvas móviles de 360 px. Se sustituyó por padding basado en dimensiones del contenedor/panel móvil, limitado para dejar espacio visible horizontal y vertical. Regresión adicional sobre ocho anchos y tres alturas; render proveedor sigue bloqueado por 401. No hubo segunda revisión independiente ni ciclo de subagentes.

Cierre local en código `ca315ec`: typecheck, 103 unitarias/36 archivos, 47 integraciones/7 archivos, build 81 páginas y E2E compilado Atlas/Redis PASS. Browser 24 recorridos, responsive 308 checks, fixtures 56 checks/cero violaciones y 14 checks de texto ampliado PASS. Deploy checks web/worker FAIL por configuración real, sin env inventado. Ver FINAL_AUDIT para fechas/alcance; entrega mediante PR draft, donde se consulta SHA documental y CI exactos. Sin merge ni deploy mientras falten gates.

Primer CI `3d25d08`: Node 20/24, Docker y Android 33–36 PASS; UX Linux detectó dos overflows de Incidencias a 360 px. Reproducidos con texto ampliado y corregidos en tracks/word-wrap. QA adicional real de Radio detectó sólo primer fragmento WebM reproducible; ahora transmite clips completos decodificados, conserva micrófono/floor y corta captura ante ACK rechazado sin perder feedback. Dos nuevas regresiones browser RED→GREEN y blur real; se repitieron typecheck/unit/integration/functional/responsive/fixtures/build/E2E. No hubo segunda revisión independiente ni reducción de checks.

Rulings sobre lo no juzgado: fidelidad visual espera imagen; Mapbox/TURN/Android/audio/capacidad esperan proveedor/hardware/staging; Render sigue prohibido. Autoaceptación RTC preexistente conserva comportamiento; no se introduce una decisión de producto diferente. Cambio local del usuario en prepare-native-android excluido. Suites completas se ejecutan por el implementador y se registran en FINAL_AUDIT; no se atribuyen al revisor.
