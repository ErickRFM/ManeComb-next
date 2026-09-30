# Registro consolidado de release

Fecha: 2026-09-30. Consolidación solicitada para ManeComb-next. No guardar secretos, cookies, contraseñas ni claves TOTP en este registro.

## Git y validación

| Bloque | Decisión/evidencia |
|---|---|
| #6 modelos | Squash `785b824`; ESM 21 modelos, typecheck/tests/build/CI PASS |
| #7 retry Mongo | Squash `a58152e`; retry tras promise rechazada + concurrencia, health/worker/CI PASS |
| #4 hardening | Squash `2608838`; typecheck, 35 unitarias, 10 integración Atlas QA/Redis, build y CI PASS |
| #3 readiness | Ports selectivos de uploads/adjuntos, runners y gates; conservar #4, sin merge duplicado |
| #5 UX | Delta selectivo consolidado sobre main; 56 vistas locales PASS y UX CI PASS en `baf523f`; repetir contra el SHA final |
| Finanzas | Transacciones, conciliación de estado/precio, checkout persistido por organización, firma/replay y mes calendario; 19 integraciones con proveedor simulado PASS |
| GPS/sesiones | Escritura GPS y barrido de frescura condicionales; token de dispositivo exclusivo, revocación por cierre/usuario/asignación/expiración |
| Worker | BullMQ con prefix aislado; race outbox y retry real Mongo/Redis probados; Resend simulado sin correo externo |

