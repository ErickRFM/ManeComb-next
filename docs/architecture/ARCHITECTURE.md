# ManeComb Next · Arquitectura canónica

## Objetivo

Consolidar ManeComb en un solo proyecto Next.js sin perder las capacidades operativas que requieren conexiones persistentes y ejecución nativa.

```
Next.js App Router
├── marketing / checkout
├── auth
├── portal empresarial
├── admin global
├── driver PWA
└── API Route Handlers
      │
      ├── MongoDB / Mongoose
      ├── Redis
      ├── Transactional Outbox / BullMQ
      └── Mercado Pago / Resend

Custom Node server
└── Socket.IO
    ├── GPS
    ├── chat
    ├── PTT floor control
    ├── WebRTC signaling
    └── presence

Optional Android wrapper
└── Kotlin Foreground Service
    └── locked-screen GPS → /api/locations/telemetry
```

## Reglas

1. La autoridad de permisos, estado y mutaciones vive en servidor.
2. Toda consulta empresarial se filtra por `organizationId`.
3. El portal consume `OperationalUnitSnapshot`; no recalcula frescura GPS.
4. Jornadas sólo cambian mediante la máquina de estados.
5. Los eventos de comunicación usan contratos tipados y salas por organización.
6. Los correos se originan en Outbox y se ejecutan en worker.
7. El wrapper Android es una extensión del driver Next.js, no una segunda aplicación de negocio.

## GPS

La PWA usa `watchPosition` + Wake Lock para primer plano. Android puede suspender el navegador con pantalla apagada; por ello el wrapper opcional inicia `ManeCombLocationService`. El servicio funciona independientemente del WebView y reutiliza la sesión HttpOnly desde CookieManager.

## Despliegue

El servicio web debe ejecutarse en runtime Node persistente (Docker/Render/VPS), no en una función serverless que impida WebSockets largos. El worker usa el mismo repositorio e imagen con un comando distinto.
