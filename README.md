# ManeComb Next

Reingeniería full-stack de ManeComb conforme al Plan Maestro: **Next.js App Router + Node.js runtime + Socket.IO + MongoDB + Redis**, con una sola base de código para marketing, portal empresarial, admin global, operación del conductor y APIs.

## Arquitectura

- `app/(marketing)`: landing, planes, checkout recurrente, contacto y legal.
- `app/(auth)`: login, registro, activación y recuperación de contraseña.
- `app/(portal)`: flota, rutas, tracking, conductores, jornadas, incidencias, documentos, radio y facturación.
- `app/(admin)`: empresas, pagos, gobernanza, auditoría y salud.
- `app/(driver)`: operación móvil PWA.
- `app/api`: API HTTP same-origin.
- `src/core`: contratos, dominio, modelos y servicios.
- `src/realtime`: Socket.IO para GPS, chat, PTT, WebRTC y presencia.
- `src/worker`: Transactional Outbox + BullMQ + Resend + Web Push.
- `native/android`: puente Kotlin opcional para GPS con Foreground Service y pantalla bloqueada.

## Desarrollo

```bash
cp .env.example .env.local
npm install
npm run dev
```

La app completa queda en `http://localhost:3000`. Socket.IO comparte el mismo servidor HTTP persistente.

## Validación de código

```bash
npm run typecheck
npm test
npm run build
```

GitHub Actions ejecuta las tres compuertas en cada PR.

## Certificación de release

El repositorio incluye runners para los gates que requieren un entorno real:

```bash
npm run validate:prod-env
npm run test:load:gps
npm run test:e2e:operations
```

Las variables y el formato de evidencia están en `docs/quality/VALIDATION_LOG.md`. La prueba de GPS con pantalla bloqueada está documentada en `native/android/README.md`.

## Admin global

Configura `PLATFORM_ADMIN_EMAIL` y `PLATFORM_ADMIN_PASSWORD` y ejecuta:

```bash
npm run bootstrap:platform-admin
```

Los administradores de plataforma completan TOTP antes de recibir una sesión con `mfaVerified=true`.

## Operación móvil

La PWA usa Geolocation + Wake Lock cuando está al frente. El servidor sólo acepta telemetría cuando el usuario autenticado es el conductor asignado y existe una jornada `RUNNING` para esa unidad.

Para jornadas con pantalla bloqueada, el wrapper Capacitor reutiliza la misma UI Next.js y el `ManeCombLocationService` de Kotlin incluido en `native/android`. Kotlin no replica reglas de negocio: sólo mantiene el servicio nativo de ubicación y envía el mismo contrato a `/api/locations/telemetry`.

## Archivos administrados

Documentos e imágenes de chat se cargan a Cloudinary mediante firmas generadas en servidor. Los assets quedan aislados por `organizationId` y tipo, con límites de MIME/tamaño y validación del namespace antes de persistir referencias.

## Servicios externos

Variables documentadas en `.env.example`:

- MongoDB
- Redis
- Mapbox
- Resend
- Mercado Pago
- Web Push VAPID
- Cloudinary

Consulta `docs/architecture/ARCHITECTURE.md`, `docs/quality/ACCEPTANCE.md` y `docs/quality/VALIDATION_LOG.md` para decisiones, invariantes y gates de producción.
