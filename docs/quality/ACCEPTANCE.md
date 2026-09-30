# Criterios de aceptación

Las casillas de dominio/realtime/comunicación/comercial/Android/seguridad indican implementación y pruebas de código; no certifican proveedores live, hardware ni capacidad del destino. Evidencia y gates de release: `RELEASE_READINESS.md`.

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
- [x] Suscripción y vehicleLimit como autoridad de operación.
- [x] RBAC aplicado en servidor.

## Realtime
- [x] Socket auth con sesión revocable.
- [x] Salas por organización y usuario.
- [x] GPS en vivo.
- [x] Chat persistente/idempotente y entrega segmentada.
- [x] PTT con floor control distribuido por Redis y aislamiento por canal.
- [x] Llamadas WebRTC con señalización validada por tenant.
- [x] STUN/TURN configurable.
- [x] Presencia con heartbeat leases.
- [x] Incidencias/SOS emitidas en vivo.

## Comunicación
- [x] Correos por Outbox + BullMQ + Resend.
- [x] Recuperación de contraseña con token de un solo uso y revocación de sesiones.
- [x] Web Push con suscripciones por usuario/organización.
- [x] Push de incidencias y asignaciones de jornada.

## Comercial
- [x] Catálogo canónico fleet-*.
- [x] Suscripción recurrente vía Mercado Pago Preapproval.
- [x] Webhook firmado, idempotente y conciliado contra Mercado Pago.
- [x] Pagos manuales con plan, importe esperado e idempotencia.
- [x] Suscripción calculada por servidor.
- [x] Límite de unidades aplicado al crear flota.

## Android / GPS
- [x] Foreground Service Kotlin.
- [x] Device token limitado a telemetría y jornada RUNNING.
- [x] Cola SQLite para pérdida de conectividad.
- [x] Retry exponencial + flush al recuperar red.
- [x] packetId e idempotencia de ingesta.
- [x] Preparación Android reproducible mediante native:prepare.
- [x] Gobierno de versión mínima / actualización forzada.

## Archivos y seguridad
- [x] Cloudinary signed uploads con scope por tenant/tipo.
- [x] Documentos con owner validation y revisión.
- [x] Descarga sensible mediada por ManeComb.
- [x] MFA TOTP real para platform_admin.
- [x] Rate limiting Redis en superficies críticas.

## UX/UI
- [x] Shell independiente Marketing / Portal / Admin / Driver.
- [x] Tema light/dark con tokens semánticos.
- [x] Dashboard operacional.
- [x] Fleet View mapa + lista + filtros sincronizados.
- [x] Driver map-first.
- [x] Chat conversacional con adjuntos.
- [x] PTT con feedback visual de estado.
- [x] Admin control center.
- [x] Gestión de flota/conductores sin patrones MVP de prompt.
- [x] QA automático de 56 fixtures responsive, axe serio/crítico, teclado y foco (lectura de pantalla manual pendiente).
- [x] Homologar módulos secundarios (Facturación, Documentos, Incidencias, Empresas) al nuevo patrón visual.
- [ ] Visual regression tests.

## Antes de producción
- [x] Gate CI de 500 sockets/3 s/60 s/ACK 10 s sobre servidor compilado en Node 20/24.
- [ ] Certificar 500+ sockets sobre staging equivalente (Atlas local continúa FAIL).
- [ ] Prueba prolongada Android con pantalla bloqueada, Doze y ahorro de batería.
- [ ] Validar Cloudinary real para documentos y fotos de chat.
- [ ] Validar MFA TOTP con secreto de producción y procedimiento de recuperación.
- [ ] Configurar credenciales reales de MongoDB, Redis, Mapbox, Mercado Pago, Resend, VAPID, Cloudinary y TURN.
- [x] E2E aislado empresa → trial sintético → unidad → ruta → conductor → activación → jornada → tracking → PTT/chat → SOS → cierre/revocación.
- [ ] E2E staging con pago/proveedores reales.
- [ ] QA visual de UX_UI_RC1.md.
