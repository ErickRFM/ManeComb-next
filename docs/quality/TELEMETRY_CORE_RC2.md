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
- [ ] 2. Extender schema temporal opcional; tests RED→GREEN de clocks, backlog 5/20 min, duplicate/order/boot, live posterior y aislamiento de jornada. Historial guarda raw/evidencia/decisión; snapshot vivo sólo acepta posición elegible.
- [ ] 3. Tests RED→GREEN de quality, jump y estabilización: detenido/jitter, marcha/giro/aceleración, mala accuracy, recuperación e intervalo largo. Proyección usa canónica; escritura protege contra carreras.
- [ ] 4. Contrato Kotlin/bridge/backend y auditoría actualizados; pruebas de evidencia y código generado. Preparar debug rc3 con versionCode incremental y checksum.
- [ ] 5. Typecheck, unitarias, integración QA aislada, build, auditoría nativa, generated verification y Android build. Revisión independiente final y correcciones verificadas. Commit de candidato; detenerse para validación física.

Tests dirigidos entre pasos; suite completa al cerrar cada responsabilidad. Integración usa el wrapper existente para evitar DB compartida. No npm ci concurrente con tests ni dev concurrente con build. Sin nuevos precios, providers, eventos, simulador, cámaras, ingest ni infraestructura.

## Gates y evidencia

Baseline: 112 tests /39 archivos PASS; main CI PASS; cero PR abiertos y working tree limpio.
Los resultados del candidato se registrarán aquí al observarlos; logs compactos y manifiesto en artifacts, sin secretos.
SHA del candidato: pendiente de implementación; no se certifica con SHA de baseline.

## Pendiente físico

PHYSICAL_DEVICE_REQUIRED. No avanzar a Event Engine hasta PASS explícito del usuario. Checklist: visible 15 min; Home y lock 30 min; Wi-Fi/datos; offline 10–20 min y drenaje FIFO; lock/unlock; swipe recents; Battery Saver; sin saltos/jitter grave, backlog sin rejuvenecer, dedup, route progress; logout y fin detienen tracking.

Extracción inicial: typecheck y 112 tests/39 archivos PASS; entrada pública y queries/idempotencia conservadas.