Validación local Node 20.20.2/npm 10.8.2: typecheck PASS; 79 unitarias/27 archivos PASS; 38 integraciones/5 archivos Atlas QA + Redis PASS; build Next 15.5.26 con 76 páginas PASS; audit producción 0 vulnerabilidades. UX local: 56 vistas (dark/light, 360/390/430/768/1024/1366/1920), axe/foco/teclado PASS. CI Node 20/24, Docker, UX y smoke Android API 33/34/35/36 PASS en `baf523f9decc7970ee328c4faf90f62289ff0020`: [CI](https://github.com/ErickRFM/ManeComb-next/actions/runs/36699571127), [UX/Android](https://github.com/ErickRFM/ManeComb-next/actions/runs/36699571054). Confirmar nuevamente todos los checks contra el último ajuste de modal/documentación antes del merge; no reutilizar resultados de PR #5.

E2E local con build de producción y Mongo/Redis aislados PASS, incluido GPS HTTP nativo entregado al socket del monitor, chat, floor de radio, SOS, cierre y revocación. Control de carga: 25/25 sockets, 125/125 ACK, cero errores/pérdidas, p50 913 ms, p95 1.230 ms y p99 1.741 ms. Este control no certifica 500 sockets ni proveedores live. La lectura de métricas usa una sesión sintética limitada al fixture; no certifica MFA real.

Carga compilada CI, 500 sockets/3 s/60 s/ACK 10 s: Node 20, 10.000/10.000 ACK, p50/p95/p99 1.509/1.758/1.908 ms; Node 24, 10.500/10.500 ACK, 761/998/1.203 ms. Cero errores/pérdidas en ambos; E2E completo PASS. Métricas al cierre: CPU 64,8%/21,6%, RSS 699/608 MB y event-loop p95 31,2/22,5 ms. Mongo replica set y Redis desechables en CI, una unidad asignada; no certifica 500 vehículos independientes ni infraestructura Render/Atlas. La carga compilada contra Atlas local en el mismo SHA volvió a fallar (0/10.000 ACK en 10 s); fixtures eliminados con verificación de propiedad. La causa del destino/tier no está confirmada y no se atribuye sólo a Atlas.

Decisiones: conservar RBAC/sesiones/entitlements, SQLite/packetId, salas/throttle/push y descargas protegidas de #4. Portar política compartida de uploads (10 MB documentos/pagos, 8 MB imágenes), adjuntos compatibles, tenant de ruta/audit, runners E2E/carga y protocolo Android. Ampliar el validator de #5 sin duplicarlo.

## Gates pendientes de producción

El usuario confirmó que Android físico y proveedores live siguen pendientes. La ejecución local y el smoke CI no los sustituyen.

| Gate | Estado | Evidencia requerida |
|---|---|---|
| Mongo destino | PENDIENTE | URI con DB explícita distinta de test/admin/local/config (sugerida manecomb), permisos mínimos y ping |
| Redis destino | PENDIENTE | instancia productiva aislada, namespace compartido web/worker, noeviction, persistencia, TLS/red privada |
| Resend live | PENDIENTE | dominio/from verificados y correo transaccional real autorizado |
| Mapbox | PENDIENTE | token público productivo y restricciones/dominio, mapa/rutas real |
| Mercado Pago | PENDIENTE | credenciales live, suscripción/webhook firmado/idempotente y conciliación real |
| Cloudinary | PENDIENTE | nuevas cargas authenticated; PDF/imagen/chat/recibo real; URL sin firma denegada; descarga autorizada; bytes/formato verificados por proveedor |
| Assets/pagos legacy | PENDIENTE DESTINO | revisar assets públicos antiguos y migrarlos a authenticated; conteo local read-only de pagos legacy fue 0; no inferir estado de destino |
| Push | PENDIENTE | VAPID/subscripción y entrega física real; recuperación por outbox |
| MFA | PENDIENTE LIVE | setup/verificación/recovery reales de administrador sin conservar secretos |
| Android físico | PENDIENTE | protocolo `native/android/README.md`: bloqueo, Doze, background, red y batería |
| GPS físico | PENDIENTE | continuidad, orden, retry/buffer, dedup packetId y revocación |
| Carga 500 sockets/3 s | CI PASS / ATLAS LOCAL FAIL / STAGING PENDIENTE | Producción CI Node 20/24 sin pérdida; Atlas local compilado 0/10.000 ACK dentro de 10 s. Control compilado 25 sockets PASS. Repetir en staging equivalente y confirmar tier/capacidad, sin relajar el gate |
| E2E live | PENDIENTE | tenant/activación/jornada/tracking/chat/PTT/SOS/cierre y proveedores reales |

## Render

Workspace autorizado: Erick Rivaldo's workspace. Proyecto: Manecomb-next. No existe servicio de este repositorio; los servicios del antiguo ManeComb se conservan.

Sólo inspección/preparación autorizada. Recursos exactos de `render.yaml`: web `manecomb-next`, worker `manecomb-next-communication-worker`, Key Value `manecomb-next-redis`; región Oregon, plan starter, Docker Node 24, branch main. Web: `/api/health/ready`, predeploy web; worker: `npm run worker`, predeploy worker; Redis: noeviction y journal-snapshot, sin IP pública permitida. DB explícita `manecomb`, namespace `manecomb-next-prod`; staging separado `manecomb_staging`/namespace staging. Auto-deploy web/worker off y Blueprint Auto Sync deshabilitado. Schema oficial validado localmente; ningún recurso creado ni variable productiva modificada. El primer sync crea y despliega: no ejecutarlo hasta completar gates. Rollback preserva Mongo, Redis, eventos y outbox; ver `docs/deployment/PRODUCTION_DEPLOYMENT.md`.

Producción: NOT READY por carga Atlas local FAIL, staging sin certificar y gates externos. El código de `baf523f` tiene CI/UX/Android verdes; eso permite consolidar Git tras validar el último SHA, pero no permite crear servicios ni desplegar. El smoke Android 13–16 verifica APK/install/start/orientación; no reemplaza GPS/Doze/cámara/audio físicos.

## Matriz de ports selectivos

Fuentes auditadas: main `2608838`, PR #3 `b052833`, PR #5 `526d71a`; integración conserva la base #4. El cierre de los PRs originales requiere que el PR de consolidación tenga checks verdes.

| Feature | Main | Integration | PR #3 | Decisión |
|---|---|---|---|---|
| Mongoose / retry | ESM y retry vigente | Conservados | Parcial | Mantener main |
| Permisos / tenants / sesiones | Hardening #4 | Scope device + revocación ampliados | Sustituciones inferiores | Mantener main y regresiones |
| Cloudinary / managed assets | Proxy y permisos | Metadata real del proveedor, scope exacto, authenticated | Validator débil / política única | Conservar permisos main, portar política y reforzar metadata |
| Documentos / recibos | Owner/tenant/review | MIME/bytes compartidos y proveedor | Único upload-policy | Port selectivo |
| Chat adjuntos / DM | Persistencia, replay y DM aislado | Metadata/proxy + UX directo | Metadata única | Port compatible; rechazar sustituciones regresivas |
| Readiness / health | Estado Mongo/Redis/config | Conservado, validator roles/env reforzado | Docs y flags parciales | Mantener servicios main |
| GPS / Android | Device token, SQLite, packetId | Orden atómico y matriz API 33–36 | Protocolo físico | Conservar nativo y portar protocolo |
| Carga 500 | Ausente | Runner estricto, métricas y gate CI | Omite ACK perdidos | Corregir runner; capacidad destino pendiente |
| E2E | Ausente | Fixture marker-owned, activo, Redis real, pares y revocación | Tenant sin entitlement | Adaptar fixture sin bypass productivo |
| Env producción | Runbook | Validator único por rol, DB/namespace separados | Script duplicado | Ampliar validator #5, descartar duplicado |
| Presence / radio / RTC | Salas, leases, aislamiento | Conservados + rejoin/release UX | Sustituciones con regresiones | Mantener main |
| Render | Preparación mínima | Tres recursos privados, Docker, auto-deploy off | Config incompleta | Blueprint #5 reforzado, ningún recurso creado |
| UX | Superficies funcionales | Shells/mapa/modal/contraste responsive | Parcial | Delta #5, sin merge de su historia divergente |
| Validation log / checklist | Docs fragmentarios | Este registro, ACCEPTANCE y OPERATIONAL_QA | Registro previo sin evidencia actual | Centralizar; no copiar PASS históricos |

Finanzas: antes de un rollout, revisar intents legacy y duplicados por organización para crear el índice `one_active_checkout_per_org`. Reconciliar/cancelar cada intento duplicado en el proveedor antes de tocar índices; no borrar historia. No existe servicio productivo de este repo todavía.

## Decisiones de operación

La carga local de 100 sockets mostró espera media del pool de 1.823 ms frente a comandos find de 162 ms, con 20 conexiones ocupadas. El candidato pool 100 tampoco pasó (113/500 ACK, 387 fuera de 10 s), por lo que se conserva el default 20. `MONGODB_MAX_POOL_SIZE` permite un valor entero explícito 1–200 para futuros benchmarks; sumar pools web/worker/réplicas al límite Atlas antes de configurarlo. No modificar `.env.local` ni tratar ese ajuste como certificación. El límite de [Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) es una posible restricción sólo si se confirma ese tier; no se ha confirmado el tier de este destino.

CI reprodujo el fallo con Mongo local: CPU saturada, ~3,1 GB RSS, 4.500 handlers pendientes y 809/10.000 ACK dentro de 10 s. Se corrigió el fanout: snapshots canónicos agrupados cada 250 ms por tenant/unidad, portal en sala monitor del tenant y conductor en su sala de usuario. Todos los paquetes siguen persistiendo y recibiendo ACK individual. GPS HTTP nativo publica ahora al portal por el mismo canal; no cambia la frecuencia ni el buffer Kotlin. Los resultados posteriores deben sustituir el FAIL antes de declarar capacidad certificada.

Error tracking: conservar logs y métricas actuales; una integración Sentry requiere cuenta/credenciales y validación de scrubbing. Preparar captura futura de release/SHA, OS, ruta y timestamp para web/server/Android, excluyendo tokens, URLs firmadas, payloads sensibles y credenciales. FCM queda pendiente de la prueba física de Web Push con app terminada; no se añade Firebase ni otro SDK a RC1 sin evidencia.
