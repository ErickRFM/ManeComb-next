# Telemetry Core RC2 — candidato RC3

Fecha: 2026-10-01. Rama: `feat/telemetry-core-rc2`.
Base main: `6744e35cede876b5988a09344cca10acbb648302`.
Código final validado: `ec044817f970c00057f84504a46550b2ac67584a`.
El commit posterior cambia únicamente este registro. SHA exacto de entrega, APK/checksum/ruta y procedencia: `artifacts/telemetry-rc2-final.json` y `artifacts/android-smoke/native-build.json`, generados después de construir desde el HEAD limpio de entrega.

## Arquitectura final

Entrada estable `src/core/services/telemetry.ts`, compartida por REST/Socket.IO. Módulos `src/core/telemetry`: contracts, temporal, ordering, deduplication, quality, stabilization, freshness y pipeline. Se reutilizan schema, gps-freshness y route-projection existentes. No Event Engine, simulador nuevo, cámara, MQTT, geofences ni cambios comerciales.

Schema → autorización driver/vehicle/tenant y RUNNING → tiempo → persistencia raw/idempotencia → orden/calidad/jump/estabilización → proyección canónica → CAS de Vehicle → finalización durable de historia → snapshot/ACK. Un conflicto CAS reevalúa el ancla/proyección; si tras tres intentos aún falta aplicar el paquete más nuevo, `TELEMETRY_CANONICAL_RETRY` impide ACK y permite retry FIFO.

## Decisiones

- Nuevos campos `temporalEvidence` opcionales: capturedAt, queueAgeMs/source, elapsed capture/send y boot capture/send. Clientes antiguos conservan entrada/respuesta. Recepción no reemplaza captura. Backlog 5/20 min válido queda en RouteSessionPosition sin mover lastLocation.
- Sólo DeviceSession validada habilita la fuente Android monotónica; exige edad coherente y mismo boot. Queue age aislado no rejuvenece ni prueba captura. Tiempo futuro/conflictivo no habilita live; ancla futura legacy se puede reparar. Esta evidencia no es atestación hardware.
- packetId y PACKET_ID_CONFLICT conservados. Replay usa payload/evidencia originales; paquetes ya finalizados se reconocen sin tocar canónica ni borrar candidato de recuperación. Retry parcial puede finalizar historial/escritura sin rejuvenecer tiempo. Jornada cerrada anterior se rechaza por autorización; nunca se reasigna su paquete a una RUNNING nueva.
- Raw/evidencia originales son inmutables. Historia separa PENDING/APPLIED/HISTORICAL_ONLY/SUPERSEDED. La decisión y coordenada final reflejan el resultado real tras CAS; sólo APPLIED afirma coordenada aplicada. Fallo de finalización produce error/retry, no ACK prematuro.
- Calidad GOOD ≤15 m, NORMAL ≤50 m, POOR >50 m, UNKNOWN sin accuracy; >100 m queda en historial. Saltos imposibles en intervalo corto se ponen en cuarentena; un fix distinto, próximo/coherente y de buena accuracy puede recuperar. Intervalo ≥120 s no permite afirmar salto imposible.
- Jitter <8 m sólo detenido (ambas velocidades <0.8 m/s), con accuracy útil; se conserva ancla pero avanza timestamp/freshness. Desplazamiento acumulado cruza umbral; marcha/giro/aceleración no se suavizan. Proyección usa canónica.
- Kotlin contrato v3 añade evidencia al JSON FIFO persistido y calcula edad monotónica al enviar. Se conservan foreground service, SQLite, packetId, cadence, retry/backoff, Keystore, callbacks y límites de cola. Boot desconocido/discontinuo no habilita fuente monotónica. Fuentes canónicas/tests se copian y verify compara bytes. `.gitignore` ignora sólo `/android/` generado.

## Tests / evidencia automatizada

| Gate | Resultado local del código final |
|---|---|
| Typecheck | PASS |
| Unitarias | PASS: 147 /42 archivos |
| Integración | PASS: 62 /9 archivos; wrapper de la misma suite con DB/namespace Atlas/Redis QA aislados y cleanup |
| Build | PASS: 82 páginas |
| E2E compilado | PASS: registro, jornada, REST/Socket GPS, orden/dedup, native DeviceSession, Chat, PTT/ACK, SOS aislado, revocación/cierre; cleanup |
| Native audit | PASS: 24 checks |
| Verify native generated | PASS: fuentes y contrato generado |
| Android debug | PASS: testDebugUnitTest + assembleDebug; 7 tests de evidencia Kotlin y 1 test baseline |

Logs: `artifacts/telemetry-rc2-final-*`, `telemetry-rc2-native-*-final.log` y build Android HTTPS. Revisión independiente única: tres hallazgos materiales (replay/candidato, ACK tras agotamiento CAS, metadatos divergentes) corregidos RED→GREEN, con regresiones de escritura parcial/retry tardío y ancla futura legacy. Sin findings materiales abiertos.

Reproducción: `npm run typecheck`, `npm test`, `npm run test:integration:local`, `npm run build`, `node --env-file=.env.local scripts/test-local-operations.mjs --production`, `npm run audit:native`, `npm run native:prepare`, `npm run verify:native-generated`, `android/gradlew.bat -p android testDebugUnitTest assembleDebug --no-daemon`. No dev/build simultáneos. Usar variables Capacitor/version de abajo al preparar; no tocar secretos/env productivo.

## APK / gates

Destino autorizado: `CAPACITOR_SERVER_URL=https://mane-comb-next.vercel.app`, entrada `/app`; `MANECOMB_ANDROID_VERSION_NAME=0.1.0-rc3`, `MANECOMB_ANDROID_VERSION_CODE=3`. Variables sólo en proceso de preparación; `.env.local` intacto. Debug, sin release signing ni despliegue.

**PENDING_WEB_SHA_PARITY**: lectura de health devolvió HTTP503 y no proporcionó SHA verificable. No atribuir causa ni desplegar para sortear el gate. Antes de PASS físico exigir endpoint sano ejecutando el mismo SHA del candidato y datos QA autorizados. Tests locales/compilación no certifican Vercel, hardware, Doze/OEM ni audio/red reales.

**PHYSICAL_DEVICE_REQUIRED**. Parte automática completada; Telemetry Core RC2 sigue pendiente de validación física. Sin push/PR/merge antes de ese PASS, según secuencia del usuario. Event Engine/simulador/fases posteriores no iniciados.

## Checklist físico #1

- [ ] App visible 15 min.
- [ ] Home/background 30 min.
- [ ] Pantalla bloqueada 30 min.
- [ ] Wi-Fi → datos y datos → Wi-Fi.
- [ ] Sin red 10–20 min; recuperación y vaciado FIFO.
- [ ] Bloquear/desbloquear; swipe recents; Battery Saver.
- [ ] Sin saltos extraños ni jitter grave detenido.
- [ ] Backlog no rejuvenece GPS; sin duplicados.
- [ ] Route progress correcto.
- [ ] Logout y finalizar jornada detienen tracking.

Registrar build/SHA/checksum, dispositivo/API, UTC/duración/red, gaps, capturados/enviados/confirmados/FIFO/dedup; logs mínimos `ManeCombLocation`, sin tokens/URIs/payload sensible. Respuesta física del usuario: PASS o fallos observados. No avanzar a Event Engine antes de ella y de paridad web.