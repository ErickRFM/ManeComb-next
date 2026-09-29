# Criterios de aceptación

## Dominio
- [x] Estados de jornada centralizados y probados.
- [x] Frescura GPS centralizada.
- [x] Modelos multitenant con organizationId.
- [x] Auditoría y outbox disponibles.
- [x] Idempotencia base de webhooks.

## Realtime
- [x] Socket auth.
- [x] Salas por organización y usuario.
- [x] Telemetría GPS.
- [x] Chat persistente/idempotente.
- [x] PTT con floor control.
- [x] Señalización WebRTC validando tenant.
- [x] Presencia.

## Superficies
- [x] Marketing.
- [x] Auth.
- [x] Portal.
- [x] Admin.
- [x] Driver PWA.
- [x] Bridge Android opcional.

## Antes de producción
- [ ] Probar 500+ sockets con GPS cada 3 s.
- [ ] Prueba prolongada Android con pantalla bloqueada.
- [ ] Conectar almacenamiento S3/Cloudinary para documentos.
- [ ] Completar conciliación de pago consultando Mercado Pago tras webhook.
- [ ] Activar MFA real (TOTP/WebAuthn) para platform_admin.
- [ ] Pruebas E2E de alta empresa → unidad → ruta → activación → jornada → tracking → SOS.
