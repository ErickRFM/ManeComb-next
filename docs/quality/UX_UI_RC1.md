# ManeComb UX/UI RC1

## Objetivo

La interfaz debe reflejar la madurez de la lógica operacional absorbida desde el ManeComb original. El objetivo no es decorar pantallas: es reducir tiempo de decisión, mantener contexto operativo y evitar que un usuario tenga que reconstruir mentalmente estado, ubicación, ruta, jornada o prioridad.

## Referencias de investigación

Se revisaron patrones actuales de software de flotas, especialmente:

- Motive Fleet View / Fleet View 2.0: mapa como centro de operación, lista y mapa sincronizados, filtros, selección y clustering.
- Motive Fleet Live Tracking: detalle accionable de vehículo, conductor, velocidad, última actualización y ruta.
- Samsara Dashboard: navegación lateral por módulos y visibilidad condicionada por rol/licencia.
- Mapbox: patrones de mapas para dashboards y logística.

Estas referencias se contrastaron contra decisiones ya maduras del repositorio original ManeComb. Cuando ManeComb ya tenía una solución más específica para el producto (drawer operativo, mapa como home, bottom tracking panel, chat y PTT), se preservó esa intención.

## Principios RC1

1. **Mapa primero**
   - Portal Monitoreo: mapa dominante + lista + filtros + detalle.
   - Driver: mapa como home; jornada/GPS son controles secundarios.

2. **Una superficie por contexto**
   - Marketing, Portal, Admin y Driver no comparten navegación.
   - Portal/Admin usan sidebar + drawer responsive.
   - Driver usa topbar compacta + navegación inferior.

3. **Autoridad visible**
   - Frescura GPS, ETA, desviación y próxima parada vienen del servidor.
   - La interfaz no recalcula reglas operativas.

4. **Acciones cerca del contexto**
   - Seleccionar unidad abre su detalle sobre el mapa.
   - Driver tiene Ruta, Chat, Radio y SOS a un toque.

5. **Estados antes que decoración**
   - live / delayed / stale / lost.
   - off-route.
   - active / running / maintenance / archived.
   - readiness / degraded.
   - radio listening / talking / busy / error.

6. **Responsive real**
   - Sidebar desktop -> drawer móvil.
   - Fleet list desktop -> rail horizontal móvil.
   - Driver optimizado para teléfono/tableta.

7. **Tema semántico**
   - dark/light mediante tokens.
   - brand, success, warning, danger e info consistentes.
   - no duplicar colores por módulo.

## Implementado

- [x] Design tokens y tema light/dark.
- [x] Shell dedicado para Portal.
- [x] Shell dedicado para Admin Global.
- [x] Shell dedicado para Driver.
- [x] Dashboard operacional con KPIs y alertas.
- [x] Fleet View mapa + lista + búsqueda + filtros + selección.
- [x] Cámara 0/1/N y modo auto/libre.
- [x] Detalle contextual de unidad con ETA, GPS y próxima parada.
- [x] Driver map-first.
- [x] Chat con directorio, burbujas, historial y adjuntos.
- [x] Radio PTT con estados de canal y feedback visual.
- [x] Admin health convertido a control center.
- [x] Gestión de unidades sin window.prompt.
- [x] Gestión de conductores con flujo de alta/asignación/activación estructurado.
- [x] Módulos secundarios homologados; confirmación de archivo con UiModal, cancelación y error visible.
- [x] QA automático: 56 fixtures dark/light en siete breakpoints, sin overflow ni violaciones axe serias/críticas; trap de teclado/foco PASS.
- [x] Screenshots en CI y smoke APK/orientación Android 13–16; regresión visual por baseline sigue pendiente.
- [x] Estrategia 0/1/20/100/500 con GeoJSON y clustering desde 100 unidades, probada por unidad; Mapbox live pendiente.

## Pendiente antes de cerrar UX/UI RC1

- [ ] QA visual manual en 360, 390, 430, 768, 1024, 1366 y 1920 px.
- [ ] Validar contraste/teclado/focus y navegación con lector de pantalla.
- [ ] Estado de loading/skeleton/empty/error en todos los módulos.
- [ ] Visual regression tests con baseline aprobado.
- [ ] Prueba Android real de bottom navigation, teclado, Safe Area y orientación.
- [ ] Validar Mapbox live con 0, 1, 20, 100 y 500 unidades.

## Criterio de salida

UX/UI RC1 se considera cerrada cuando:
- no existe navegación genérica compartida entre contextos;
- las tareas primarias requieren máximo 1–2 decisiones de navegación;
- mapa/lista/selección permanecen sincronizados;
- estados críticos son identificables sin abrir detalle;
- móvil no tiene overflow horizontal ni controles tapados por navegación;
- todos los módulos principales comparten tokens y patrones de feedback;
- CI está verde y QA visual no reporta bloqueadores.
