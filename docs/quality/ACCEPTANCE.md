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

## Superficies
- [x] Marketing.
- [x] Auth.
- [x] Portal.
- [x] Admin.
- [x] Driver PWA.
- [x] Bridge Android/Kotlin opcional para pantalla bloqueada.

## Antes de producción
- [ ] Probar 500+ sockets con GPS cada 3 s.
- [ ] Prueba prolongada Android con pantalla bloqueada y ahorro de batería.
- [ ] Conectar almacenamiento S3/Cloudinary para binarios documentales y fotos de chat.
- [ ] Activar MFA real (TOTP/WebAuthn) para platform_admin.
- [ ] Configurar credenciales reales de MongoDB, Redis, Mapbox, Mercado Pago, Resend y VAPID.
- [ ] Pruebas E2E de alta empresa → unidad → ruta → conductor → activación → jornada → tracking → PTT/chat → SOS → cierre.
