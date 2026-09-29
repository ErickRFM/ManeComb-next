# Android native location bridge

La UI del conductor sigue viviendo en Next.js/PWA. Kotlin sólo mantiene la capacidad que el navegador no puede garantizar: GPS con pantalla bloqueada.

## Garantías restauradas desde ManeComb original

- Foreground Service.
- Token nativo limitado a telemetría, ligado a conductor/unidad/jornada RUNNING.
- Cola persistente SQLite para no perder puntos sin red.
- packetId idempotente para reintentos seguros.
- retry exponencial y flush automático al volver la conectividad.
- persistencia de configuración para reinicio de proceso.
- notificación con cantidad de paquetes pendientes.
- HTTPS obligatorio fuera de localhost/emulador.

## Integración

1. Ejecuta `npm run native:add` una vez para generar `android/`.
2. Copia `ManeCombLocationPlugin.kt`, `ManeCombLocationService.kt` y `ManeCombLocationStore.kt` a `android/app/src/main/java/com/manecomb/location/`.
3. Fusiona `AndroidManifest.snippet.xml`.
4. Registra `ManeCombLocationPlugin` en `MainActivity`.
5. Configura `CAPACITOR_SERVER_URL` y ejecuta `npm run native:sync`.

El token de dispositivo dura lo suficiente para una jornada operativa y no sirve para Portal, Chat, Radio ni otras APIs. La autoridad de negocio sigue siendo el servidor.
