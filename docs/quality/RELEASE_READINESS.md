# Registro consolidado de release

Fecha: 2026-09-30. Consolidación solicitada para ManeComb-next. No guardar secretos, cookies, contraseñas ni claves TOTP en este registro.

## Git y validación

| Bloque | Decisión/evidencia |
|---|---|
| #6 modelos | Squash `785b824`; ESM 21 modelos, typecheck/tests/build/CI PASS |
| #7 retry Mongo | Squash `a58152e`; retry tras promise rechazada + concurrencia, health/worker/CI PASS |
| #4 hardening | Squash `2608838`; typecheck, 35 unitarias, 10 integración Atlas QA/Redis, build y CI PASS |
| #3 readiness | Ports selectivos de uploads/adjuntos, runners y gates; conservar #4, sin merge duplicado |
| #5 UX | Delta selectivo consolidado sobre main; contraste corregido, 56 vistas locales PASS; CI exacto pendiente |
| Finanzas | Transacciones, conciliación de estado/precio, checkout persistido, firma/replay y mes calendario; 14 integraciones con proveedor simulado PASS |
| GPS/sesiones | Escritura GPS y barrido de frescura condicionales; token de dispositivo exclusivo, revocación por cierre/usuario/asignación/expiración |
| Worker | BullMQ con prefix aislado; race outbox y retry real Mongo/Redis probados; Resend simulado sin correo externo |

Validación local Node 20.20.2/npm 10.8.2: typecheck PASS; 71 unitarias/24 archivos PASS; 33 integraciones/5 archivos Atlas QA + Redis PASS; build Next 15.5.26 con 76 páginas PASS; audit producción 0 vulnerabilidades. UX local: 56 vistas (dark/light, 360/390/430/768/1024/1366/1920), axe/foco/teclado PASS. La última corrección de frescura se verificó por regresión roja/verde. Las checks de CI/UX/Android se deben confirmar contra el SHA final; no reutilizar resultados de PR #5.

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
| Carga 500 sockets/3 s | FAIL LOCAL | 500/500 conectados, 10.000 enviados, 0 ACK dentro de 10 s; investigación pendiente. Control de un socket: 4/4 ACK, p95 458 ms. Repetir sobre infraestructura equivalente, sin relajar el gate |
| E2E live | PENDIENTE | tenant/activación/jornada/tracking/chat/PTT/SOS/cierre y proveedores reales |

## Render

Workspace autorizado: Erick Rivaldo's workspace. Proyecto: Manecomb-next. No existe servicio de este repositorio; los servicios del antiguo ManeComb se conservan.

Sólo inspección/preparación autorizada. Recursos exactos de `render.yaml`: web `manecomb-next`, worker `manecomb-next-communication-worker`, Key Value `manecomb-next-redis`; región Oregon, plan starter, Docker Node 24, branch main. Web: `/api/health/ready`, predeploy web; worker: `npm run worker`, predeploy worker; Redis: noeviction y journal-snapshot, sin IP pública permitida. DB explícita `manecomb`, namespace `manecomb-next-prod`; staging separado `manecomb_staging`/namespace staging. Auto-deploy web/worker off y Blueprint Auto Sync deshabilitado. Schema oficial validado localmente; ningún recurso creado ni variable productiva modificada. El primer sync crea y despliega: no ejecutarlo hasta completar gates. Rollback preserva Mongo, Redis, eventos y outbox; ver `docs/deployment/PRODUCTION_DEPLOYMENT.md`.

Estado actual: NOT READY por carga 500 FAIL y checks exactos pendientes, además de gates externos. El smoke Android 13–16 preparado verifica APK/install/start/orientación; no reemplaza GPS/Doze/cámara/audio físicos.

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
