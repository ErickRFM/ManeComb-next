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

## Certificación física antes de producción

El smoke del emulador no cierra estos gates. Usar un tenant staging aislado, una jornada RUNNING y otro dispositivo mostrando el portal. Registrar SHA/build, modelo, Android, permisos precisos/background y estado de optimización de batería; conservar evidencia sin tokens ni cookies.

1. Confirmar tres puntos GPS y la notificación del servicio; bloquear pantalla 30 minutos. Registrar el mayor gap y comprobar continuidad al desbloquear.
2. Dejar la app en background 30 minutos y repetir con configuración normal y con exención de batería. Medir consumo y documentar restricciones del fabricante.
3. Forzar Doze en equipo de prueba (`adb shell dumpsys deviceidle force-idle`), comprobar servicio y cola; salir con `adb shell dumpsys deviceidle unforce`.
4. Alternar Wi-Fi/LTE, cortar red, cerrar/reabrir proceso y reconectar. Verificar persistencia SQLite, vaciado/retry del buffer, orden de puntos y un solo registro por `packetId`.
5. Terminar jornada/logout y desactivar conductor; comprobar que cesa el tracking y que el token nativo revocado no permite nueva telemetría.

Aceptar sólo con notificación visible, sin terminaciones inexplicadas, sin pérdida de paquetes confirmados, sin duplicados ni regresión de posición por paquetes antiguos y con gaps dentro de la tolerancia de frescura del producto. Adjuntar evidencia al registro consolidado de release; si falta una prueba, el gate sigue pendiente.
