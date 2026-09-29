# ADR-002 · Kotlin sólo para continuidad Android

**Estado:** Aceptado como extensión opcional

El negocio del conductor permanece en Next.js. Kotlin se usa únicamente cuando Android necesita una garantía que el navegador no ofrece: seguir obteniendo y enviando ubicación con la pantalla bloqueada.

El servicio nativo:

- corre como Android Foreground Service;
- no replica reglas de negocio;
- no almacena credenciales en JavaScript;
- obtiene la cookie HttpOnly del WebView;
- publica el mismo contrato de telemetría al mismo API;
- puede retirarse sin afectar el portal/PWA.
