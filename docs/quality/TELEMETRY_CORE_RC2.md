# Telemetry Core RC2 / APK RC3 — Deep Validation Report

Fecha: 2026-10-02 (America/Mexico_City). Rama: `feat/telemetry-core-rc2`.
Base main: `6744e35cede876b5988a09344cca10acbb648302`.
Candidato previo conservado: `ea6cdd4be1d9a6884ce7a11ca5a502eb847f3e68`; su delta frente a `ec044817f970c00057f84504a46550b2ac67584a` sólo modificaba este documento.
Código funcional final: `16c779b6a3afb4dd3b646c3e1db7e304f3733750` (incluye la confirmación del mismo paquete ganador al final del tercer CAS).
El commit posterior de entrega modifica este registro y elimina una línea vacía final preexistente en pipeline.ts, sin cambiar runtime; el diff de ese archivo ignorando líneas vacías es vacío. HEAD exacto, APK, UTC, checksums y procedencia quedan en `artifacts/rc3-deep/final.json`, generado después de construir desde el HEAD limpio de entrega.

**RC3_AUTOMATED_READY_WITH_FIXES · PENDING_WEB_SHA_PARITY · PHYSICAL_DEVICE_REQUIRED**.
Sin push, PR RC3, merge, despliegue ni Event Engine. Gate físico bloqueado por paridad web; no certificación de producción.

## Git y reproducción

Main remoto sigue en la base anterior y es ancestro del candidato: no hay conflicto con ese main. Rama RC3 local. PR independiente #21 (`feat/admin-global-rc2`) no modificado. CI/UX QA de main pasan; no equivalen a CI remoto de RC3.
Auditoría inicial con árbol limpio/sin código fuera de commit. `npm ci` y gates completos parten del commit limpio `9c4ecf8`; tras la última regresión CAS, typecheck/unit/integración/build/E2E se repiten desde `16c779b` limpio. Next regenera `next-env.d.ts`: se restaura únicamente ese cambio generado después de build/E2E. La referencia legacy se aisló en Temp fuera del glob TypeScript, sin cambiar tsconfig. `.env.local` intacto. APK anterior/logs intactos; copias de manifiestos en `artifacts/rc3-deep/baseline-*.json`.

## Arquitectura y autoridad revisadas

Entrada estable `src/core/services/telemetry.ts` para REST/Socket.IO. Módulos `src/core/telemetry`: contracts, temporal, ordering, deduplication, quality, stabilization, freshness y pipeline. Se reutilizan gps-freshness, route-projection y modelos; no se crea otro pipeline ni cliente Socket.IO.

Schema → autorización sesión/tenant/conductor/unidad/RUNNING → tiempo → raw idempotente → orden/calidad → proyección canónica → CAS Vehicle → finalización durable de historia → snapshot/ACK. No ACK si falla persistencia/finalización o tres CAS agotan sin resolver el paquete más nuevo. Retry recalcula ancla y proyección.

