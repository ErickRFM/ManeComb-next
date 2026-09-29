# ADR-001 · Next.js como proyecto full-stack principal

**Estado:** Aceptado

Se adopta Next.js App Router como superficie única para marketing, autenticación, portal, admin, driver PWA y API HTTP. Socket.IO se monta sobre un custom Node server dentro del mismo proyecto.

### Consecuencias

- mismo origen para UI/API y cookies;
- contratos y dominio en una sola base TypeScript;
- despliegue Docker persistente;
- Socket.IO no depende del runtime serverless;
- workers se ejecutan como proceso separado pero comparten código/modelos.
