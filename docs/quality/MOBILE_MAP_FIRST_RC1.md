# ManeComb Mobile Map-First RC1

## Objetivo

Cerrar la brecha entre la operación móvil de ManeComb y los patrones de movilidad map-first, sin convertir el producto en una app de ride-hailing ni mover lógica de autoridad al cliente.

## Alcance de esta rama

- Panel contextual de unidad tratado como bottom sheet operacional.
- Estado compacto con información que sí sirve durante operación: estado, velocidad, ETA y frescura GPS.
- Accesos rápidos desde la unidad a Ruta, Chat e Incidencias.
- Control de altura compacto / medio / expandido conservando accesibilidad por botones.
- Handle móvil para cambiar rápidamente de altura sin ocultar controles accesibles existentes.
- Sin cambios a contratos de backend, telemetría, Socket.IO, Mapbox ni servicio nativo de ubicación.

## Estado de la base verificada

La base en main ya contiene:

- mapa de flota con búsqueda, filtros, selección y clustering;
- cámara auto/libre y fit 0/1/N;
- driver map-first;
- detalle de unidad con pestañas de ruta, incidencias, documentos y telemetría;
- servicio Android foreground de ubicación;
- cola local de telemetría;
- retry exponencial y reenvío al recuperar red;
- estados de frescura GPS y desviación de ruta.

Por lo anterior, esta iteración evita reescribir capacidades existentes y se limita a mejorar el contexto operativo móvil.

## Criterios de aceptación de esta iteración

- [x] La unidad seleccionada permanece como contexto principal sobre el mapa.
- [x] El modo compacto conserva información crítica.
- [x] Ruta, Chat e Incidencias quedan a un toque desde la unidad.
- [x] El usuario puede alternar compacto, medio y expandido.
- [x] El cambio no introduce nuevas fuentes de verdad en frontend.
- [ ] Typecheck en CI.
- [ ] Unit/integration tests en CI.
- [ ] Build en CI.
- [ ] QA manual 360 / 390 / 430 / 768 px.
- [ ] Prueba física Android con teclado, safe area y orientación.

## Próximos bloques

### P0 estabilidad móvil
1. Validación física de GPS con app activa, background y pantalla bloqueada.
2. Prueba de reconexión Wi-Fi/datos y flush de cola.
3. Certificación de cámara/adjuntos sin crash.
4. Certificación de envío/ACK/reintento de chat.
5. Ruta de 30–60 minutos comparando recorrido real contra recorrido almacenado.

### P1 experiencia map-first
1. Interpolación visual del marcador entre snapshots.
2. Sheet del conductor alineado al mismo patrón contextual.
3. Estados operacionales centralizados y etiquetado consistente.
4. Validación Mapbox 0/1/20/100/500 unidades en dispositivo real.

### P2 operación
1. Crear incidencia desde contexto de unidad.
2. Documentos por unidad/conductor con vigencia visible.
3. Radio/RTC con reconexión y estados visibles.
4. Observabilidad de gps/chat/upload/route.

## Regla de arquitectura

La app móvil debe mantener este flujo como camino principal:

Mapa -> Unidad -> Contexto -> Ruta / Chat / Incidencia / Telemetría

Administración comercial pesada, facturación avanzada y gobierno global permanecen en superficies web dedicadas.