| Superficie | Invariante revisado |
|---|---|
| REST nativo | hash/expiry/revocación DeviceSession; user activo/mobile/tenant; Vehicle asignado; Journey RUNNING; IDs payload ligados a credencial |
| REST web / Socket | sesión mobile, roles/tenant/subscription; driverId limita Vehicle; Socket revalida sesión por paquete |
| Tiempo | captura original; monotonic coherente/mismo boot sólo desde DeviceSession; min(wall capture, recepción menos residencia); cola jamás rejuvenece |
| Orden/retry parcial | anteriores o iguales no reemplazan canónica; mismo packetId se confirma separadamente mediante appliedPacketId persistido |
| Dedup | $setOnInsert organizationId/packetId; raw/evidencia originales inmutables; otro vehicle/journey produce PACKET_ID_CONFLICT; mismo binding/payload alterado conserva original |
| Calidad | GOOD ≤15 m, NORMAL ≤50, POOR >50, UNKNOWN ausente; >100 m no sustituye live; negativos/NaN/Infinity/>5000 rechazados por schema |
| Jump | cuarentena de salto corto implausible; otro fix distinto/coherente puede recuperar; gap ≥120 s no es salto por sí solo |
| Jitter | detenido <0.8 m/s, accuracy útil, <8 m conserva ancla; movimiento acumulado supera umbral; marcha/giro/aceleración no se suavizan |
| Ruta/freshness | proyección/ETA sobre canónica recalculada tras CAS; freshness desde captura, no recepción; inválido/futuro no es live |
| Historia | raw separado de coordenada canónica; PENDING/APPLIED/HISTORICAL_ONLY/SUPERSEDED; sólo APPLIED afirma canónica; finalización no rebaja APPLIED |
| Logout/journey finish | revocación sesión/DeviceSession/socket; cierre/cancel desasigna driver; pausa revoca credencial; siguiente paquete cerrado/revocado rechazado |

Sesión comprobada al admitir cada petición. No transacción global entre logout/pausa, Journey, Vehicle y todos los writes; petición admitida puede terminar. Stop nativo no puede retirar un POST ya recibido por servidor, pero impide continuar al siguiente POST o resucitar estado local.

## Defectos reproducidos y fixes

| Defecto | RED observado | GREEN |
|---|---|---|
| Revocación Socket sólo por watchdog | revocado/deshabilitado/cambio tenant o roles recibía ACK ok | assertStoredSessionActive por evento antes de ingest/publicación |
| Timestamp confundía identidad parcial | A aplica y falla finalización; B igual captura mueve pin | primer writer conserva timestamp; appliedPacketId sólo confirma retry de ese paquete, también si gana la última carrera de tres CAS |
| Captura omite backoff (preexistente) | servicio real hace HTTP aunque retry pendiente | captura/callback respetan retryScheduled; scheduler conserva 5–60 s |
| JSON corrupto bloquea FIFO (preexistente) | fila `{` impide POST de siguiente válida | CORRUPT distinto de RETRY, diagnóstico sin payload, elimina sólo ilegible y avanza; HTTP 400 no se descarta indiscriminadamente |
| Stop continúa vaciado (preexistente) | POST bloqueado/onDestroy/respuesta origina segundo POST | cancelación/lock, cancela retry/conexión, borra token en memoria y cierra SQLite en worker después del upload |

Revisión independiente única y una pasada RED→GREEN. Tres tests JVM ejercitan servicio Kotlin real +HTTP loopback; framework Android/SQLite se mockean. Mockito/org.json son testImplementation, no runtime del APK.
Nuevos: 12 unitarios, 3 integración, 3 JVM. Cobertura existente/nueva: replay igual/alterado/conflicto binding, backlog 5/20 min, futuro, boot viejo/desconocido, queueAge sin prueba, CAS race/agotamiento, anterior canónica, fallo parcial/retry, cierre entre paquetes, revocación, tenant, accuracy inválida, salto/gap largo, jitter/acumulación y dos credenciales de un driver. No se promete lease hardware exclusivo: dos credenciales activas convergen en una canónica idempotente/ordenada.

## Gates

| Gate | Resultado observado |
|---|---|
| npm ci | PASS; lockfile intacto |
| npm audit --omit=dev --audit-level=high | PASS: 0 vulnerabilidades productivas; instalación completa informa 2 moderadas incluyendo dev |
| npm run typecheck | PASS, también tras test de dos credenciales |
| npm test | PASS: 159 /43 archivos |
| npm run test:integration:local | PASS: 65 /9 archivos, Atlas/Redis QA aislados y cleanup |
| npm run build | PASS: 82 páginas; warning opcional BullMQ/valkey-glide sin fallo |
| E2E compilado | PASS: registro/jornada, REST/Socket GPS, replay/orden, native DeviceSession, Chat, PTT/ACK, SOS tenant, revocación/cierre; cleanup |
| npm run audit:native | PASS: 28 checks contractuales; no certifican OS/hardware |
| npm run native:prepare | PASS, HTTPS/versiones autorizadas |
| npm run verify:native-generated | PASS: 7 fuentes y 2 tests byte a byte +wrapper/manifest |
| Gradle testDebugUnitTest assembleDebug | PASS: 11 JVM (7 temporal +3 servicio +1 baseline) y APK debug |
| assembleDebug --rerun-tasks | PASS: segunda construcción forzada y análisis de APK |
| APK real | aapt confirma package/version/SDK; apksigner verifica debug v1/v2; URL leída del ZIP |

