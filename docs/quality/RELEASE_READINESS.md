# Registro consolidado de release

Fecha: 2026-09-30. Consolidación solicitada para ManeComb-next. No guardar secretos, cookies, contraseñas ni claves TOTP en este registro.

## Git y validación

| Bloque | Decisión/evidencia |
|---|---|
| #6 modelos | Squash `785b824`; ESM 21 modelos, typecheck/tests/build/CI PASS |
| #7 retry Mongo | Squash `a58152e`; retry tras promise rechazada + concurrencia, health/worker/CI PASS |
| #4 hardening | Squash `2608838`; typecheck, 35 unitarias, 10 integración Atlas QA/Redis, build y CI PASS |
| #3 readiness | Port selectivo en curso; conservar #4, sin merge duplicado |
| #5 UX | Pendiente rebase, contraste, CI/visual/Android |

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
| Carga 500 sockets/3 s | PENDIENTE | ACK completos, errores, p50/p95/p99 y recursos sobre infraestructura equivalente a producción |
| E2E live | PENDIENTE | tenant/activación/jornada/tracking/chat/PTT/SOS/cierre y proveedores reales |

## Render

Workspace autorizado: Erick Rivaldo's workspace. Proyecto: Manecomb-next. No existe servicio de este repositorio; los servicios del antiguo ManeComb se conservan.

Sólo inspección/preparación autorizada. No crear servicios, desplegar, activar auto-deploy ni modificar variables productivas hasta completar gates y mostrar recursos exactos. La configuración preparada se revisará tras consolidar UX y la auditoría final.
