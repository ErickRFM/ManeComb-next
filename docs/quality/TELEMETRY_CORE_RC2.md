# Telemetry Core RC2

Base: `6744e35cede876b5988a09344cca10acbb648302`. Rama: `feat/telemetry-core-rc2`.
Especificación: instrucción del usuario del 2026-10-01, fases 1–5; ejecución continua hasta PHYSICAL GATE #1.

## Arquitectura y decisiones

La entrada existente `src/core/services/telemetry.ts` permanece estable para REST y Socket.IO. El pipeline y las políticas puras se extraen a `src/core/telemetry`; Mongo mantiene idempotencia por organizationId/packetId y actualización condicional por captura. Route projection consume la coordenada canónica; raw y decisiones permanecen en historial.

Compatibilidad: clientes antiguos conservan campos y respuesta snapshot; la evidencia temporal nueva es opcional. Hora de recepción nunca sustituye captura. Evidencia monotónica sólo es admisible con credencial DeviceSession validada, fuente Android declarada y continuidad boot consistente; no es atestación hardware y no se confía en queueAge aislado. Tiempo futuro/inconsistente no habilita GPS vivo. Backlog válido se conserva sin mover lastLocation.

Calidad: GOOD ≤15 m, NORMAL ≤50 m, POOR >50 m, UNKNOWN sin accuracy. Jitter <8 m sólo con velocidad detenida y accuracy útil; se compara con ancla estable para no ocultar movimiento acumulado. Saltos físicamente imposibles se conservan raw y se ponen en cuarentena para posición viva; recuperación exige evidencia posterior consistente o intervalo largo. Sin suavizado general ni cambio de intervalos GPS.

Nativo: añadir evidencia a JSON persistido y enriquecer edad al enviar usando elapsedRealtime y boot count. Preservar FIFO, retry/backoff, Keystore, callbacks, packetId y limpieza por asignación. Tras reboot, evidencia sin continuidad no es confiable; preservar captura original. Incrementar contrato y build debug, sin signing productivo.

## Plan / registro de ejecución

- [x] 1. Extraer pipeline, persistencia/dedupe, ordering y snapshot; pruebas de caracterización y suite verde, commit por responsabilidad.
- [x] 2. Extender schema temporal opcional; tests RED→GREEN de clocks, backlog 5/20 min, duplicate/order/boot, live posterior y aislamiento de jornada. Historial guarda raw/evidencia/decisión; snapshot vivo sólo acepta posición elegible.
- [x] 3. Tests RED→GREEN de quality, jump y estabilización: detenido/jitter, marcha/giro/aceleración, mala accuracy, recuperación e intervalo largo. Proyección usa canónica; escritura protege contra carreras.
- [x] 4. Contrato Kotlin/bridge/backend y auditoría actualizados; pruebas de evidencia y código generado. Preparar debug rc3 con versionCode incremental y checksum.
- [ ] 5. Typecheck, unitarias, integración QA aislada, build, auditoría nativa, generated verification y Android build. Revisión independiente final y correcciones verificadas. Commit de candidato; detenerse para validación física.

Tests dirigidos entre pasos; suite completa al cerrar cada responsabilidad. Integración usa el wrapper existente para evitar DB compartida. No npm ci concurrente con tests ni dev concurrente con build. Sin nuevos precios, providers, eventos, simulador, cámaras, ingest ni infraestructura.

## Gates y evidencia

Baseline: 112 tests /39 archivos PASS; main CI PASS; cero PR abiertos y working tree limpio.
Los resultados del candidato se registrarán aquí al observarlos; logs compactos y manifiesto en artifacts, sin secretos.
SHA del candidato: pendiente de implementación; no se certifica con SHA de baseline.

## Pendiente físico

PHYSICAL_DEVICE_REQUIRED. No avanzar a Event Engine hasta PASS explícito del usuario. Checklist: visible 15 min; Home y lock 30 min; Wi-Fi/datos; offline 10–20 min y drenaje FIFO; lock/unlock; swipe recents; Battery Saver; sin saltos/jitter grave, backlog sin rejuvenecer, dedup, route progress; logout y fin detienen tracking.

Extracción inicial: typecheck y 112 tests/39 archivos PASS; entrada pública y queries/idempotencia conservadas.

Temporal: reloj futuro reproducido como live (RED); integración real 4 fallos RED→8 PASS. Typecheck y 123 unitarias/40 archivos PASS. Contrato opcional y ledger raw/canonical/evidencia; packet conflict, tenant y RUNNING conservados. Jornada anterior cerrada se rechaza por autorización, sin reasignar el paquete a jornada nueva.

Quality: jitter/jump reales 2 RED→10 integraciones dirigidas PASS; typecheck y 139 unitarias/41 archivos PASS. Jitter sólo detenido, ancla acumulativa, historial raw; jump queda en cuarentena y exige fix posterior consistente. CAS reevalúa la canónica/proyección tras carreras. Temporal completo: 58 integraciones/9 archivos PASS.

Nativo: contrato v3, evidencia guardada junto al JSON FIFO, queueAge recalculada desde captura monotónica original; boot desconocido/discontinuo nunca habilita fuente confiable. Backend boot unknown RED→GREEN. 140 unitarias PASS; audit 24 checks y verify-generated PASS; 7 tests Kotlin de evidencia y assembleDebug rc3/code3 PASS. APK actual apunta a emulador: pendiente endpoint físico autorizado, no PASS físico. .gitignore se ancla a /android/ para conservar nuevas fuentes Kotlin canónicas.

Revisión independiente final: tres hallazgos materiales corregidos en un pase RED→GREEN: replay aplicado no borra candidato posterior; CAS agotado exige retry en vez de ACK falso; finalización de historia refleja decisión/canónica real sin mutar raw/evidencia. Se protegieron escrituras parciales y retry tardío sin rejuvenecer. Regresión adicional: ancla futura legacy ya no bloquea GPS válido. 147 unitarias/42 archivos, typecheck y 12 integraciones dirigidas PASS. Historia separa PENDING/APPLIED/HISTORICAL_ONLY/SUPERSEDED; sólo APPLIED afirma coordenada canónica aplicada.

Destino APK autorizado por usuario: https://mane-comb-next.vercel.app/app; rc3/versionCode3. No modificar .env ni desplegar. Endpoint health HTTP503 sin SHA verificable: PENDING_WEB_SHA_PARITY. No PASS físico hasta paridad y pruebas del usuario.