Logs: `artifacts/rc3-deep/`; RED/GREEN: `artifacts/rc3-deep-negative-*` y `rc3-deep-native-*`. `gates.json` guarda SHA/UTC de la primera corrida limpia; `final-gates.json` registra la repetición del backend final tras cubrir el último CAS y dos credenciales. La entrega de documentación no cambia código; no se mezclan resultados de SHAs funcionalmente distintos.

## APK / reproducibilidad

0.1.0-rc3, versionCode 3, com.manecomb.app, tracking contract 3, minSdk 23, target/compile 35. Server embebido `https://mane-comb-next.vercel.app/app`, cleartext false. Variables sólo en proceso; .env.local intacto.
APK anterior intacto: `artifacts/releases/ManeComb-0.1.0-rc3-ea6cdd4.apk`, 4,134,708 bytes; SHA256 `2ec0926fe76f1e1a514e57c5a53f43853382375779f75818782e7b706fb37008`. El nuevo incluye fixes Kotlin, por lo que difiere del candidato anterior.
En el mismo código/config nuevos: incremental 4,159,793 bytes, SHA256 `c32cbe7e7fa244a0829616f6e50ee71defa49242bab27bc3d17664c37860ca8c`; forzado 4,115,094 bytes, SHA256 `79dbb803657e3d0373ffdbb057ffb1ab10f141e0bf12ba636d24a0484a9b950c`.
444 entradas ZIP comparadas por SHA256 descomprimido: idénticas (DEX/manifest/config/recursos/firmas JAR incluidos). Cambia orden; incremental contiene 44,700 bytes entre entradas referenciadas frente a cero forzado; un extra field varía un byte: diferencia de tamaño 44,699 bytes. El contenedor y firma APK v2 cambian al reempaquetar. **Contenido reproducido; no identidad binaria entre incremental y forzado.** Evidencia `artifacts/rc3-deep/apk-reproducibility.json`. Build/URL/hash/ruta/bytes de entrega final en `final.json`.

## Android audit y límites

Manifest fusionado y APK real: INTERNET, NETWORK_STATE, COARSE/FINE_LOCATION, FOREGROUND_SERVICE/_LOCATION, POST_NOTIFICATIONS, WAKE_LOCK y permisos existentes audio/cámara/Bluetooth. Service location enabled/no exportado. Sin ACCESS_BACKGROUND_LOCATION; FGS inicia desde UI visible con permiso fine. WAKE_LOCK declarado no acredita wakelock nativo adquirido; web screen wakelock no protege Doze nativo.
Canal IMPORTANCE_LOW/notificación foreground; GPS/NETWORK providers/cadencia monotónica. START_STICKY restaura configuración/credencial cuando Android recrea el proceso. SQLite persiste JSON/packetId unique/FIFO id ASC, 20,000 filas/24 h; prune al encolar. Cambio vehicle/journey limpia cola del owner anterior. Keystore cifra token, falla cerrado y migra plaintext legacy. Upload conserva capture/boot/elapsed originales; retry no reinicia edad; boot desconocido/discontinuo no inventa monotonic authority.
Sin BootReceiver: reboot completo requiere abrir app e iniciar/reanudar tracking autorizado; START_STICKY no es autoinicio tras boot ni force-stop. JVM no prueba SQLite real, permisos, notification, Doze/OEM, GPS ni transiciones físicas.

