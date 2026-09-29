# Criterios de aceptación

## Dominio
- [x] Estados de jornada centralizados y probados.
- [x] Checklist pre-operacional obligatorio antes de READY.
- [x] Frescura GPS centralizada.
- [x] Telemetría aceptada sólo para el conductor/unidad/jornada autorizados.
- [x] Modelos multitenant con organizationId.
- [x] Auditoría y Transactional Outbox.
- [x] Idempotencia de checkout/webhooks.
- [x] Rutas versionadas y editor interactivo Mapbox.
- [x] Flujo de rutas aprendidas con aprobación humana.

## Realtime
- [x] Socket auth.
- [x] Salas por organización y usuario.
- [x] GPS en vivo.
- [x] Chat persistente/idempotente.
- [x] Historial de chat tenant-scoped.
- [x] Adjuntos de imagen en chat con almacenamiento administrado.
- [x] PTT con floor control y audio Opus.
- [x] Llamadas WebRTC con señalización validada por tenant.
- [x] Presencia.
- [x] Incidencias/SOS emitidas en vivo.

## Comunicación
- [x] Correos por Outbox + BullMQ + Resend.
- [x] Recuperación de contraseña con token de un solo uso y revocación de sesiones.
- [x] Web Push con suscripciones por usuario/organización.
- [x] Push de incidencias y asignaciones de jornada.

## Comercial
- [x] Catálogo canónico de planes.
- [x] Suscripción recurrente vía Mercado Pago Preapproval.
- [x] Webhook firmado, idempotente y conciliado contra Mercado Pago.
- [x] Pagos manuales y aprobación desde Admin Global.
- [x] Suscripción calculada por servidor.

## Seguridad y archivos
- [x] TOTP real para platform_admin con secreto cifrado AES-256-GCM.
- [x] Challenge MFA de vida corta y sesión administrativa marcada como mfaVerified.
- [x] Prueba RFC 6238 para generación TOTP.
- [x] Cloudinary integrado para documentos y fotos de chat.
- [x] Namespace de archivos aislado por organizationId y tipo.
- [x] Tamaño y MIME permitidos validados por cliente y servidor.
- [x] Documentos almacenan metadatos, vigencia, revisión y auditoría.
- [x] Permiso manage_documents aplicado a carga/listado empresarial.

## Superficies
- [x] Marketing.
- [x] Auth.
- [x] Portal.
- [x] Admin.
- [x] Driver PWA.
- [x] Bridge Android/Kotlin opcional para pantalla bloqueada.

## Herramientas de certificación
- [x] Runner de carga configurable para 500+ sockets GPS cada 3 s: `npm run test:load:gps`.
- [x] Runner E2E operacional de empresa → unidad → ruta → conductor → activación → jornada → tracking → chat/PTT → SOS → cierre: `npm run test:e2e:operations`.
- [x] Validador estructural de secretos/configuración de producción: `npm run validate:prod-env`.
- [x] Protocolo de prueba Android con pantalla bloqueada, background y batería.

## Gates externos antes de producción
Estos puntos no se marcan completos sólo porque exista código: requieren infraestructura, credenciales o hardware real y evidencia.

- [ ] Ejecutar el runner con 500+ sockets contra staging/producción-equivalente y guardar p50/p95/p99, errores y recursos del servidor.
- [ ] Ejecutar la prueba Android prolongada en dispositivos físicos con pantalla bloqueada y ahorro de batería.
- [ ] Configurar credenciales reales de MongoDB, Redis, Mapbox, Mercado Pago, Resend, VAPID y Cloudinary y pasar `npm run validate:prod-env`.
- [ ] Completar setup/verify TOTP con un platform_admin real y conservar evidencia sin almacenar el secreto.
- [ ] Ejecutar carga real de documento PDF/imagen y foto de chat contra Cloudinary configurado.
- [ ] Ejecutar `npm run test:e2e:operations` contra staging limpio y conservar IDs/resultado.
- [ ] Confirmar que CI de la rama/release termina en verde.
