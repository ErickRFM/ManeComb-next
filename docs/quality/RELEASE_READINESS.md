# ManeComb-next — gates de release

Fecha: 2026-10-01. Código real del cierre: `ae5c096a139334aac96ce9969d1d5cf998a82f7a`. Rama `feat/uxui-system-v2-map-first`; [PR #9](https://github.com/ErickRFM/ManeComb-next/pull/9). Base/main `f39e04044cee70f032fe36772edb78c971aa214d`.
Este registro reemplaza los resultados antiguos del candidato; su historia permanece en Git. Documentación posterior no modifica el árbol de código validado. Consultar el HEAD exacto publicado antes de considerar sus checks.

## Separación de evidencias

| Categoría | Resultado y alcance |
|---|---|
| PASS LOCAL | Typecheck, 103 unitarias, 47 integraciones, build 81 páginas, E2E compilado, 24 recorridos, 336 responsive, 56 fixtures y 16 checks Mapbox PASS. Evidencia en FINAL_AUDIT y artifacts/release-* |
| PASS CI | Consultar checks/runs del HEAD exacto del PR; snapshot final en `artifacts/release-ci-exact-head.json` |
| PASS STAGING | Ninguno; validators web/worker fallan y no existe destino aislado autorizado/configurado |
| PASS FÍSICO | Ninguno; ADB no detecta dispositivos: **PHYSICAL_DEVICE_REQUIRED** |
| BLOCKED EXTERNAL | Aislamiento staging, proveedores válidos, dominio destino, TURN, carga destino y hardware |

## Proveedores: configuración real disponible

Inspección de `.env.local`, peticiones de lectura y validators con `DEPLOYMENT_ENVIRONMENT=staging` sólo en memoria. No se enviaron emails, cobraron pagos ni modificaron variables productivas. Evidencia segura: `artifacts/release-gates-report.json`, `release-staging-web.log`, `release-staging-worker.log`.

| Proveedor | Estado | Evidencia / paso pendiente |
|---|---|---|
| MongoDB staging | **BLOCKED_EXTERNAL** | Atlas QA conecta en integración; la URI configurada no selecciona `manecomb_staging`. Autorizar/configurar DB y usuario mínimos del destino |
| Redis/Valkey staging | **BLOCKED_EXTERNAL** | Redis QA funciona; falta namespace staging e instancia destino aislada web/worker. Verificar TLS/red privada, noeviction y persistencia |
| Mapbox local | **PASS** | Token actualizado por usuario; estilos, tiles/fonts y navegación/densidades reales. Origen/dominio staging y restricciones de cuenta todavía pendientes |
| Resend | **FAIL** | HTTP 400 en lectura de dominios: clave rechazada; EMAIL_FROM es placeholder. Corregir credencial/dominio/from autorizados; después entrega real |
| Cloudinary | **BLOCKED_EXTERNAL** | Cloud name/key/secret ausentes. Probar carga authenticated y descarga protegida, sin alterar assets productivos |
| Mercado Pago sandbox | **FAIL** | Token TEST configurado, pero `/users/me` devuelve 403 por autorización/política. No atribuir expiración ni certificar checkout/webhook. Corregir cuenta/credencial sandbox y probar idempotencia/firma/conciliación |
| Web Push | **FAIL** | Longitudes VAPID inválidas; no hay entrega física acreditada. Configurar par válido y verificar outbox/recepción con dispositivo real |
| STUN/TURN | **BLOCKED_EXTERNAL** | URLs y credenciales ausentes. Peers locales no prueban relay ni Wi-Fi/LTE/NAT; exigir llamada real entre dos redes |

También falta APP_URL HTTPS de staging. Los contratos de entorno reales web/worker terminan exit 1. No convertir formatos válidos o mocks en PASS de proveedor.

## Checklist físico A–P del APK del candidato

**PHYSICAL_DEVICE_REQUIRED — todos los casos SIN EJECUTAR.** Antes de probar: APK del HEAD publicado, checksum SHA256, `com.manecomb.app`, versión/versionCode, endpoint staging HTTPS real, tenant QA aislado, modelo/Android, permisos y política de batería. Los artefactos `manecomb-android-rc1-api-*` del workflow UX QA son wrappers debug contra fixture de emulador; no sustituyen un APK conectado al destino real. El APK local existente tiene SHA256 `47ab9407c62d2524545fdaab125beda1747e064c46e5cf32dbff2f6d8c199c76`, pero su correspondencia con el HEAD de este cierre no está acreditada y no se certifica como candidato físico.

| Caso | Prueba y evidencia requerida |
|---|---|
| A | Login real; canal operativo y sesión correctos |
| B | Iniciar jornada; unidad/ruta correctas, notificación del servicio |
| C | GPS visible: ≥3 puntos, recordedAt original y recepción en Portal |
| D | Home Android ≥5 min; continuidad, gaps y contador de pendientes |
| E | Pantalla bloqueada ≥5 min; continuidad y servicio vivo |
| F | Desbloquear; recuperar estado sin recrear jornada ni duplicar paquetes |
| G | Wi-Fi → datos móviles; recepción, gaps y retries |
| H | Datos móviles → Wi-Fi; misma jornada/credencial |
| I | Cortar red; buffer persistente y límite observado |
| J | Recuperar red; vaciado y tiempo hasta recepción |
| K | Capturados/enviados/confirmados, FIFO/recordedAt, packetId estable, cero duplicados/pérdidas; no regresión de posición |
| L | Finalizar jornada; servicio detenido y no nueva telemetría aceptada |
| M | Chat: enviar/recibir, adjunto, cámara y cancelación; dos usuarios reales |
| N | PTT: grabar, recibir/reproducir, audio final y floor/ACK; headset/speaker, rechazo de micrófono y pérdida de red |
| O | RTC: llamada/audio bidireccional entre redes con TURN; colgar/repetir y liberar micrófono |
| P | SOS real; recepción sólo por actores autorizados, aislamiento de otro driver |

Completar además Doze, Battery Saver y protocolo OEM de [native/android/README.md](../../native/android/README.md). Mantener intervalos GPS/red, retry y cola actuales. No modificar Kotlin sin fallo reproducible.

Evidencia por caso: UTC, build/SHA/checksum, equipo/API, red/permisos, duración, mayor gap, contadores de buffer/dedup, latencias PTT/RTC, resultado y captura. Logcat limitado a `ManeCombLocation`/AndroidRuntime; revisar y redactar exportaciones antes de adjuntar. No guardar tokens, cookies, contraseñas, payload completo ni URI con credenciales. Sin hardware no registrar PASS.

## Capacidad y fidelidad

Exigir carga en staging equivalente al destino y aceptación de ACK/latencia definidos. La carga CI sobre servicios desechables no acredita Atlas/Render ni 500 vehículos independientes. No relajar límites ni atribuir causas sin datos del destino.

Referencia comparada y ajustes dirigidos realizados; **gate visual completo pendiente** por Documentos móvil/alcance del contrato y datos/assets de referencia no disponibles. Ver UX_UI_V2. No hay evidencia de aprobación total del resultado implementado.

## Render preparado, sin creación/despliegue

Workspace autorizado: Erick Rivaldo's workspace; proyecto indicado: Manecomb-next. Inventario leído: sólo servicios del repositorio antiguo `ErickRFM/ManeComb`; no modificados.

Recursos exactos preparados en `render.yaml`:

| Recurso | Configuración |
|---|---|
| Web `manecomb-next` | Docker Node 24, starter/Oregon, main, health `/api/health/ready`, predeploy web, auto-deploy off |
| Worker `manecomb-next-communication-worker` | Docker Node 24, starter/Oregon, main, worker/predeploy worker, auto-deploy off |
| Key Value `manecomb-next-redis` | starter/Oregon, noeviction, journal-snapshot, red privada y sin IP pública permitida |

No recursos creados, deploys iniciados ni variables productivas modificadas. Blueprint preparado apunta a producción y **no se sincroniza para simular staging**. Staging requiere DB `manecomb_staging`, namespace separado y destino HTTPS autorizado. El primer sync crea/despliega: prohibido hasta gates y revisión concreta. Detalles en [PRODUCTION_DEPLOYMENT](../deployment/PRODUCTION_DEPLOYMENT.md).

**NOT_READY.** Mantener draft. Ready/merge sólo con referencia completa, CI/UX exactos, Mapbox real, staging requerido, hardware requerido y cero regresiones. No se ha hecho merge; no corresponde smoke de main como release integrado.