## Matriz legacy GPS/native

Referencia readonly `ErickRFM/ManeComb`, SHA `e7867b371dc9373a692172bf8807e6900b3fe259`; sólo semántica, sin copiar arquitectura/React Native.

| Pieza vieja / ruta | Estado | Diferencia/decisión |
|---|---|---|
| mobile/android/.../location/ManeCombBootReceiver.kt | MISSING | viejo restaura BOOT_COMPLETED/MY_PACKAGE_REPLACED; Next no. No migrado; decidir requisito y restricciones Android después |
| mobile/src/native/background-location.ts | REPLACED | propietario React FG/Android BG reemplazado por servicio único nativo también visible; watcher web sólo fuera de Capacitor |
| backend/src/domain/gps-telemetry-state.js | REPLACED | recepción normal/captura de cola reemplazadas por wall/monotonic conservador y freshness único 15/45/120 s; umbrales requieren campo |
| backend/src/services/gps-position-stabilizer.js | MIGRATED | semántica ancla/8 m reimplementada con gates velocidad/accuracy; sin copiar suavizado indiscriminado |
| backend/src/services/route-event-engine[-core].js | DEFERRED | sólo después de PASS físico y merge RC3; no implementado aquí |
| backend/src/services/vehicle-location-ingestion.js / route history | REPLACED | RouteSessionPosition raw/tiempo/canónica y route-learning; RUNNING explícito, cola cerrada no se reasigna |
| mobile/src/utils/operational-schedule.ts | MISSING | calendario de captura día/hora ausente; ventanas RouteAssignment no equivalen; proponer si requisito vigente |
| GPS sin jornada (RC-PHYSICAL-GPS-C3-01.md) | OBSOLETE | contradice autoridad RUNNING aprobada para Next; no restaurar permiso implícito |
| mobile/src/api/offline-cache.ts (GPS) | REPLACED | AsyncStorage 2,000/24 h →SQLite 20,000/24 h/DeviceSession; cache general y offline start no migrados en RC3 |
| docs/quality/gps/GPS_FIELD_STABILITY_2026-09-28.md y docs/audits/archive/RC-PHYSICAL-GPS-C3-01.md | REPLACED | conocimiento de gaps/jitter/red útil; evidencia antigua no certifica este APK/web; usar gate siguiente |

MISSING no es autorización automática para migrar. Costo: apertura manual tras reboot y ausencia de calendario independiente; operación RUNNING documentada.

## PHYSICAL GATE #1 ejecutable

Precondiciones: Preview de deliverySha probado en metadata Git/Vercel; health/ready 200/ok; APK contra ese Preview; datos QA autorizados. No usar el endpoint actual sin cumplirlo.
Pantallas: teléfono `/operacion`, `Más` →jornada/Seguimiento GPS; operador `/portal/monitoreo`, unidad seleccionada. Completar READY/checklist real e iniciar RUNNING; ubicación precisa/notificaciones concedidas. Registrar modelo/OEM/API, permisos/optimización de batería; no modificar optimización para ocultar un fallo. UTC y SHA/checksum/versiones por caso.

```powershell
adb devices
adb shell dumpsys package com.manecomb.app > artifacts/rc3-deep/physical-package.txt
adb logcat -v threadtime ManeCombLocation:V ManeCombLocationCreds:W AndroidRuntime:E '*:S' > artifacts/rc3-deep/physical-gps.log
```

Guardar diagnóstico (state/pending/capture/upload/retry), capturas operador y cronología UTC. Revisar historia QA por organizationId/vehicleId/journeyId y packetId, no sólo animación del mapa. No exportar tokens/DB/ubicaciones ajenas.

