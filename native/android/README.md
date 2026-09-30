# Android native bridge

La UI del conductor sigue viviendo en Next.js/Capacitor. Kotlin mantiene las capacidades que el navegador no puede garantizar: GPS con pantalla bloqueada y entrega resiliente.

## Garantías absorbidas del ManeComb original

- Foreground Service.
- Token nativo limitado a telemetría y ligado a conductor/unidad/jornada RUNNING.
- Cola SQLite persistente.
- `packetId` idempotente.
- retry exponencial y flush al volver la red.
- configuración persistente ante reinicio del proceso.
- notificación de paquetes pendientes.
- permisos Android necesarios para GPS, micrófono/WebRTC y audio Bluetooth.
- HTTPS obligatorio fuera de desarrollo local.

## Preparación reproducible

Configura el servidor que abrirá Capacitor:

```powershell
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"
npm run native:prepare
npm run native:open
```

Para release:

```powershell
$env:CAPACITOR_SERVER_URL="https://manecomb.com"
$env:MANECOMB_ANDROID_VERSION_NAME="1.0.0"
$env:MANECOMB_ANDROID_VERSION_CODE="1"
npm run native:prepare
npm run native:open
```

`native:prepare` genera `android/` si hace falta, ejecuta Capacitor Sync, copia los tres módulos Kotlin, fusiona permisos/servicio, registra el plugin en `MainActivity` y aplica versión/versionCode. El directorio generado continúa ignorado por Git porque es reproducible.

El token nativo no sirve para Portal, Chat, Radio ni administración. La autoridad de negocio permanece en el servidor.
