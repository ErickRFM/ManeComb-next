# ManeComb Next

Reingeniería full-stack de ManeComb conforme al Plan Maestro: **Next.js App Router + Node.js runtime + Socket.IO + MongoDB + Redis**, con una única base de código para marketing, portal empresarial, admin global, operación del conductor y APIs.

## Arquitectura

- `app/(marketing)`: landing, planes, checkout, contacto y legal.
- `app/(auth)`: login, registro, activación, recuperación y MFA.
- `app/(portal)`: flota, rutas, tracking, conductores, incidencias, documentos, radio y facturación.
- `app/(admin)`: empresas, pagos, gobernanza y salud.
- `app/(driver)`: operación móvil PWA.
- `app/api`: API HTTP del mismo origen.
- `src/core`: contratos, dominio, modelos y servicios.
- `src/realtime`: Socket.IO para GPS, chat, PTT, WebRTC y presencia.
- `src/worker`: Transactional Outbox + BullMQ + Resend.
- `native/android`: puente Kotlin opcional para GPS en foreground service con pantalla bloqueada.

## Desarrollo

```bash
cp .env.example .env.local
npm install
npm run dev
```

La app completa queda en `http://localhost:3000`. Socket.IO comparte el mismo servidor HTTP.

## Validación

```bash
npm run typecheck
npm test
npm run build
```

## Admin global

Configura `PLATFORM_ADMIN_EMAIL` y `PLATFORM_ADMIN_PASSWORD` y ejecuta:

```bash
npm run bootstrap:platform-admin
```

## Android / pantalla bloqueada

La PWA usa Geolocation + Wake Lock cuando funciona en navegador. Para jornadas largas con pantalla bloqueada, el wrapper Capacitor puede usar el `ManeCombLocationService` de Kotlin incluido en `native/android`. El servicio obtiene la cookie HttpOnly desde WebView CookieManager y envía telemetría directamente al API, sin exponer la sesión a JavaScript.

Consulta `docs/architecture/ARCHITECTURE.md` para decisiones y límites.