| Caso | Pasos/duración | Observar/log | PASS / FAIL |
|---|---|---|---|
| Visible | app/recorrido normal 15 min | mapa móvil/portal, diagnóstico inicio/fin, log | captura/upload avanzan; sin crash/corte sostenido inexplicado; pin/freshness/progress coherentes |
| Background | Home sin cerrar, 30 min | portal/notificación y diagnóstico al volver | FGS/captura/upload continúan; fail si sólo recupera al abrir |
| Lock | bloquear 30 min | portal/notificación/log/gaps | continuidad operativa; fail corte persistente hasta unlock; registrar Doze/OEM |
| Wi-Fi →LTE | pendientes cero, apagar Wi-Fi, datos activos 5 min | network/retry/timestamps | recuperación ≤60 s tras red+servidor disponibles; sin pérdida/duplicado/reinicio manual |
| LTE →Wi-Fi | conectar Wi-Fi, observar 5 min | mismo registro | mismo criterio, sin reiniciar tracking |
| Offline/FIFO | cortar ambas redes 20 min, GPS/jornada activos; restaurar hasta pending cero | cola antes/pico/cero, raw QA | crece/persiste y drena id ASC/mismos packetIds, captura original; fail pérdida/reorden/duplicados |
| Backlog | observar freshness offline y cada captura al drenar | portal/historia QA | >15 s sólo historia, no live/mover pin; live sólo con fix actual distinto |
| Swipe recents | retirar tarjeta RUNNING, 10 min y reabrir | portal/FGS/diagnóstico | continuidad o recreación con misma cola/credencial; no confundir force-stop |
| Battery Saver | ahorro normal 15 min, Home y bloqueo | settings/portal/log/gaps | recuperación sin abrir app; registrar throttling; fail pérdida sostenida operativa |
| Lock/unlock | 10 ciclos/30 s | log/pending | sin servicios/paquetes duplicados ni reset de edad |
| Jitter | parado 5 min, accuracy ≤50 m | raw/canónica/speed | speed<0.8 y variación<8 m conserva ancla/captura real; fail deriva dentro de esos gates o presencia perdida sin captura |
| Acumulación | arrancar lento, cruzar >8 m y seguir 5 min | raw/canónica/progress | ancla avanza al cruzar umbral; no congelar ni ocultar giro/aceleración |
| Jump | observar trayecto y revisar cualquier salto | historia QA/log | imposible corto no sustituye pin, recuperación otro fix coherente; sin incidencia marcar NO OBSERVADO, no inventar campo con mock GPS |
| Route progress | recorrer ruta QA/cruzar 2 paradas reales | navegación/portal/historia | progreso/parada/ETA desde canónica; no retrocede por replay/cola; no exigir Event Engine aún inexistente |
| Logout | RUNNING+red, cerrar, observar 2 min; relogin sin activar GPS | local/portal/credencial | no nuevas capturas/POST tras stop; siguiente revocada denegada; relogin no reinicia; POST previamente recibido no es captura posterior |
| Journey finish | nueva jornada QA, terminar UI con red, 2 min | FINISHED/diagnóstico/portal | detenido/DeviceSession revocada, sin nuevos paquetes ni reasignar cola a nueva jornada |

Por fila: UTC inicio/fin, red/visible/lock, gaps máximos captura/ACK, pending pico, dedup/fallos, esperado/observado y PASS/FAIL/NO OBSERVADO. Caso obligatorio sin evidencia no es PASS. Si falla, corregir sólo defecto observado y repetir caso/regresiones.

## Web parity readiness / Preview

Actual autorizado `https://mane-comb-next.vercel.app` →entrada APK `/app`. Lecturas 2026-10-02: `/api/health/live` 200/ok; `/api/health/ready` 503/degraded, DB/Redis false e integraciones faltantes; no SHA. No atribuir 503 a RC3 ni a rate limit: deploy no acredita candidato. Conector sin workspaces visibles/dashboard login: cuota y deploy sin verificar; no pushes para sortearla.
QA requerido: tenant aislado autorizado, owner/operador, driver mobile activo/acceso válido, unidad asignada, ruta activa con geometría/paradas del recorrido, RUNNING; Mongo QA/Redis namespace QA, Mapbox público válido e integraciones staging exigidas por readiness. DeviceSession sale de la app, no token inventado. `/live` sólo prueba proceso; `/ready` y `/health` deben 200/ok. NODE_ENV production (también Preview) exige DB/Redis y todas las integraciones health; no relajar contrato para un verde.

Cuando haya acceso/cuota:

1. `git status --short` vacío; `git rev-parse HEAD` =deliverySha de final.json; `git push -u origin feat/telemetry-core-rc2`. Sin merge/promoción.
2. Obtener Preview HTTPS inmutable. Metadata deploy Ready debe tener SHA completo deliverySha (`meta.githubCommitSha` o gitSource SHA), repo/branch correctos; guardar ID/URL/SHA. Health no acredita SHA porque no lo expone.
3. Preview debe permitir login ManeComb y REST Bearer DeviceSession nativo con política aprobada. Login Vercel/share temporal no acredita acceso nativo; no quitar protecciones automáticamente. Verificar `/live`, `/ready`, `/app`, login/jornada/monitoreo y Socket.IO donde se evalúe realtime. Build Ready no prueba infraestructura operativa.
4. Sustituir placeholder por URL real verificada:

```powershell
$env:CAPACITOR_SERVER_URL='https://<preview-inmutable-verificado>.vercel.app'
$env:MANECOMB_ANDROID_VERSION_NAME='0.1.0-rc3'
$env:MANECOMB_ANDROID_VERSION_CODE='3'
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
npm run audit:native
npm run native:prepare
npm run verify:native-generated
.\android\gradlew.bat -p android testDebugUnitTest assembleDebug --no-daemon
npm run report:native-build
```

5. Leer assets/capacitor.config.json del APK, exigir Preview +/app, HTTPS/versiones; registrar HEAD/checksum/bytes/manifest/firma/health/deploy SHA. Instalar ese APK, no el del alias actual.
6. Usuario ejecuta gate. Sólo tras PASS físico: PR, CI/UX QA/Android smoke y merge autorizado. Event Engine después del merge.

## Decisiones/riesgos abiertos

- APPLIED prueba finalización o confirmación mismo packetId aún canónico. Si A aplica parcialmente/falla finalización y B lo supera antes de retry, A puede quedar SUPERSEDED: dominio actual, no prueba que nunca estuvo transitoriamente en Vehicle. Raw permanece; costo: no reconstruye cada transición temporal durante fallos DB. No introducir transacción global/Event Engine aquí.
- Revocación protege siguiente admisión; pausa/logout en petición admitida no garantizan rollback. FINISHED/CANCELLED completado desasigna driver y protege CAS de esa asignación. Costo: borde de convergencia en vuelo por observar en campo.
- Dos credenciales convergen; exclusividad estricta/issuance concurrente no certificadas. No inventar ownership hardware.
- JSON local ilegible se descarta con warning sin payload, sin cuarentena persistente; filas válidas no se descartan por HTTP genérico. Costo: esa fila irrecuperable no llega a historia remota.
- BootReceiver/calendario son MISSING legacy, no migrados silenciosamente; mantener manual/RUNNING hasta definir requisito.
- Contenido ZIP reproducido, no binary identity incremental/forzado; debug QA, no release signing.
- Permisos/SQLite real/process death/Doze/OEM/lock/red/GPS/batería requieren hardware; evidencia vieja/mocks no certifican campo.
- Preview SHA sano/acceso nativo/config/datos QA siguen pendientes. Mantener PENDING_WEB_SHA_PARITY y PHYSICAL_DEVICE_REQUIRED; no production-ready/physical PASS.
